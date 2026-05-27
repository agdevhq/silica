type DevReloadListener = (chunk: string) => void;

const listeners = new Set<DevReloadListener>();

export function addDevReloadListener(listener: DevReloadListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyDevReload(): void {
  for (const listener of listeners) {
    listener("event: reload\ndata: {}\n\n");
  }
}

export function createDevReloadStream(): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;

  return new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          unsubscribe?.();
        }
      };

      send(": connected\n\n");
      unsubscribe = addDevReloadListener(send);
    },
    cancel() {
      unsubscribe?.();
    },
  });
}
