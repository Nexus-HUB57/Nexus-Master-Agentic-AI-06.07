import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { agentsTable } from "./agents";
import { tasksTable } from "./tasks";

export const activityEventsTable = pgTable("activity_events", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(),
  message: text("message").notNull(),
  agentId: integer("agent_id").references(() => agentsTable.id, { onDelete: "set null" }),
  taskId: integer("task_id").references(() => tasksTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ActivityEvent = typeof activityEventsTable.$inferSelect;
export const activityKindSchema = z.string();
