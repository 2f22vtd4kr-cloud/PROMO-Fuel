import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { existsSync } from "fs";
import { join } from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const FRONTEND_DIST = join(process.cwd(), "artifacts", "telegram-miniapp", "dist");
if (existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get("/*path", (_req, res) => {
    res.sendFile(join(FRONTEND_DIST, "index.html"));
  });
  logger.info({ path: FRONTEND_DIST }, "Serving frontend static files");
}

export default app;
