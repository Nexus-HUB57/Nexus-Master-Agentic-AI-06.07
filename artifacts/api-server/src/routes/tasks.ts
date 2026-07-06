import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, tasksTable, agentsTable } from "@workspace/db";
import {
  CreateTaskBody,
  GetTaskParams,
  UpdateTaskParams,
  UpdateTaskBody,
  DeleteTaskParams,
  AssignTaskParams,
  RunTaskParams,
  ListTasksQueryParams,
  ListTasksResponse,
  GetTaskResponse,
  CreateTaskResponse,
  UpdateTaskResponse,
  AssignTaskResponse,
  RunTaskResponse,
} from "@workspace/api-zod";
import { findBestAgent, executeAssignedTask, logActivity } from "../lib/orchestration";

const router: IRouter = Router();

router.get("/tasks", async (req, res): Promise<void> => {
  const query = ListTasksQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.status) conditions.push(eq(tasksTable.status, query.data.status));
  if (query.data.workflowId != null) conditions.push(eq(tasksTable.workflowId, query.data.workflowId));

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(tasksTable.createdAt);

  res.json(ListTasksResponse.parse(tasks));
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db.insert(tasksTable).values(parsed.data).returning();
  await logActivity("task_created", `New task queued: "${task!.goal}"`, null, task!.id);

  res.status(201).json(CreateTaskResponse.parse(task));
});

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const params = GetTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(GetTaskResponse.parse(task));
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const params = UpdateTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [task] = await db
    .update(tasksTable)
    .set(parsed.data)
    .where(eq(tasksTable.id, params.data.id))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(UpdateTaskResponse.parse(task));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const params = DeleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id)).returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/tasks/:id/assign", async (req, res): Promise<void> => {
  const params = AssignTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  const agent = await findBestAgent(task.goal);
  if (!agent) {
    res.status(409).json({ error: "No eligible agent available" });
    return;
  }

  const [updatedTask] = await db
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

  res.json(AssignTaskResponse.parse(updatedTask));
});

router.post("/tasks/:id/run", async (req, res): Promise<void> => {
  const params = RunTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, params.data.id));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  if (task.assignedAgentId == null) {
    res.status(409).json({ error: "Task is not assigned to an agent" });
    return;
  }

  await db.update(tasksTable).set({ status: "running" }).where(eq(tasksTable.id, task.id));
  const executedTask = await executeAssignedTask({ ...task, status: "running" });

  res.json(RunTaskResponse.parse(executedTask));
});

export default router;
