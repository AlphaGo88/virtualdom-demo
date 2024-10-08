import { JSX_ELEMENT_TYPE, JSX_FRAGMENT_TYPE } from 'shared/symbols';
import type { Key, Ref, Props, JSXElement } from 'shared/types';

const RESERVED_PROPS = {
  key: true,
  ref: true,
  __self: true,
  __source: true,
};

function hasValidRef(config: {}) {
  if (config.hasOwnProperty('ref')) {
    const ref = config['ref'];

    if (
      typeof ref === 'object' &&
      ref !== null &&
      ref.hasOwnProperty('value')
    ) {
      return true;
    }

    if (__DEV__) {
      console.error(
        'Invalid ref "%s". Fix this by using "useRef" instead',
        ref
      );
    }
  }

  return false;
}

export function createJSXElement(
  type: any,
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

export function jsx(type: any, config: {}, maybeKey: unknown) {
  const key = maybeKey == null ? null : '' + maybeKey;
  let ref: Ref<Element> | null = null;
  const props = {};

  if (hasValidRef(config)) {
    ref = config['ref'];
  }

  Object.keys(config).forEach((propName) => {
    if (!RESERVED_PROPS.hasOwnProperty(propName)) {
      props[propName] = config[propName];
    }
  });

  return createJSXElement(type, key, ref, props);
}

export function jsxDEV(
  type: any,
  config: {},
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

    Object.keys(config).forEach((propName) => {
      if (!RESERVED_PROPS.hasOwnProperty(propName)) {
        props[propName] = config[propName];
      }
    });

    return createJSXElement(type, key, ref, props);
  }
}

export { JSX_FRAGMENT_TYPE as Fragment };
