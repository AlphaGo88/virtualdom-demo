import { JSX_ELEMENT_TYPE, JSX_FRAGMENT_TYPE } from 'shared/symbols';
import type {
  Key,
  DOMNodeRef,
  Props,
  JSXElementTag,
  JSXElement,
} from 'shared/types';

const RESERVED_PROPS = {
  key: true,
  ref: true,
  __self: true,
  __source: true,
};

function validateRef(ref: unknown) {
  const valid =
    typeof ref === 'object' && ref !== null && ref.hasOwnProperty('value');

  if (__DEV__ && !valid) {
    console.error('Invalid ref "%s", fix this by using "useRef" instead', ref);
  }
  return valid;
}

function createJSXElement(
  tag: JSXElementTag,
  key: Key | null,
  ref: DOMNodeRef | null,
  props: Props
): JSXElement {
  const element = {
    $$typeof: JSX_ELEMENT_TYPE,
    tag,
    key,
    ref,
    props,
  };

  console.log(element);
  return element;
}

export function jsx(type: JSXElementTag, config: Props, maybeKey: unknown) {
  const key = maybeKey == null ? null : '' + maybeKey;
  let ref: DOMNodeRef | null = null;
  const props: Props = {};

  if (config.ref != null) {
    if (validateRef(config.ref)) {
      ref = config.ref;
    }
  }

  Object.keys(config).forEach((propName) => {
    if (!RESERVED_PROPS.hasOwnProperty(propName)) {
      props[propName] = config[propName];
    }
  });

  return createJSXElement(type, key, ref, props);
}

export function jsxDEV(
  type: JSXElementTag,
  config: Props,
  maybeKey: unknown,
  source: any,
  self: any
) {
  if (__DEV__) {
    const key = maybeKey == null ? null : '' + maybeKey;
    let ref: DOMNodeRef | null = null;
    const props: Props = {};

    if (config.ref != null) {
      if (validateRef(config.ref)) {
        ref = config.ref;
      }
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
