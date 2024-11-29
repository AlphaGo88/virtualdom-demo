import { JSX_ELEMENT_TYPE, JSX_FRAGMENT_TYPE } from 'vdom/shared/symbols';
import type { Key, Ref, Props, JSXElement } from 'vdom/shared/types';
import { hasOwn, isPlainObject } from 'vdom/shared/utils';

const RESERVED_PROPS = {
  key: true,
  ref: true,
};

function hasValidRef(config: Props) {
  if (hasOwn(config, 'ref')) {
    const { ref } = config;

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
  ref: Ref<any> | null,
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

function jsx(type: unknown, config: Props, maybeKey: unknown) {
  const key = maybeKey == null ? null : '' + maybeKey;
  let ref: Ref<any> | null = null;
  const props: Props = {};

  if (hasValidRef(config)) {
    ref = config.ref;
  }

  Object.keys(config).forEach((name) => {
    if (!hasOwn(RESERVED_PROPS, name)) {
      props[name] = config[name];
    }
  });

  return createJSXElement(type, key, ref, props);
}

export * from './jsxIs';
export { jsx, jsx as jsxs, jsx as jsxDEV, JSX_FRAGMENT_TYPE as Fragment };
