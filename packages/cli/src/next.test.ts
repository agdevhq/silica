import { describe, expect, it } from "vitest";
import { rewriteFrameworkPaths } from "./next.js";

describe("rewriteFrameworkPaths", () => {
  it("rewrites generated route stack frames to framework labels", () => {
    const output = [
      "Error: boom",
      "    at Page (/tmp/site/.silica/next/app/[[...slug]]/page.tsx:12:3)",
      "    at helper (/tmp/site/.silica/next/server-data.ts:4:1)",
    ].join("\n");

    expect(rewriteFrameworkPaths(output, "/tmp/site/.silica/next")).toContain(
      "@silicajs/next [route]/[[...slug]]/page.tsx",
    );
    expect(rewriteFrameworkPaths(output, "/tmp/site/.silica/next")).toContain(".silica/next/server-data.ts");
  });
});
