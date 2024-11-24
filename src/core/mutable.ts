import {
  isObject,
  isSymbol,
  isArray,
  isIndexKey,
  hasOwn,
  hasChanged,
} from 'shared/utils';
import { activeEffect, resumeTracking, stopTracking } from 'core/effect';
import { ITERATE_KEY, track, trigger, TriggerTypes } from 'core/mutableEffects';

const RAW = Symbol();
const proxyMap = new WeakMap<object, any>();

const arrayInstrumentations = createArrayInstrumentations();

function createArrayInstrumentations() {
  const instrumentations: Record<string, Function> = {};

  (['includes', 'indexOf', 'lastIndexOf'] as const).forEach((key) => {
    instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
      const arr = toRaw(this) as any;
      // we run the method using the original args first (which may be reactive)
      const res = arr[key](...args);

      if (res === -1 || res === false) {
        // if that didn't work, run it again using raw values.
        return arr[key](...args.map(toRaw));
      } else {
        return res;
      }
    };
  });

  // instrument length-altering mutation methods to avoid length being tracked
  // which leads to infinite loops in some cases
  (['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach((key) => {
    instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
      stopTracking();
      const res = (toRaw(this) as any)[key].apply(this, args);
      resumeTracking();
      return res;
    };
  });

  return instrumentations;
}

function isNonTrackableKey(key: unknown) {
  return isSymbol(key) || '__proto__' === key;
}

function toRaw(observed: any) {
  return observed?.[RAW] ?? observed;
}

function hasOwnProperty(this: object, key: unknown) {
  const obj = toRaw(this);

  if (!isNonTrackableKey(key)) {
    track(obj, String(key));
  }
  return obj.hasOwnProperty(key as PropertyKey);
}

// use this to create deep reactive objects.
export function useMutable<T extends object>(obj: T) {
  return createStore(obj);
}

export function useShallowMutable<T extends object>(obj: T) {
  return createStore(obj, false);
}

function createStore<T extends object>(obj: T, deep = true) {
  if (!isObject(obj)) {
    if (__DEV__) {
      console.error(`Can not create store on target: ${obj}.`);
    }
    return obj;
  }

  // if target is already a proxy, return it.
  if ((obj as any)[RAW]) {
    return obj;
  }

  const existedProxy = proxyMap.get(obj);
  if (existedProxy) {
    return existedProxy as T;
  }

  const proxy = new Proxy(obj, {
    get(target, key, receiver) {
      if (key === RAW) {
        return target;
      }

      if (isArray(target)) {
        console.log('get', key);
      }

      if (isArray(target) && hasOwn(arrayInstrumentations, key)) {
        return Reflect.get(arrayInstrumentations, key, receiver);
      }

      if (key === 'hasOwnProperty') {
        return hasOwnProperty;
      }

      const value = Reflect.get(target, key, receiver);

      if (isNonTrackableKey(key)) {
        return value;
      }

      if (activeEffect) {
        track(target, key);
      }

      if (deep && isObject(value)) {
        return createStore(value);
      }

      return value;
    },

    set(target, key, value, receiver) {
      value = toRaw(value);
      const oldValue = toRaw(target[key as keyof T]);

      if (isArray(target)) {
        console.log('set', key, value, oldValue);
      }

      const hadKey =
        isArray(target) && isIndexKey(key)
          ? Number(key) < target.length
          : hasOwn(target, key);
      const result = Reflect.set(target, key, value, receiver);

      if (proxy === receiver) {
        if (!hadKey) {
          trigger(target, TriggerTypes.ADD, key, value);
        } else if (hasChanged(value, oldValue)) {
          trigger(target, TriggerTypes.SET, key, value);
        }
      }
      return result;
    },

    has(target, key) {
      if (!isNonTrackableKey(key)) {
        track(target, key);
      }
      return Reflect.has(target, key);
    },

    deleteProperty(target, key) {
      if (isArray(target)) {
        console.log('delete', key);
      }

      const hadKey = hasOwn(target, key);
      const result = Reflect.deleteProperty(target, key);

      if (result && hadKey) {
        trigger(target, TriggerTypes.DELETE, key, undefined);
      }
      return result;
    },

    ownKeys(target) {
      track(target, isArray(target) ? 'length' : ITERATE_KEY);
      return Reflect.ownKeys(target);
    },
  });

  proxyMap.set(obj, proxy);
  return proxy;
}