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
};