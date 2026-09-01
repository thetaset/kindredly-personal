type DrainableResponse = {
  once: (event: string, listener: (...args: any[]) => void) => unknown;
  off: (event: string, listener: (...args: any[]) => void) => unknown;
  destroy?: (error?: Error) => unknown;
};

// A stalled-but-open client (zero receive window, dead NAT path) never fires
// any of the three raced events, so an un-timed wait pins the handler frame —
// and any upstream stream it is relaying — indefinitely. Prod sits behind an
// ALB/nginx ~60s idle timeout that eventually closes such sockets, but a bare
// deployment (personal server) has no such backstop. Two minutes is far past
// any legitimate drain.
export const DRAIN_TIMEOUT_MS = 120_000;

// Wait for a writable whose `write()` returned false to drain. Races 'drain'
// against 'close'/'error' so a client that disconnects mid-wait can never
// hang the handler, and removes all three listeners on settle so repeated
// waits on a long-lived response don't accumulate listeners. On timeout the
// connection is destroyed (it is unrecoverable — the buffer never drained),
// which also fires 'close' for any other listeners.
export function awaitWritableDrain(res: DrainableResponse, timeoutMs: number = DRAIN_TIMEOUT_MS): Promise<void> {
  return new Promise<void>((resolve) => {
    let timer: NodeJS.Timeout | undefined;
    const done = () => {
      if (timer) clearTimeout(timer);
      res.off('drain', done);
      res.off('close', done);
      res.off('error', done);
      resolve();
    };
    res.once('drain', done);
    res.once('close', done);
    res.once('error', done);
    timer = setTimeout(() => {
      try {
        res.destroy?.();
      } catch (_e) {
        // Already torn down.
      }
      done();
    }, timeoutMs);
    timer.unref?.();
  });
}
