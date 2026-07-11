import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("serializes rows and escapes quotes", () => {
    expect(toCsv([{ name: 'Ada "Countess"', country: "UK" }])).toBe(
      'name,country\n"Ada ""Countess""","UK"',
    );
  });

  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });
});

