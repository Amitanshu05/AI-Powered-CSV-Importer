// src/lib/query-client.ts
import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
      mutations: {
        // We handle retries ourselves at the batch level in one place
        // (Step 5), not silently via TanStack Query defaults.
        retry: false,
      },
    },
  });
}