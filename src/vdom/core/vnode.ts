import type { JSXNode, DOMNode, JSXElement } from 'shared/types';
import type { ComponentInstance } from 'core/component';
import { mountImpl, patchImpl, unmountImpl } from 'dom/vnodeImpl';

export class VNode {
  element: JSXNode;
  compInstance: ComponentInstance | null;
  node: DOMNode | null;
  children: VNode | VNode[] | null;

  constructor(element: JSXNode) {
    this.element = element;

    // This is only used when the vnode represents a component instance.
    this.compInstance = null;

    // This is only used when the vnode represents a dom element or dom text.
    this.node = null;

    // child vnodes
    this.children = null;
  }

  getDOMNode(): DOMNode | null {
    if (this.compInstance) {
      return (this.children as VNode).getDOMNode();
    }

    return this.node;
  }

  mount(): DOMNode | null {
    return mountImpl(this);
  }

  unmount() {
    unmountImpl(this);
  }

  /**
   * This is called when the vnode should update as a child vnode.
   * @param element
   */
  receive(element: JSXNode) {
    if (this.compInstance) {
      // If the component instance exists,
      // vnode.patch() will be called as the instance's effect.
      this.compInstance.receive((element as JSXElement).props);
    } else {
      this.patch(element);
    }
  }

  /**
   * This updates the vnode and the real dom node.
   * This is called when the vnode should update.
   * @param element
   */
  patch(element?: JSXNode) {
    patchImpl(this, element);
  }
}
