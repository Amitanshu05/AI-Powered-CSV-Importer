import pino from "pino";
import { env } from "./env";

// In dev: pretty, human-readable logs.
// In prod: raw JSON logs — that's what real log aggregators (Datadog, etc.) expect,
// not colorized console output.
export const logger = pino({
  level: env.isProduction ? "info" : "debug",
  transport: env.isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" },
      },
});