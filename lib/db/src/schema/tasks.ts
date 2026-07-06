import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { agentsTable } from "./agents";
import { workflowsTable } from "./workflows";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  goal: text("goal").notNull(),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("medium"),
  assignedAgentId: integer("assigned_agent_id").references(() => agentsTable.id, {
    onDelete: "set null",
  }),
  workflowId: integer("workflow_id").references(() => workflowsTable.id, {
    onDelete: "cascade",
  }),
  result: text("result"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  assignedAgentId: true,
  result: true,
});
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
