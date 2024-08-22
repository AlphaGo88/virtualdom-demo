import type { JSXNode } from './shared/types';
import { VNode } from './core/vnode';
import {
  defineComponent,
  useState,
  useEffect,
  onMount,
  onUnmount,
} from './core/component';
import { createPortal } from './core/portal';

function unmount(containerNode: Element) {
  const node = containerNode.childNodes[0];

  if (node) {
    const rootVNode = node['_internalVNode'];

    if (rootVNode) {
      (rootVNode as VNode).unmount();
    }
  }

  containerNode.innerHTML = '';
}

function mount(element: JSXNode, containerNode: Element) {
  unmount(containerNode);

  const rootVNode = new VNode(element);
  const node = rootVNode.mount();

  if (node) {
    containerNode.appendChild(node);
    node['_internalVNode'] = rootVNode;
  }
}

export {
  createPortal,
  defineComponent,
  useState,
  useEffect,
  onMount,
  onUnmount,
  mount,
};
