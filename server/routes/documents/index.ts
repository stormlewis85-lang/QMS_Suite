import { Router } from "express";
import { router as coreRouter } from "./core.routes";
import { router as filesRouter } from "./files.routes";
import { router as distributionRouter } from "./distribution.routes";

const router = Router();
router.use(coreRouter);
router.use(filesRouter);
router.use(distributionRouter);

export { router as documentsRouter };
