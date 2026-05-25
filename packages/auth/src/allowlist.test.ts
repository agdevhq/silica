import { describe, expect, it } from "vitest";
import { isEmailAllowed } from "./allowlist.js";

describe("allowlist", () => {
  it("accepts explicit emails and domains", () => {
    expect(isEmailAllowed("Reviewer@Example.com", { allowedEmails: ["reviewer@example.com"] })).toBe(true);
    expect(isEmailAllowed("person@omnifact.com", { allowedDomains: ["omnifact.com"] })).toBe(true);
    expect(isEmailAllowed("person@evil.com", { allowedDomains: ["omnifact.com"] })).toBe(false);
  });
});
