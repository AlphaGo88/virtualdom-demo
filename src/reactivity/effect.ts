import { isFunction } from 'vdom/shared/utils';
import { currentSetupInstance } from 'vdom/render/component';
import { Dep } from './dep';

export interface EffectFunction {
  (): void | (() => void);
}

export interface Effect {
  isRender: boolean;
  deps: Dep[];
  run: () => void;
  dispose: () => void;
}

const renderQueue: Set<Effect> = new Set();
const effectQueue: Set<Effect> = new Set();
let scheduled = false;

export let activeEffect: Effect | undefined;
export let shouldTrack = true;

export class ReactiveEffect implements Effect {
  isRender: boolean;
  deps: Dep[] = [];
  private fn: EffectFunction;
  private cleanup: (() => void) | null = null;

  constructor(fn: EffectFunction, isRender: boolean = false) {
    this.fn = fn;
    this.isRender = isRender;
  }

  run() {
    let lastShouldTrack = shouldTrack;
    let lastEffect = activeEffect;

    try {
      shouldTrack = true;
      activeEffect = this;
      this.deps.forEach((dep) => {
        dep.set(this, false);
      });
      this.cleanup?.();
      const result = this.fn();
      if (isFunction(result)) {
        this.cleanup = result;
      }
    } finally {
      activeEffect = lastEffect;
      shouldTrack = lastShouldTrack;
    }
  }

  dispose() {
    this.cleanup?.();
    this.deps.forEach((dep) => {
      dep.delete(this);
      if (dep.size === 0) {
        dep.cleanup();
      }
    });
  }
}

export function stopTracking() {
  shouldTrack = false;
}

export function resumeTracking() {
  shouldTrack = true;
}

export function enqueueEffect(effect: Effect) {
  if (effect.isRender) {
    renderQueue.add(effect);
  } else {
    effectQueue.add(effect);
  }

  if (!scheduled) {
    schedule();
  }
}

function schedule() {
  scheduled = true;

  Promise.resolve().then(() => {
    const effects = [...renderQueue, ...effectQueue];
    scheduled = false;
    renderQueue.clear();
    effectQueue.clear();
    effects.forEach((effect) => {
      effect.run();
    });
  });
}

export function useEffect(fn: () => void | (() => void)) {
  if (!currentSetupInstance) {
    if (__DEV__) {
      console.error('"useEffect" should not be called outside setup function.');
    }
  } else {
    if (__DEV__ && activeEffect) {
      console.error(
        '"useEffect" should not be called inside render function or nested.'
      );
    }
    const effect = new ReactiveEffect(fn);
    currentSetupInstance.addMountCallback(() => effect.run());
    currentSetupInstance.addUnmountCallback(() => effect.dispose());
  }
}
