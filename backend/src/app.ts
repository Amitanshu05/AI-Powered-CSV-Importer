import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { errorHandler } from "./middleware/error-handler";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" })); // CSV row JSON can be sizable

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Routes will be mounted here in Phase 4 (POST /api/import)

// Error handler must be registered LAST
app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});