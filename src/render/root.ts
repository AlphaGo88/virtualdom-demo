import type { JSXNode } from 'vdom/shared/types';
import { isValidContainer } from 'vdom/dom/domContainer';
import { createJSXElement } from './jsxElement';
import {
  type VNode,
  createVNode,
  mountVNode,
  unmountVNode,
  updateVNode,
} from './vnode';

export interface Root {
  render: (element: JSXNode) => void;
  unmount: () => void;
}

class VDOMRoot implements Root {
  private containerEl: Element;
  private rootVNode: VNode | null = null;

  constructor(container: Element) {
    this.containerEl = container;
  }

  render(element: JSXNode) {
    let { containerEl, rootVNode } = this;

    if (!rootVNode) {
      const rootElement = createJSXElement('_vdom_root', null, null, {});

      rootVNode = createVNode(rootElement);
      rootVNode.node = containerEl;
      this.rootVNode = rootVNode;
    }

    if (rootVNode.child) {
      updateVNode(rootVNode.child, element);
    } else {
      const vnode = createVNode(element);

      rootVNode.child = vnode;
      vnode.parent = rootVNode;
      containerEl.innerHTML = '';
      mountVNode(vnode, containerEl);
    }
  }

  unmount() {
    if (this.rootVNode) {
      unmountVNode(this.rootVNode, false);
      this.containerEl.innerHTML = '';
      this.rootVNode = null;
    }
  }
}

export function createRoot(container: Element) {
  if (!isValidContainer(container)) {
    throw new Error('Target container is not a DOM element.');
  }
  return new VDOMRoot(container);
}
