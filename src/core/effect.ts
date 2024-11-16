import { currentSetupInstance } from 'core/component';

export interface Effect {
  (): void;
}

const asyncQueue: Effect[] = [];
const runStack: Effect[] = [];

export let activeEffect: Effect | undefined;
export let shouldTrack = true;

export function pushEffect(effect: Effect) {
  runStack.push(effect);
  activeEffect = effect;
}

export function popEffect() {
  runStack.pop();
  activeEffect = runStack[runStack.length - 1];
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
        asyncQueue.shift()!();
      }
    });
  }
}

export function useEffect(fn: () => void) {
  const effect = () => {
    pushEffect(effect);
    fn();
    popEffect();
  };

  if (__DEV__ && activeEffect) {
    console.error(
      '"useEffect" should not be called inside render function or "useEffect".'
    );
  }

  if (currentSetupInstance) {
    // effects defined inside component run when the component mounts.
    currentSetupInstance.addMountCallback(effect);
  } else {
    effect();
  }
}
