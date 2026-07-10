import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { errorHandler } from "./middleware/error-handler";
import importRoutes from "./routes/import.routes";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" })); // CSV row JSON can be sizable

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Phase 4: real endpoint. Mounted under /api, so POST /import here becomes
// POST /api/import — matching contract.md exactly.
app.use("/api", importRoutes);

// Error handler must be registered LAST
app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});