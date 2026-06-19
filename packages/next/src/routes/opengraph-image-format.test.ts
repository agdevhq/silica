import { describe, expect, it } from "vitest";
import {
  clampText,
  hostnameFromBaseUrl,
  titleFontSize,
} from "./opengraph-image-format.js";

describe("titleFontSize", () => {
  it("scales down for longer titles", () => {
    expect(titleFontSize("Short")).toBe(84);
    expect(titleFontSize("A".repeat(40))).toBe(64);
    expect(titleFontSize("A".repeat(80))).toBe(48);
  });
});

describe("clampText", () => {
  it("returns short text unchanged", () => {
    expect(clampText("Hello", 160)).toBe("Hello");
  });

  it("truncates and appends an ellipsis", () => {
    const result = clampText("A".repeat(200), 160);
    expect(result).toHaveLength(160);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("hostnameFromBaseUrl", () => {
  it("returns undefined without a base URL", () => {
    expect(hostnameFromBaseUrl()).toBeUndefined();
    expect(hostnameFromBaseUrl("")).toBeUndefined();
  });

  it("extracts the hostname from a full URL", () => {
    expect(hostnameFromBaseUrl("https://notes.example.com/base")).toBe(
      "notes.example.com",
    );
  });

  it("falls back to a cleaned value for invalid URLs", () => {
    expect(hostnameFromBaseUrl("notes.example.com/")).toBe("notes.example.com");
  });
});
