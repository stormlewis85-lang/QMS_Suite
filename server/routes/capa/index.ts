import { Router } from "express";
import { router as coreRouter } from "./core.routes";
import { router as dStagesRouter } from "./d-stages.routes";
import { router as analyticsRouter } from "./analytics.routes";

const router = Router();
router.use(coreRouter);
router.use(dStagesRouter);
router.use(analyticsRouter);

export { router as capaRouter };
