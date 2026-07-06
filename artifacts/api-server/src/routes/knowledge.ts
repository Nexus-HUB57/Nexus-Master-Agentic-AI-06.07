import { Router, type IRouter } from "express";
import { eq, or, ilike } from "drizzle-orm";
import { db, knowledgeEntriesTable } from "@workspace/db";
import {
  CreateKnowledgeEntryBody,
  DeleteKnowledgeEntryParams,
  SearchKnowledgeQueryParams,
  ListKnowledgeEntriesResponse,
  CreateKnowledgeEntryResponse,
  SearchKnowledgeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/knowledge", async (_req, res): Promise<void> => {
  const entries = await db
    .select()
    .from(knowledgeEntriesTable)
    .orderBy(knowledgeEntriesTable.createdAt);
  res.json(ListKnowledgeEntriesResponse.parse(entries));
});

router.post("/knowledge", async (req, res): Promise<void> => {
  const parsed = CreateKnowledgeEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [entry] = await db.insert(knowledgeEntriesTable).values(parsed.data).returning();
  res.status(201).json(CreateKnowledgeEntryResponse.parse(entry));
});

router.delete("/knowledge/:id", async (req, res): Promise<void> => {
  const params = DeleteKnowledgeEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entry] = await db
    .delete(knowledgeEntriesTable)
    .where(eq(knowledgeEntriesTable.id, params.data.id))
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Knowledge entry not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/knowledge/search", async (req, res): Promise<void> => {
  const query = SearchKnowledgeQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const pattern = `%${query.data.q}%`;
  const entries = await db
    .select()
    .from(knowledgeEntriesTable)
    .where(or(ilike(knowledgeEntriesTable.title, pattern), ilike(knowledgeEntriesTable.content, pattern)))
    .orderBy(knowledgeEntriesTable.createdAt);

  res.json(SearchKnowledgeResponse.parse(entries));
});

export default router;
