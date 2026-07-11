import { Router } from "express";
import { importController } from "../controllers/import.controller";
import { importStreamController } from "../controllers/import-stream.controller";

const router = Router();

// Full path becomes /api/import once mounted under /api in app.ts
router.post("/import", importController);

// Full path becomes /api/import/stream once mounted under /api in app.ts
// contract.md §2.5 — same request body as /import, streamed SSE response instead.
router.post("/import/stream", importStreamController);

export default router;