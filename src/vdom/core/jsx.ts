import { JSX_ELEMENT_TYPE, JSX_FRAGMENT_TYPE } from 'shared/symbols';
import type { Key, Ref, JSXElement } from 'shared/types';

const RESERVED_PROPS = {
  key: true,
  ref: true,
  __self: true,
  __source: true,
};

function hasValidRef(config: object) {
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
  props: any
): JSXElement {
  const element = {
    $$typeof: JSX_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
  };

  console.log(element);
  return element;
}

export function jsx(type: any, config: object, maybeKey: unknown) {
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

    Object.keys(config).forEach((propName) => {
      if (!RESERVED_PROPS.hasOwnProperty(propName)) {
        props[propName] = config[propName];
      }
    });

    return createJSXElement(type, key, ref, props);
  }
}

export { JSX_FRAGMENT_TYPE as Fragment };
