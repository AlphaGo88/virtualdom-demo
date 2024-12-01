import { JSX_ELEMENT_TYPE } from 'vdom/shared/symbols';
import type { Key, Ref, Props, JSXElement } from 'vdom/shared/types';

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
