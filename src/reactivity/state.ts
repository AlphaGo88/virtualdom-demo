import { hasChanged } from 'vdom/shared/utils';
import { type Effect, activeEffect, enqueueEffect } from './effect';

export interface State<T> {
  value: T;
  effects: Set<Effect> | null;
}

export function useState<T>(
  initialValue: T
): [getter: () => T, setter: (value: T | ((prev: T) => T)) => T] {
  const state: State<T> = {
    value: initialValue,
    effects: null,
  };

  const getter = () => {
    if (activeEffect) {
      if (!state.effects) {
        state.effects = new Set();
      }
      state.effects.add(activeEffect);
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

      const { effects } = state;
      if (effects) {
        effects.forEach((effect) => {
          if (effect.active) {
            enqueueEffect(effect);
          } else {
            effects.delete(effect);
          }
        });
      }
    }

    return newVal;
  };

  return [getter, setter];
}
