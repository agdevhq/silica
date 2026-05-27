import { describe, expect, it } from "vitest";
import {
  addDevReloadListener,
  createDevReloadStream,
  notifyDevReload,
} from "./dev-reload.js";

async function readStreamChunk(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  const reader = stream.getReader();
  const { value } = await reader.read();
  await reader.cancel();
  return new TextDecoder().decode(value);
}

describe("dev reload events", () => {
  it("notifies subscribed listeners", () => {
    const events: string[] = [];
    const unsubscribe = addDevReloadListener((chunk) => events.push(chunk));

    notifyDevReload();

    expect(events).toEqual(["event: reload\ndata: {}\n\n"]);
    unsubscribe();
  });

  it("streams an initial connection event", async () => {
    const stream = createDevReloadStream();
    await expect(readStreamChunk(stream)).resolves.toContain(": connected");
  });

  it("streams reload events to active connections", async () => {
    const stream = createDevReloadStream();
    const reader = stream.getReader();
    await reader.read();

    notifyDevReload();

    const { value } = await reader.read();
    expect(new TextDecoder().decode(value)).toContain("event: reload");
    await reader.cancel();
  });
});
