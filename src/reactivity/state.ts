import { hasChanged } from 'vdom/shared/utils';
import { activeEffect, enqueueEffect } from './effect';
import { createDep, Dep } from './dep';

export interface State<T> {
  value: T;
  dep: Dep | null;
}

export function useState<T>(
  initialValue: T
): [getter: () => T, setter: (value: T | ((prev: T) => T)) => T] {
  const state: State<T> = {
    value: initialValue,
    dep: null,
  };

  const getter = () => {
    // collect dependency
    if (activeEffect) {
      if (!state.dep) {
        state.dep = createDep(() => (state.dep = null));
      }
      if (!state.dep.has(activeEffect)) {
        activeEffect.deps.push(state.dep);
      }
      state.dep.set(activeEffect, true);
    }
    return state.value;
  };

  const setter = (value: T | ((prev: T) => T)) => {
    const newVal: T =
      typeof value === 'function'
        ? (value as (prev: T) => T)(state.value)
        : value;
    if (hasChanged(newVal, state.value)) {
      state.value = newVal;
      // trigger effects
      if (state.dep) {
        state.dep.forEach((used, effect) => {
          if (used) {
            enqueueEffect(effect);
          }
        });
      }
    }
    return newVal;
  };

  return [getter, setter];
}
