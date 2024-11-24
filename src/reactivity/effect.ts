import { currentSetupInstance } from 'vdom/render/component';

export interface EffectFunc {
  (): void | (() => void);
}

export interface Effect {
  run: () => void;
}

const asyncQueue: Effect[] = [];

export let activeEffect: Effect | undefined;
export let shouldTrack = true;

export class ReactiveEffect implements Effect {
  private fn: EffectFunc;
  private cleanupFn: (() => void) | null = null;

  constructor(fn: EffectFunc) {
    this.fn = fn;
  }

  run() {
    let lastShouldTrack = shouldTrack;
    let lastEffect = activeEffect;

    try {
      shouldTrack = true;
      activeEffect = this;
      this.cleanup();
      this.cleanupFn = this.fn() ?? null;
    } finally {
      activeEffect = lastEffect;
      shouldTrack = lastShouldTrack;
    }
  }

  cleanup() {
    this.cleanupFn?.();
  }
}

export function stopTracking() {
  shouldTrack = false;
}

export function resumeTracking() {
  shouldTrack = true;
}

export function enqueueEffect(effect: Effect) {
  if (!asyncQueue.includes(effect)) {
    asyncQueue.push(effect);

    Promise.resolve().then(() => {
      while (asyncQueue.length) {
        asyncQueue.shift()!.run();
      }
    });
  }
}

export function useEffect(fn: () => void | (() => void)) {
  if (!currentSetupInstance) {
    if (__DEV__) {
      console.error('"useEffect" should not be called outside setup function.');
    }
  } else {
    if (__DEV__ && activeEffect) {
      console.error(
        '"useEffect" should not be called inside render function or "useEffect".'
      );
    }
    const effect = new ReactiveEffect(fn);

    currentSetupInstance.addMountCallback(() => effect.run());
    currentSetupInstance.addUnmountCallback(() => effect.cleanup());
  }
}
