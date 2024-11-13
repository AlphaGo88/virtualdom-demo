import { currentSetupInstance } from 'core/component';

export interface Effect {
  (): void;
}

const effectQueue: Effect[] = [];

export let shouldTrack = true;
export let activeEffect: Effect | null = null;

export function stopTracking() {
  shouldTrack = false;
}

export function resumeTracking() {
  shouldTrack = true;
}

export function setActiveEffect(effect: Effect | null) {
  activeEffect = effect;
}

export function enqueueEffect(effect: Effect) {
  if (!effectQueue.includes(effect)) {
    effectQueue.push(effect);

    Promise.resolve().then(() => {
      while (effectQueue.length > 0) {
        effectQueue.shift()!();
      }
    });
  }
}

export function useEffect(fn: () => void) {
  const effect = () => {
    setActiveEffect(effect);
    fn();
    setActiveEffect(null);
  };

  if (currentSetupInstance) {
    // effects defined inside a component runs when the component mounts
    currentSetupInstance.addMountCallback(effect);
  } else {
    enqueueEffect(effect);
  }
}
