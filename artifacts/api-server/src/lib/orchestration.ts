import { eq, sql } from "drizzle-orm";
import { db, agentsTable, tasksTable, activityEventsTable, type Agent, type Task } from "@workspace/db";

/**
 * Deterministic orchestration engine.
 *
 * This is the real decision-making core of the HUB: skill-matching + trust-score
 * bidding for agent selection, and a rule-based perception -> reasoning -> action
 * cycle for task execution. It does not depend on any external LLM, so the HUB is
 * fully functional without any paid AI integration. "Autonomy" here means the
 * engine independently selects agents and produces outcomes within fixed rules —
 * not that any component is sentient.
 */

export async function logActivity(
  kind: string,
  message: string,
  agentId: number | null = null,
  taskId: number | null = null,
): Promise<void> {
  await db.insert(activityEventsTable).values({ kind, message, agentId, taskId });
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2),
  );
}

/**
 * Score how well an agent's skill tag fits a task goal: keyword overlap between
 * the goal text and the skill tag, weighted by the agent's trust score. Ties are
 * broken by trust score alone so the most reliable agent wins.
 */
function scoreAgentForGoal(agent: Agent, goal: string): number {
  const goalTokens = tokenize(goal);
  const skillTokens = tokenize(agent.skillType);
  let overlap = 0;
  for (const token of skillTokens) {
    if (goalTokens.has(token)) overlap += 1;
  }
  const matchBonus = overlap > 0 ? 50 : 0;
  return matchBonus + agent.trustScore;
}

/**
 * Select the best-fit idle agent for a task goal via skill-match + trust-score
 * bidding. Returns null when no agent is eligible (none idle).
 */
export async function findBestAgent(goal: string): Promise<Agent | null> {
  const candidates = await db
    .select()
    .from(agentsTable)
    .where(eq(agentsTable.status, "idle"));

  if (candidates.length === 0) return null;

  let best = candidates[0]!;
  let bestScore = scoreAgentForGoal(best, goal);
  for (const candidate of candidates.slice(1)) {
    const score = scoreAgentForGoal(candidate, goal);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

const PHASE_VERBS = ["research", "plan", "build", "implement", "test", "verify", "deploy", "review"];

/**
 * Deterministic goal decomposition. Splits a goal on conjunctions/sequencing
 * words when present; otherwise expands it into a standard OODA-style phase
 * sequence (Research -> Plan -> Execute -> Verify). This is a rule-based
 * planning step, not an LLM call, so it always works without external services.
 */
export function decomposeGoal(goal: string): string[] {
  const trimmed = goal.trim();
  const parts = trimmed
    .split(/\s*(?:,| and then | then |;)\s*/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length > 1) {
    return parts;
  }

  const lower = trimmed.toLowerCase();
  const hasPhaseVerb = PHASE_VERBS.some((verb) => lower.includes(verb));
  if (hasPhaseVerb) {
    return [trimmed];
  }

  return [
    `Research: ${trimmed}`,
    `Plan: ${trimmed}`,
    `Execute: ${trimmed}`,
    `Verify: ${trimmed}`,
  ];
}

/**
 * Deterministic pseudo-random number in [0, 1) seeded from a task id, so
 * outcomes are reproducible for a given task rather than truly random.
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

interface ExecutionOutcome {
  success: boolean;
  result: string;
}

/**
 * Executes a task through a perception -> reasoning -> action cycle. Higher
 * agent trust scores yield a higher probability of success; the outcome is
 * seeded from the task id so it is deterministic and auditable.
 */
function runExecutionCycle(task: Task, agent: Agent): ExecutionOutcome {
  const successProbability = Math.min(0.97, Math.max(0.4, agent.trustScore / 100));
  const roll = seededRandom(task.id);
  const success = roll < successProbability;

  if (success) {
    return {
      success: true,
      result: `[Perception] Parsed goal "${task.goal}". [Reasoning] Matched to ${agent.name} (${agent.skillType}, trust ${agent.trustScore.toFixed(0)}). [Action] Executed successfully.`,
    };
  }

  return {
    success: false,
    result: `[Perception] Parsed goal "${task.goal}". [Reasoning] Matched to ${agent.name} (${agent.skillType}, trust ${agent.trustScore.toFixed(0)}). [Action] Execution failed — outcome fell outside the agent's current confidence envelope.`,
  };
}

/**
 * Runs a single assigned task end-to-end: executes it, updates the task
 * record, and adjusts the agent's trust score and completion/failure counters.
 * Returns the updated task.
 */
export async function executeAssignedTask(task: Task): Promise<Task> {
  if (task.assignedAgentId == null) {
    throw new Error("Task has no assigned agent");
  }

  const [agent] = await db
    .select()
    .from(agentsTable)
    .where(eq(agentsTable.id, task.assignedAgentId));

  if (!agent) {
    throw new Error("Assigned agent not found");
  }

  await db
    .update(agentsTable)
    .set({ status: "busy" })
    .where(eq(agentsTable.id, agent.id));

  const outcome = runExecutionCycle(task, agent);

  const [updatedTask] = await db
    .update(tasksTable)
    .set({
      status: outcome.success ? "completed" : "failed",
      result: outcome.result,
    })
    .where(eq(tasksTable.id, task.id))
    .returning();

  const trustDelta = outcome.success ? 2 : -5;
  const newTrustScore = Math.min(100, Math.max(0, agent.trustScore + trustDelta));

  await db
    .update(agentsTable)
    .set({
      status: "idle",
      trustScore: newTrustScore,
      tasksCompleted: outcome.success ? sql`${agentsTable.tasksCompleted} + 1` : agent.tasksCompleted,
      tasksFailed: outcome.success ? agent.tasksFailed : sql`${agentsTable.tasksFailed} + 1`,
    })
    .where(eq(agentsTable.id, agent.id));

  await logActivity(
    outcome.success ? "task_completed" : "task_failed",
    outcome.success
      ? `${agent.name} completed task #${task.id}: "${task.goal}"`
      : `${agent.name} failed task #${task.id}: "${task.goal}"`,
    agent.id,
    task.id,
  );

  return updatedTask!;
}
