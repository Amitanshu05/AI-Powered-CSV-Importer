import { Router } from "express";
import { importController } from "../controllers/import.controller";

const router = Router();

// Full path becomes /api/import once mounted under /api in app.ts
router.post("/import", importController);

export default router;