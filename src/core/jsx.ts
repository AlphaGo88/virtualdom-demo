import { JSX_ELEMENT_TYPE, JSX_FRAGMENT_TYPE } from 'shared/symbols';
import type { Key, Ref, Props, JSXElement } from 'shared/types';
import { hasOwn, isPlainObject } from 'shared/utils';

const RESERVED_PROPS = {
  key: true,
  ref: true,
  __self: true,
  __source: true,
};

function hasValidRef(config: object) {
  if (hasOwn(config, 'ref')) {
    const ref = config['ref'];

    if (isPlainObject(ref) && hasOwn(ref, 'value')) {
      return true;
    }

    if (__DEV__) {
      console.error(`Invalid ref ${ref}. Fix this by using "useRef".`);
    }
  }

  return false;
}

export function createJSXElement(
  type: unknown,
  key: Key | null,
  ref: Ref<Element> | null,
  props: Props
): JSXElement {
  return {
    $$typeof: JSX_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
  };
}

export function jsx(type: unknown, config: object, maybeKey: unknown) {
  const key = maybeKey == null ? null : '' + maybeKey;
  let ref: Ref<Element> | null = null;
  const props = {};

  if (hasValidRef(config)) {
    ref = config['ref'];
  }

  Object.keys(config).forEach((name) => {
    if (!hasOwn(RESERVED_PROPS, name)) {
      props[name] = config[name];
    }
  });

  return createJSXElement(type, key, ref, props);
}

export function jsxDEV(
  type: unknown,
  config: object,
  maybeKey: unknown,
  source: unknown,
  self: unknown
) {
  if (__DEV__) {
    const key = maybeKey == null ? null : '' + maybeKey;
    let ref: Ref<Element> | null = null;
    const props = {};

    if (hasValidRef(config)) {
      ref = config['ref'];
    }

    Object.keys(config).forEach((name) => {
      if (!hasOwn(RESERVED_PROPS, name)) {
        props[name] = config[name];
      }
    });

    return createJSXElement(type, key, ref, props);
  }
}

export { JSX_FRAGMENT_TYPE as Fragment };
