import { isFunction } from 'vdom/shared/utils';
import { currentSetupInstance } from 'vdom/render/component';
import { Dep } from './dep';

export interface EffectFunction {
  (): void | (() => void);
}

export interface Effect {
  isRender: boolean;
  deps: Dep[];
  run: Function;
  dispose: () => void;
}

const renderQueue: Set<Effect> = new Set();
const effectQueue: Set<Effect> = new Set();
let scheduled = false;

export let activeEffect: Effect | undefined;
export let shouldTrack = true;

export function setActiveEffect(effect?: Effect) {
  activeEffect = effect;
}

export function stopTracking() {
  shouldTrack = false;
}

export function resumeTracking() {
  shouldTrack = true;
}

export class ReactiveEffect implements Effect {
  isRender: boolean = false;
  deps: Dep[] = [];
  cleanup?: () => void;

  constructor(public fn: EffectFunction) {}

  run() {
    let lastEffect = activeEffect;
    try {
      activeEffect = this;
      this.deps.forEach((dep) => {
        dep.set(this, false);
      });
      this.cleanup?.();
      const result = this.fn();
      this.cleanup = isFunction(result) ? result : undefined;
    } finally {
      activeEffect = lastEffect;
    }
  }

  dispose() {
    if (this.cleanup) {
      this.cleanup();
      this.cleanup = undefined;
    }
    this.deps.forEach((dep) => {
      dep.delete(this);
      if (dep.size === 0) {
        dep.cleanup();
      }
    });
  }
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
