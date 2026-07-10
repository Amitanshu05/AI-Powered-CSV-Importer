import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

// Every env var the app needs, in one place. If one is missing/wrong-shaped,
// the app refuses to start — this is "fail fast" instead of failing silently
// three layers deep when someone finally calls the AI service.
const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  PORT: z.string().default("5000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Model names as CONFIG, not hardcoded strings in service code. Added after
  // hitting two live Gemini model retirements in one day during Phase 2
  // (gemini-2.5-flash, gemini-2.5-flash-lite both fully shut down by Google).
  // A future retirement is now a one-line .env edit, not a code change + redeploy.
  GEMINI_PRIMARY_MODEL: z.string().default("gemini-3.1-flash-lite"),
  GEMINI_FALLBACK_MODEL: z.string().default("gemini-3.5-flash"),

  // How many CSV rows go into a single Gemini call. Kept small enough to stay
  // well under any model's token ceiling even for rows with long free-text
  // fields, per architecture.md §2 ("BatchService... single LLM call has a
  // token ceiling").
  BATCH_SIZE: z.string().default("20"),

  // How many batches run in parallel at once. Kept deliberately low (not "as many
  // as possible") because we saw real rate-limit/overload (503) behavior from
  // Gemini's free tier today — high concurrency would make that worse, not better.
  BATCH_CONCURRENCY: z.string().default("3"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  GEMINI_API_KEY: parsed.data.GEMINI_API_KEY,
  PORT: parseInt(parsed.data.PORT, 10),
  NODE_ENV: parsed.data.NODE_ENV,
  isProduction: parsed.data.NODE_ENV === "production",
  GEMINI_PRIMARY_MODEL: parsed.data.GEMINI_PRIMARY_MODEL,
  GEMINI_FALLBACK_MODEL: parsed.data.GEMINI_FALLBACK_MODEL,
  BATCH_SIZE: parseInt(parsed.data.BATCH_SIZE, 10),
  BATCH_CONCURRENCY: parseInt(parsed.data.BATCH_CONCURRENCY, 10),
};