import type { JSXNode } from 'vdom/shared/types';
import { isValidContainer } from 'vdom/dom/domContainer';
import { createJSXElement } from 'vdom/render/jsxElement';
import { VNode } from './vnode';

export interface Root {
  containerEl: Element;
  render: (element: JSXNode) => void;
  unmount: () => void;
}

class VDOMRoot implements Root {
  containerEl: Element;
  private rootVNode: VNode | null = null;

  constructor(container: Element) {
    this.containerEl = container;
  }

  render(element: JSXNode) {
    let { containerEl, rootVNode } = this;
    if (!rootVNode) {
      const rootElement = createJSXElement('_vdom_root', null, null, {});
      rootVNode = new VNode(rootElement);
      rootVNode.node = containerEl;
      this.rootVNode = rootVNode;
    }

    if (rootVNode.child) {
      rootVNode.child.update(element);
    } else {
      const vnode = new VNode(element);
      rootVNode.child = vnode;
      vnode.parent = rootVNode;

      const node = vnode.mount();
      containerEl.innerHTML = '';
      if (node) {
        containerEl.appendChild(node);
      }
    }
  }

  unmount() {
    if (this.rootVNode) {
      this.rootVNode.unmount();
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
