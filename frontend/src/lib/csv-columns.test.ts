import { describe, it, expect } from "vitest";
import { buildSafeColumns } from "./csv-columns";

describe("buildSafeColumns", () => {
  it("keeps normal headers as-is", () => {
    const result = buildSafeColumns(["Name", "Email"]);
    expect(result[0].label).toBe("Name");
    expect(result[1].label).toBe("Email");
  });

  it("replaces blank headers with a positional label", () => {
    const result = buildSafeColumns(["Name", "", "Email"]);
    expect(result[1].label).toBe("Column 2");
  });

  it("produces unique ids for duplicate headers", () => {
    const result = buildSafeColumns(["Email", "Email"]);
    expect(result[0].id).not.toBe(result[1].id);
  });

  it("never produces an empty id", () => {
    const result = buildSafeColumns(["", "", ""]);
    result.forEach((c) => expect(c.id.length).toBeGreaterThan(0));
  });
});