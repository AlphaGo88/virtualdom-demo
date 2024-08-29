import type { ValueContainer, Ref } from 'shared/types';
import { currentSetupInstance } from './component';

export interface State<T> {
  value: T;
  watchers: Set<Effect>;
}

export interface Effect {
  (): void;
}

export const targetEffect: ValueContainer<Effect | null> = { value: null };

const effectQueue: Effect[] = [];

function enqueueEffect(fn: Effect) {
  if (!effectQueue.includes(fn)) {
    effectQueue.push(fn);

    Promise.resolve().then(() => {
      while (effectQueue.length > 0) {
        effectQueue.shift()!();
      }
    });
  }
}

// A Ref is not reactive, it should be used to access the dom element.
export function useRef<T>(initialValue: T): Ref<T> {
  return { value: initialValue };
}

export function useState<T>(initialValue: T) {
  const state: State<T> = {
    value: initialValue,
    watchers: new Set(),
  };

  const getter = () => {
    if (targetEffect.value) {
      state.watchers.add(targetEffect.value);
    }
    return state.value;
  };

  const setter = (value: T | ((prev: T) => T)) => {
    const newVal: T =
      typeof value === 'function'
        ? (value as (prev: T) => T)(state.value)
        : value;

    if (!Object.is(newVal, state.value)) {
      state.value = newVal;

      // watcher effects will run asynchronously
      state.watchers.forEach(enqueueEffect);
    }
    return newVal;
  };

  return [getter, setter] as [() => T, (value: T | ((prev: T) => T)) => T];
}

export function useEffect(fn: () => void) {
  // A effect reruns if any of its dependencies changes.
  const effect = () => {
    targetEffect.value = effect;
    fn();
    targetEffect.value = null;
  };

  if (currentSetupInstance) {
    // Effects defined inside a component will run when the component mounts.
    currentSetupInstance.addMountCallback(effect);
  } else {
    // Effects defined outside a component will run asynchronously.
    enqueueEffect(effect);
  }
}

export function onMount(fn: () => void) {
  if (!currentSetupInstance) {
    throw new Error(
      'Invalid hook call. "onMount" can only be called inside setup function.'
    );
  }
  currentSetupInstance.addMountCallback(fn);
}

export function onUnmount(fn: () => void) {
  if (!currentSetupInstance) {
    throw new Error(
      'Invalid hook call. "onUnmount" can only be called inside setup function.'
    );
  }
  currentSetupInstance.addUnmountCallback(fn);
}
