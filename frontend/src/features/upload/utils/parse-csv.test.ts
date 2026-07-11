import { describe, it, expect } from "vitest";
import { isCsvFile, isLargeCsv, LARGE_CSV_THRESHOLD } from "./parse-csv";

describe("isCsvFile", () => {
  it("accepts .csv files", () => {
    const file = new File(["a,b"], "data.csv", { type: "text/csv" });
    expect(isCsvFile(file)).toBe(true);
  });

  it("rejects non-csv files", () => {
    const file = new File(["a,b"], "data.xlsx", { type: "application/vnd.ms-excel" });
    expect(isCsvFile(file)).toBe(false);
  });
});

describe("isLargeCsv", () => {
  it("is false below the threshold", () => {
    expect(isLargeCsv(LARGE_CSV_THRESHOLD - 1)).toBe(false);
  });

  it("is true at or above the threshold", () => {
    expect(isLargeCsv(LARGE_CSV_THRESHOLD)).toBe(true);
  });
});