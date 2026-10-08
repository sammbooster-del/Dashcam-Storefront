import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storeRouter from "./store";
import physicalStoreRouter from "./physical-store";

const router: IRouter = Router();

router.use(healthRouter);
router.use(physicalStoreRouter);
router.use(storeRouter);

export default router;
