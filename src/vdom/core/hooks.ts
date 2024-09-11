import type { ValueContainer, Ref } from 'shared/types';
import { currentSetupInstance } from 'core/component';

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

function reactive<T extends object>(obj: T) {
  const watcherMap = new Map<string, Set<Effect>>();

  Object.entries(obj).forEach(([key, value]) => {
    watcherMap.set(key, new Set());

    if (Array.isArray(value)) {
      // to do: observe array
    } else if (value !== null && typeof value === 'object') {
      obj[key] = reactive(value);
    }
  });

  return new Proxy(obj, {
    get(target, key) {
      if (!target.hasOwnProperty(key)) {
        return undefined;
      }

      if (typeof key === 'string' && targetEffect.value) {
        const watchers = watcherMap.get(key);
        if (watchers) {
          watchers.add(targetEffect.value);
        }
      }

      return target[key];
    },

    set(target, key, value) {
      const oldValue = target[key];
      if (Object.is(value, oldValue)) {
        return true;
      }

      target[key] = value;
      if (typeof key === 'string') {
        const watchers = watcherMap.get(key);
        if (watchers) {
          watchers.forEach(enqueueEffect);
        }
      }

      return true;
    },
  });
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

      // effects will run asynchronously
      state.watchers.forEach(enqueueEffect);
    }

    return newVal;
  };

  return [getter, setter] as [() => T, (value: T | ((prev: T) => T)) => T];
}

// Use this to create deep reactive objects.
export function useStore<T extends object>(obj: T) {
  if (obj === null) {
    throw new Error('Invalid hook call. Target can not be null.');
  }

  if (typeof obj !== 'object') {
    throw new Error('Invalid hook call. Target is not an object.');
  }

  return reactive(obj);
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
