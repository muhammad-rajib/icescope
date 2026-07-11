import { describe, expect, it } from "vitest";
import { friendlyClientError, getQueryHints } from "./queryHints";

describe("query hints", () => {
  it("warns for select star", () => {
    expect(getQueryHints("SELECT * FROM analytics.events")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "warning", title: "SELECT * can be expensive" }),
      ]),
    );
  });

  it("suggests single quotes for string literals", () => {
    expect(getQueryHints('SELECT id FROM analytics.users WHERE email = "a@example.com"')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "info", title: "SQL quote hint" }),
      ]),
    );
  });

  it("formats common S3 errors", () => {
    expect(friendlyClientError("AccessDenied: no bucket access")).toContain("S3 access denied");
  });
});
