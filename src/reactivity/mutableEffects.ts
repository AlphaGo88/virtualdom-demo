import { isArray, isIndexKey } from 'vdom/shared/utils';
import {
  type Effect,
  activeEffect,
  shouldTrack,
  enqueueEffect,
} from './effect';

type EffectMap = Map<string | symbol, Set<Effect>>;
const targetMap = new WeakMap<object, EffectMap>();

export const ITERATE_KEY = Symbol();

export enum TriggerTypes {
  SET = 'set',
  ADD = 'add',
  DELETE = 'delete',
  CLEAR = 'clear',
}

export function track(target: object, key: string | symbol) {
  if (shouldTrack && activeEffect) {
    if (isArray(target)) {
      console.log('track', key);
    }

    let effectMap = targetMap.get(target);
    if (!effectMap) {
      targetMap.set(target, (effectMap = new Map()));
    }

    let effects = effectMap.get(key);
    if (!effects) {
      effectMap.set(key, (effects = new Set()));
    }

    effects.add(activeEffect);
  }
}

export function trigger(
  target: object,
  type: TriggerTypes,
  key: string | symbol,
  value: unknown
) {
  console.log('trigger', key);

  let effectMap = targetMap.get(target);
  if (!effectMap) {
    return;
  }

  let effectsToRun: Effect[] = [];
  const addEffects = (key: string | symbol) => {
    const effects = effectMap.get(key);

    if (effects) {
      effects.forEach((effect) => {
        if (effect.active) {
          effectsToRun.push(effect);
        } else {
          effects.delete(effect);
        }
      });

      if (effects.size === 0) {
        effectMap.delete(key);
      }
    }
  };

  addEffects(key);

  if (key === 'length' && isArray(target)) {
    const newLength = Number(value);

    for (const key of effectMap.keys()) {
      if (Number(key) >= newLength) {
        addEffects(key);
      }
    }
  } else {
    switch (type) {
      case TriggerTypes.ADD:
        if (!isArray(target)) {
          addEffects(ITERATE_KEY);
        } else if (isIndexKey(key)) {
          // new index added to array -> length changes
          addEffects('length');
        }
        break;

      case TriggerTypes.DELETE:
        if (!isArray(target)) {
          addEffects(ITERATE_KEY);
        }
        break;

      case TriggerTypes.SET:
        break;
    }
  }

  effectsToRun.forEach(enqueueEffect);
}
