import { Props } from 'vdom/shared/types';
import { isString, isPlainObject, hasChanged, hasOwn } from 'vdom/shared/utils';
import { type Effect, activeEffect } from 'vdom/reactivity/effect';
import { currentSetupInstance } from './component';

const RAW = Symbol();

type EffectMap = Map<string, Set<Effect>>;
const targetMap = new WeakMap<Props, EffectMap>();

function track(props: Props, key: string) {
  if (activeEffect) {
    let effectMap = targetMap.get(props);
    if (!effectMap) {
      targetMap.set(props, (effectMap = new Map()));
    }

    let effects = effectMap.get(key);
    if (!effects) {
      effectMap.set(key, (effects = new Set()));
    }

    effects.add(activeEffect);
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
  const effectMap = targetMap.get(toRaw(props));
  const effectsToRun = new Set<Effect>();

  Object.keys(nextProps).forEach((key) => {
    const oldVal = props[key];
    const newVal = nextProps[key];

    if (hasChanged(oldVal, newVal)) {
      internalWriteProps(props, key, newVal);
      effectMap?.get(key)?.forEach((effect) => effectsToRun.add(effect));
    }
  });

  // effects run immediately
  effectsToRun.forEach((effect) => effect.run());
}

export function mergeProps<P extends Props>(target: P, ...source: P[]) {
  if (__DEV__ && !currentSetupInstance) {
    console.error('"mergeProps" should not be called outside setup function.');
  }

  for (const src of source) {
    if (isPlainObject(src)) {
      Object.keys(src).forEach((key) => {
        if (target[key] === undefined) {
          internalWriteProps(target, key, src[key]);
        }
      });
    } else if (__DEV__) {
      console.error(`${src} can not be merged into props.`);
    }
  }
}
