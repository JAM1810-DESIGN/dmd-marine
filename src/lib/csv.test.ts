import { describe, it, expect } from "vitest";
import { buildCsv } from "./csv";

describe("buildCsv", () => {
  it("joins header and rows with newlines and commas", () => {
    expect(buildCsv(["A", "B"], [["1", "2"], ["3", "4"]])).toBe("A,B\n1,2\n3,4");
  });

  it("quotes values containing commas", () => {
    expect(buildCsv(["Name"], [["Doe, John"]])).toBe('Name\n"Doe, John"');
  });

  it("escapes embedded double quotes by doubling them", () => {
    expect(buildCsv(["Q"], [['She said "hi"']])).toBe('Q\n"She said ""hi"""');
  });

  it("quotes values containing newlines", () => {
    expect(buildCsv(["Note"], [["line1\nline2"]])).toBe('Note\n"line1\nline2"');
  });

  it("leaves plain values unquoted", () => {
    expect(buildCsv(["X"], [["plain"]])).toBe("X\nplain");
  });

  it("handles an empty row set", () => {
    expect(buildCsv(["A", "B"], [])).toBe("A,B");
  });
});
