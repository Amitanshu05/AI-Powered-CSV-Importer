// src/config/env.ts
// Fails fast at build/runtime if the API URL is missing — mirrors the
// backend's own env.ts validation philosophy (config/env.ts on the backend).

function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. Copy .env.local.example to .env.local and set it."
    );
  }
  return url;
}

export const env = {
  apiUrl: getApiUrl(),
} as const;