import { Router, type IRouter } from "express";
import healthRouter         from "./health";
import campaignsRouter      from "./campaigns";
import usersRouter          from "./users";
import analyticsRouter      from "./analytics";
import sseRouter            from "./sse";
import accountsRouter       from "./accounts";
import templatesRouter      from "./templates";
import audienceRouter       from "./audience";
import uploadRouter         from "./upload";
import groupCampaignsRouter from "./group-campaigns";
import workersRouter        from "./workers";
import aiRouter             from "./ai";
import proxyStoreRouter     from "./proxy-store";

const router: IRouter = Router();

// ── Standard CRM routes ──
router.use(healthRouter);
router.use(campaignsRouter);
router.use(groupCampaignsRouter);
router.use(usersRouter);
router.use(analyticsRouter);
router.use(sseRouter);
router.use(accountsRouter);
router.use(templatesRouter);
router.use(audienceRouter);
router.use(uploadRouter);
router.use(workersRouter);
router.use(aiRouter);
router.use(proxyStoreRouter);

// ── TWA aliases — same handlers, accessible under /twa/* for Mini App ──
router.use("/twa", campaignsRouter);
router.use("/twa", groupCampaignsRouter);
router.use("/twa", usersRouter);
router.use("/twa", analyticsRouter);
router.use("/twa", accountsRouter);
router.use("/twa", audienceRouter);
router.use("/twa", uploadRouter);
router.use("/twa", sseRouter);
router.use("/twa", workersRouter);

export default router;
