/**
 * Coalescing scheduler.
 *
 * Layout is triggered from many independent sources — a container resize, an
 * individual item resizing, an image finishing decode, a prop change. When a
 * grid of 200 images hydrates, every one of those loads would otherwise force
 * its own full relayout.
 *
 * `schedule()` collapses any number of calls made before the next animation
 * frame into a single invocation, so a burst costs one layout pass.
 */
export interface Scheduler {
  /** Request a run on the next frame. Repeat calls before it fires are free. */
  schedule(): void;
  /** Run immediately, cancelling any pending frame. */
  flush(): void;
  /** Drop any pending frame without running. */
  cancel(): void;
}

const hasRaf = () => typeof requestAnimationFrame === 'function';

export function createScheduler(fn: () => void): Scheduler {
  let frame: number | null = null;

  const clear = (): void => {
    if (frame === null) return;
    if (hasRaf()) cancelAnimationFrame(frame);
    else clearTimeout(frame as unknown as ReturnType<typeof setTimeout>);
    frame = null;
  };

  const run = (): void => {
    frame = null;
    fn();
  };

  return {
    schedule(): void {
      if (frame !== null) return;
      frame = hasRaf()
        ? requestAnimationFrame(run)
        : (setTimeout(run, 16) as unknown as number);
    },
    flush(): void {
      clear();
      fn();
    },
    cancel: clear,
  };
}
