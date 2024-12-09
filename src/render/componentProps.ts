import { Props } from 'vdom/shared/types';
import { isString, isPlainObject, hasChanged, hasOwn } from 'vdom/shared/utils';
import { type Effect, activeEffect } from 'vdom/reactivity/effect';
import { type Dep, createDep } from 'vdom/reactivity/dep';
import { currentSetupInstance } from './component';

const RAW = Symbol();

type DepMap = Map<string, Dep>;
const targetMap = new WeakMap<Props, DepMap>();

function track(props: Props, key: string) {
  if (activeEffect) {
    let depMap = targetMap.get(props);
    if (!depMap) {
      targetMap.set(props, (depMap = new Map()));
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

export function wrapProps(props: Props) {
  return new Proxy(props, {
    get(target, key, receiver) {
      if (key === RAW) {
        return target;
      }
      if (isString(key) && hasOwn(target, key)) {
        track(target, key);
      }
      return Reflect.get(target, key, receiver);
    },

    set() {
      if (__DEV__) {
        console.error('Props can not be mutated directly.');
      }
      return true;
    },

    defineProperty() {
      if (__DEV__) {
        console.error('Props is not configurable.');
      }
      return true;
    },

    deleteProperty() {
      if (__DEV__) {
        console.error('Props can not be mutated directly.');
      }
      return true;
    },
  });
}

function toRaw(observed: any) {
  return observed?.[RAW] ?? observed;
}

function internalWriteProps(props: Props, key: string, value: unknown) {
  const raw = toRaw(props);
  raw[key] = value;
}

export function updateProps(props: Props, nextProps: Props) {
  const depMap = targetMap.get(toRaw(props));
  const effectsToRun = new Set<Effect>();

  Object.keys(nextProps).forEach((key) => {
    const oldVal = props[key];
    const newVal = nextProps[key];

    if (hasChanged(oldVal, newVal)) {
      internalWriteProps(props, key, newVal);
      depMap?.get(key)?.forEach((used, effect) => {
        if (used) {
          effectsToRun.add(effect);
        }
      });
    }
  });

  // run effects
  effectsToRun.forEach((effect) => effect.run());
}

export function mergeProps<P extends Props>(
  target: P,
  ...source: Partial<P>[]
) {
  if (__DEV__) {
    if (!currentSetupInstance) {
      console.error(
        '"mergeProps" should not be called outside setup function.'
      );
    }
    if (activeEffect) {
      console.error(
        '"mergeProps" should not be called inside render function or "useEffect".'
      );
    }
  }

  for (const src of source) {
    if (isPlainObject(src)) {
      Object.keys(src).forEach((key) => {
        if (target[key] === undefined) {
          internalWriteProps(target, key, src[key]);
        }
      });
    } else if (__DEV__) {
      console.error(
        'Unexpected argument %s received when calling "mergeProps". Expected an object.',
        src
      );
    }
  }
}
