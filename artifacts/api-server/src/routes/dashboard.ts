import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import {
  db,
  agentsTable,
  tasksTable,
  workflowsTable,
  knowledgeEntriesTable,
  activityEventsTable,
} from "@workspace/db";
import {
  ListActivityEventsQueryParams,
  GetDashboardSummaryResponse,
  ListActivityEventsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const TASK_STATUSES = ["pending", "assigned", "running", "completed", "failed"] as const;

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const agents = await db.select().from(agentsTable);
  const tasks = await db.select().from(tasksTable);
  const workflows = await db.select().from(workflowsTable);
  const [{ count: knowledgeCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(knowledgeEntriesTable);

  const tasksByStatus = TASK_STATUSES.map((status) => ({
    status,
    count: tasks.filter((task) => task.status === status).length,
  }));

  const topAgents = [...agents].sort((a, b) => b.trustScore - a.trustScore).slice(0, 5);

  const recentActivity = await db
    .select()
    .from(activityEventsTable)
    .orderBy(desc(activityEventsTable.createdAt))
    .limit(10);

  const summary = {
    totalAgents: agents.length,
    activeAgents: agents.filter((agent) => agent.status !== "offline").length,
    totalTasks: tasks.length,
    tasksByStatus,
    totalWorkflows: workflows.length,
    runningWorkflows: workflows.filter((workflow) => workflow.status === "running").length,
    totalKnowledgeEntries: knowledgeCount,
    topAgents,
    recentActivity,
  };

  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/dashboard/activity", async (req, res): Promise<void> => {
  const query = ListActivityEventsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const limit = query.data.limit ?? 25;

  const events = await db
    .select()
    .from(activityEventsTable)
    .orderBy(desc(activityEventsTable.createdAt))
    .limit(limit);

  res.json(ListActivityEventsResponse.parse(events));
});

export default router;
