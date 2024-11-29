import { isArray, isIndexKey } from 'vdom/shared/utils';
import {
  type Effect,
  activeEffect,
  shouldTrack,
  enqueueEffect,
} from './effect';
import { createDep, Dep } from './dep';

type DepMap = Map<string | symbol, Dep>;
const targetMap = new WeakMap<object, DepMap>();

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

    let depMap = targetMap.get(target);
    if (!depMap) {
      targetMap.set(target, (depMap = new Map()));
    }

    let dep = depMap.get(key);
    if (!dep) {
      dep = createDep(() => {
        depMap.delete(key);
      });
      depMap.set(key, dep);
    }

    dep.set(activeEffect, true);
  }
}

export function trigger(
  target: object,
  type: TriggerTypes,
  key: string | symbol,
  value: unknown
) {
  console.log('trigger', key);

  const depMap = targetMap.get(target);
  if (!depMap) {
    return;
  }

  const deps: (Dep | undefined)[] = [depMap.get(key)];
  if (key === 'length' && isArray(target)) {
    const newLength = Number(value);

    for (const key of depMap.keys()) {
      if (Number(key) >= newLength) {
        deps.push(depMap.get(key));
      }
    }
  } else {
    switch (type) {
      case TriggerTypes.ADD:
        if (!isArray(target)) {
          deps.push(depMap.get(ITERATE_KEY));
        } else if (isIndexKey(key)) {
          // new index added to array -> length changes
          deps.push(depMap.get('length'));
        }
        break;

      case TriggerTypes.DELETE:
        if (!isArray(target)) {
          deps.push(depMap.get(ITERATE_KEY));
        }
        break;

      case TriggerTypes.SET:
        break;
    }
  }

  const effectsToRun = new Set<Effect>();
  deps.forEach((dep) => {
    if (dep) {
      dep.forEach((used, effect) => {
        if (used) {
          effectsToRun.add(effect);
        }
      });
    }
  });
  effectsToRun.forEach(enqueueEffect);
}
