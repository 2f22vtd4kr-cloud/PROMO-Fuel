import { Router, type IRouter } from "express";
import healthRouter    from "./health";
import campaignsRouter from "./campaigns";
import usersRouter     from "./users";
import analyticsRouter from "./analytics";
import sseRouter       from "./sse";
import accountsRouter  from "./accounts";
import templatesRouter from "./templates";
import audienceRouter  from "./audience";
import uploadRouter    from "./upload";

const router: IRouter = Router();

// ── Standard CRM routes ──
router.use(healthRouter);
router.use(campaignsRouter);
router.use(usersRouter);
router.use(analyticsRouter);
router.use(sseRouter);
router.use(accountsRouter);
router.use(templatesRouter);
router.use(audienceRouter);
router.use(uploadRouter);

// ── TWA aliases — same handlers, accessible under /twa/* for Mini App ──
router.use("/twa", campaignsRouter);
router.use("/twa", usersRouter);
router.use("/twa", analyticsRouter);
router.use("/twa", accountsRouter);
router.use("/twa", audienceRouter);

export default router;
