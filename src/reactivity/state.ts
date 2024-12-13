import { hasChanged } from 'vdom/shared/utils';
import { activeEffect, enqueueEffect } from './effect';
import { createDep, Dep } from './dep';

interface State<T> {
  value: T;
  dep: Dep | null;
}

export interface StateGetter<T> {
  (): T;
}

export interface StateSetter<T> {
  (value: T | ((prev: T) => T)): T;
}

export function useState<T>(initialValue: T): [StateGetter<T>, StateSetter<T>] {
  const state: State<T> = {
    value: initialValue,
    dep: null,
  };

  const getter: StateGetter<T> = () => {
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

  const setter: StateSetter<T> = (value) => {
    const newVal: T =
      typeof value === 'function'
        ? (value as (prev: T) => T)(state.value)
        : value;
    if (hasChanged(newVal, state.value)) {
      state.value = newVal;
      // trigger effects
      if (state.dep) {
        state.dep.forEach((used, effect) => {
          used && enqueueEffect(effect);
        });
      }
    }
    return newVal;
  };

  return [getter, setter];
}
