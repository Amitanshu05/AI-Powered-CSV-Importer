import { describe, it, expect } from "vitest";
import {
  chunkArray,
  applyCreatedAtFallback,
  normalizePhoneDigitsOnly,
  escapeNewlinesInNote,
} from "./batch.service";

describe("chunkArray", () => {
  it("splits rows into fixed-size chunks", () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe("applyCreatedAtFallback", () => {
  it("fills a timestamp when created_at is null", () => {
    const result = applyCreatedAtFallback({ created_at: null });
    expect(result.created_at).not.toBeNull();
    expect(() => new Date(result.created_at as string)).not.toThrow();
  });

  it("keeps a real created_at untouched", () => {
    const result = applyCreatedAtFallback({ created_at: "2024-01-01" });
    expect(result.created_at).toBe("2024-01-01");
  });
});

describe("normalizePhoneDigitsOnly", () => {
  it("strips spaces and dashes", () => {
    const result = normalizePhoneDigitsOnly({ mobile_without_country_code: "98765 43-210" });
    expect(result.mobile_without_country_code).toBe("9876543210");
  });

  it("leaves null untouched", () => {
    const result = normalizePhoneDigitsOnly({ mobile_without_country_code: null });
    expect(result.mobile_without_country_code).toBeNull();
  });
});

describe("escapeNewlinesInNote", () => {
  it("escapes embedded newlines", () => {
    const record: any = { crm_note: "line1\nline2" };
    expect(escapeNewlinesInNote(record).crm_note).toBe("line1\\nline2");
  });

  it("leaves notes without newlines untouched", () => {
    const record: any = { crm_note: "single line" };
    expect(escapeNewlinesInNote(record).crm_note).toBe("single line");
  });

  it("handles null crm_note", () => {
    const record: any = { crm_note: null };
    expect(escapeNewlinesInNote(record).crm_note).toBeNull();
  });
});