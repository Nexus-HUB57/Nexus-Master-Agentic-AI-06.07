import { Router, type IRouter } from "express";
import healthRouter from "./health";
import agentsRouter from "./agents";
import tasksRouter from "./tasks";
import workflowsRouter from "./workflows";
import knowledgeRouter from "./knowledge";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(agentsRouter);
router.use(tasksRouter);
router.use(workflowsRouter);
router.use(knowledgeRouter);
router.use(dashboardRouter);

export default router;
