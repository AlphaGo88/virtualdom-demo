import type { ValueContainer, Ref } from 'shared/types';
import { currentSetupInstance } from 'core/component';

export interface State<T> {
  value: T;
  effects: Set<Effect>;
}

export interface Effect {
  (): void;
}

export const targetEffect: ValueContainer<Effect | null> = { value: null };

const effectQueue: Effect[] = [];

export function enqueueEffect(fn: Effect) {
  if (!effectQueue.includes(fn)) {
    effectQueue.push(fn);

    Promise.resolve().then(() => {
      while (effectQueue.length > 0) {
        effectQueue.shift()!();
      }
    });
  }
}

// A ref is not reactive, it should be used to access the dom element.
export function useRef<T>(initialValue: T): Ref<T> {
  return { value: initialValue };
}

export function useState<T>(initialValue: T) {
  const state: State<T> = {
    value: initialValue,
    effects: new Set(),
  };

  const getter = () => {
    if (targetEffect.value) {
      state.effects.add(targetEffect.value);
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
      state.effects.forEach(enqueueEffect);
    }

    return newVal;
  };

  return [getter, setter] as [() => T, (value: T | ((prev: T) => T)) => T];
}

// Use this to create deep reactive objects.
export function useStore<T extends {}>(obj: T) {
  return reactive(obj);
}

export function useShallowStore<T extends {}>(obj: T) {
  return reactive(obj, false);
}

function reactive<T extends {}>(obj: T, deep = true) {
  const effectMap = new Map<string, Set<Effect>>();

  const proxy = new Proxy(obj, {
    get(target, key) {
      if (typeof key === 'string' && targetEffect.value) {
        if (!effectMap.get(key)) {
          effectMap.set(key, new Set());
        }

        effectMap.get(key)!.add(targetEffect.value);
      }

      return target[key];
    },

    set(target, key, value) {
      if (typeof key === 'string' && !Object.is(target[key], value)) {
        effectMap.get(key)?.forEach(enqueueEffect);
      }

      return Reflect.set(target, key, value);
    },
  });

  if (deep) {
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        obj[key] = reactive(value);
      }
    });
  }

  return proxy;
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
