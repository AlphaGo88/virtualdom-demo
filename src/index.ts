export * from 'vdom/dom/jsx';

export type {
  Key,
  Ref,
  Props,
  JSXPortal,
  JSXElement,
  JSXNode,
  JSXChildren,
} from 'vdom/shared/types';
export type { Root } from 'vdom/render/root';
export type { SetupFunction } from 'vdom/render/component';
export type { StateGetter, StateSetter } from 'vdom/reactivity/state';

export { createRoot } from 'vdom/render/root';
export { createPortal } from 'vdom/render/portal';
export { defineComponent } from 'vdom/render/component';
export { mergeProps } from 'vdom/render/componentProps';
export { onMount, onUnmount } from 'vdom/render/lifecycle';
export { useRef } from 'vdom/render/ref';
export { useState } from 'vdom/reactivity/state';
export { useMutable, useShallowMutable } from 'vdom/reactivity/mutable';
export { useEffect } from 'vdom/reactivity/effect';
