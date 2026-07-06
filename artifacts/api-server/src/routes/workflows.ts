import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, workflowsTable, tasksTable } from "@workspace/db";
import {
  CreateWorkflowBody,
  GetWorkflowParams,
  DeleteWorkflowParams,
  OrchestrateWorkflowParams,
  ListWorkflowsResponse,
  GetWorkflowResponse,
  CreateWorkflowResponse,
  OrchestrateWorkflowResponse,
} from "@workspace/api-zod";
import { decomposeGoal, findBestAgent, executeAssignedTask, logActivity } from "../lib/orchestration";

const router: IRouter = Router();

router.get("/workflows", async (_req, res): Promise<void> => {
  const workflows = await db.select().from(workflowsTable).orderBy(workflowsTable.createdAt);
  res.json(ListWorkflowsResponse.parse(workflows));
});

router.post("/workflows", async (req, res): Promise<void> => {
  const parsed = CreateWorkflowBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [workflow] = await db.insert(workflowsTable).values(parsed.data).returning();
  res.status(201).json(CreateWorkflowResponse.parse(workflow));
});

router.get("/workflows/:id", async (req, res): Promise<void> => {
  const params = GetWorkflowParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [workflow] = await db.select().from(workflowsTable).where(eq(workflowsTable.id, params.data.id));
  if (!workflow) {
    res.status(404).json({ error: "Workflow not found" });
    return;
  }

  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.workflowId, workflow.id));

  res.json(GetWorkflowResponse.parse({ ...workflow, tasks }));
});

router.delete("/workflows/:id", async (req, res): Promise<void> => {
  const params = DeleteWorkflowParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [workflow] = await db.delete(workflowsTable).where(eq(workflowsTable.id, params.data.id)).returning();

  if (!workflow) {
    res.status(404).json({ error: "Workflow not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/workflows/:id/orchestrate", async (req, res): Promise<void> => {
  const params = OrchestrateWorkflowParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [workflow] = await db.select().from(workflowsTable).where(eq(workflowsTable.id, params.data.id));
  if (!workflow) {
    res.status(404).json({ error: "Workflow not found" });
    return;
  }

  await db.update(workflowsTable).set({ status: "running" }).where(eq(workflowsTable.id, workflow.id));

  const subGoals = decomposeGoal(workflow.goal);
  const createdTasks = await db
    .insert(tasksTable)
    .values(
      subGoals.map((goal) => ({
        goal,
        priority: "medium" as const,
        workflowId: workflow.id,
      })),
    )
    .returning();

  await logActivity(
    "workflow_orchestrated",
    `Orchestrated "${workflow.name}" into ${createdTasks.length} task(s)`,
    null,
    null,
  );

  for (const task of createdTasks) {
    const agent = await findBestAgent(task.goal);
    if (!agent) continue;

    const [assignedTask] = await db
      .update(tasksTable)
      .set({ status: "assigned", assignedAgentId: agent.id })
      .where(eq(tasksTable.id, task.id))
      .returning();

    await logActivity(
      "task_assigned",
      `${agent.name} bid on and was assigned task #${task.id}: "${task.goal}"`,
      agent.id,
      task.id,
    );

    await db.update(tasksTable).set({ status: "running" }).where(eq(tasksTable.id, task.id));
    await executeAssignedTask({ ...assignedTask!, status: "running" });
  }

  const finalTasks = await db.select().from(tasksTable).where(eq(tasksTable.workflowId, workflow.id));
  const workflowStatus = finalTasks.some((task) => task.status === "failed")
    ? "failed"
    : finalTasks.every((task) => task.status === "completed")
      ? "completed"
      : "running";

  const [updatedWorkflow] = await db
    .update(workflowsTable)
    .set({ status: workflowStatus })
    .where(eq(workflowsTable.id, workflow.id))
    .returning();

  res.json(OrchestrateWorkflowResponse.parse({ ...updatedWorkflow, tasks: finalTasks }));
});

export default router;
