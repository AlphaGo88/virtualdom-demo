import type { JSXElement } from './shared/types';
import { type CompositeVNode, type DOMVNode, initVNode } from './core/vnode';
import {
  defineComponent,
  useState,
  useEffect,
  onMount,
  onUnmount,
} from './core/component';

function unmount(containerNode: Element) {
  const node = containerNode.childNodes[0];

  if (node) {
    const rootVNode = node['_internalVNode'];

    if (rootVNode) {
      (rootVNode as CompositeVNode | DOMVNode).unmount();
    }
  }

  containerNode.innerHTML = '';
}

function mount(element: JSXElement, containerNode: Element) {
  unmount(containerNode);

  const rootVNode = initVNode(element);
  const node = rootVNode.mount();

  containerNode.appendChild(node);
  node['_internalVNode'] = rootVNode;
}

export { defineComponent, useState, useEffect, onMount, onUnmount, mount };
