import { hasChanged } from 'vdom/shared/utils';
import { type Effect, activeEffect, enqueueEffect } from './effect';

export interface State<T> {
  value: T;
  effects: Set<Effect>;
}

export function useState<T>(
  initialValue: T
): [getter: () => T, setter: (value: T | ((prev: T) => T)) => T] {
  const state: State<T> = {
    value: initialValue,
    effects: new Set(),
  };

  function getter() {
    if (activeEffect) {
      state.effects.add(activeEffect);
    }
    return state.value;
  }

  function setter(value: T | ((prev: T) => T)) {
    const newVal: T =
      typeof value === 'function'
        ? (value as (prev: T) => T)(state.value)
        : value;

    if (hasChanged(newVal, state.value)) {
      state.value = newVal;
      state.effects.forEach(enqueueEffect);
    }
    return newVal;
  }

  return [getter, setter];
}
