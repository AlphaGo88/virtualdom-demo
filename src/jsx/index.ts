import { createJSXElement } from 'vdom/render/jsxElement';
import { JSX_FRAGMENT_TYPE } from 'vdom/shared/symbols';
import type { Key, Ref, Props } from 'vdom/shared/types';
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

function jsx(type: unknown, config: Props, maybeKey: unknown) {
  const key: Key | null = maybeKey == null ? null : '' + maybeKey;
  const ref: Ref<any> | null = hasValidRef(config) ? config.ref : null;
  const props: Props = {};

  Object.keys(config).forEach((name) => {
    if (!hasOwn(RESERVED_PROPS, name)) {
      props[name] = config[name];
    }
  });
  return createJSXElement(type, key, ref, props);
}

export { jsx, jsx as jsxs, jsx as jsxDEV, JSX_FRAGMENT_TYPE as Fragment };
