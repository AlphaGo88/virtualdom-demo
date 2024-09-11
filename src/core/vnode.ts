import type {
  JSXNode,
  JSXPortal,
  JSXElement,
  JSXChildren,
  DOMNode,
} from 'shared/types';
import {
  isJSXEmpty,
  isJSXPortal,
  isJSXElement,
  isComponentType,
  isFragmentType,
  isSameJSXType,
} from 'core/jsxIs';
import type { Component, ComponentInstance } from 'core/component';
import { updateNodeAttrs } from 'dom/attributeOperation';

export class VNode {
  element: JSXNode;

  // This is set when the vnode represents a component instance.
  compInstance: ComponentInstance | null;

  // This is set when the vnode represents a dom element or text.
  node: DOMNode | null;

  parent: VNode | null;
  nextSibling: VNode | null;

  // Child vnodes are organized as a linked list.
  child: VNode | null;

  constructor(element: JSXNode) {
    this.element = element;
    this.compInstance = null;
    this.node = null;
    this.parent = null;
    this.nextSibling = null;
    this.child = null;
  }

  getDOMNode(): DOMNode | null {
    return this.compInstance ? this.child!.getDOMNode() : this.node;
  }

  mount(): DOMNode | null {
    const vnode = this;
    const { element } = vnode;

    if (isJSXEmpty(element)) {
      return null;
    }

    if (isJSXPortal(element)) {
      return mountPortal(vnode, element as JSXPortal);
    }

    if (isJSXElement(element)) {
      const elem = element as JSXElement;
      const { type } = elem;

      if (isComponentType(type)) {
        return mountComponent(vnode, elem);
      }

      return mountElement(vnode, elem);
    }

    // now treat the element as text
    return mountText(vnode, element);
  }

  unmount() {
    const vnode = this;
    const { element } = vnode;

    if (isJSXEmpty(element)) {
      return;
    }

    if (isJSXPortal(element)) {
      return unmountPortal(vnode);
    }

    if (isJSXElement(element)) {
      const { type } = element as JSXElement;

      if (isComponentType(type)) {
        return unmountComponent(vnode);
      }

      return unmountElement(vnode);
    }

    return unmountText(vnode);
  }

  /**
   * This is called when the vnode should update as a child vnode.
   * @param element
   */
  receive(element: JSXNode) {
    if (this.compInstance) {
      // If the component instance exists,
      // vnode.patch() will be called as a effect.
      this.compInstance.receive((element as JSXElement).props);
    } else {
      this.patch(element);
    }
  }

  /**
   * This updates the vnode and the real dom node.
   * This is called when the vnode should update which
   * means 'nextElement' and vnode.element has the same type.
   * @param nextElement
   */
  patch(nextElement?: JSXNode) {
    const vnode = this;
    const { element } = vnode;

    if (isJSXPortal(element)) {
      return updatePortal(vnode, nextElement as JSXPortal);
    }

    if (isJSXElement(element)) {
      const { type } = element as JSXElement;

      if (isComponentType(type)) {
        return updateComponent(vnode);
      }

      return updateElement(vnode, nextElement as JSXElement);
    }

    return updateText(vnode, nextElement);
  }
}

function mountPortal(vnode: VNode, element: JSXPortal) {
  const { children, container } = element;

  mountChildren(vnode, children, container);
  return null;
}

function mountComponent(vnode: VNode, element: JSXElement) {
  const { type, ref, props } = element;
  const compInstance = new (type as Component)(props, ref);
  vnode.compInstance = compInstance;

  const childVNode = new VNode(compInstance.render());
  childVNode.parent = vnode;
  vnode.child = childVNode;

  const node = childVNode.mount();
  compInstance.mount(vnode);

  return node;
}

function mountElement(vnode: VNode, element: JSXElement) {
  const { type, ref, props } = element;
  let node: Element | DocumentFragment;

  if (isFragmentType(type)) {
    // for <>...</> or <Fragment>...</Fragment>
    node = document.createDocumentFragment();
  } else if (typeof type === 'string') {
    node = document.createElement(type);
    if (ref) {
      ref.value = node;
    }
    updateNodeAttrs(node, {}, props);
  } else {
    // unknown type
    if (__DEV__) {
      console.error(
        'Unknown element type "%s". You might have imported something which is not a component.',
        type
      );
    }
    vnode.element = null;
    return null;
  }

  vnode.node = node;
  if (props.hasOwnProperty('children')) {
    mountChildren(vnode, props.children, node);
  }

  return node;
}

function mountText(vnode: VNode, element: JSXNode) {
  const text = '' + element;
  vnode.element = text;

  const node = document.createTextNode(text);
  vnode.node = node;

  return node;
}

function mountChildren(
  vnode: VNode,
  children: JSXChildren,
  node: Element | DocumentFragment
) {
  const _children = Array.isArray(children) ? children : [children];
  let cur: VNode;
  let pre: VNode | null = null;

  _children.forEach((child) => {
    cur = new VNode(child);
    cur.parent = vnode;

    if (pre) {
      pre.nextSibling = cur;
    } else {
      vnode.child = cur;
    }

    const childNode = cur.mount();
    if (childNode) {
      node.appendChild(childNode);
    }

    pre = cur;
  });
}

function unmountPortal(vnode: VNode) {
  // Dom nodes mounted to the portal container are removed immediately.
  unmountChildren(vnode, true);
}

function unmountComponent(vnode: VNode) {
  vnode.compInstance?.unmount();
  unmountChildren(vnode);
}

function unmountElement(vnode: VNode) {
  // We don't remove the dom node here to avoid unnecessary 'removeChild'.
  // The dom node should be removed manually.
  vnode.node = null;
  unmountChildren(vnode);
}

function unmountText(vnode: VNode) {
  vnode.node = null;
}

function unmountChildren(vnode: VNode, removeDOMNode: boolean = false) {
  let cur = vnode.child;

  while (cur) {
    cur.unmount();

    if (removeDOMNode) {
      const childNode = cur.getDOMNode();

      if (childNode) {
        childNode.parentNode?.removeChild(childNode);
      }
    }

    cur = cur.nextSibling;
  }
}

function updatePortal(vnode: VNode, nextElement: JSXPortal) {
  const { children, container } = vnode.element as JSXPortal;
  const { children: nextChildren, container: nextContainer } = nextElement;

  if (container !== nextContainer) {
    // If the container is changed, we need to rebuild the portal.
    vnode.unmount();
    vnode.element = nextElement;
    vnode.mount();
  } else {
    updateChildren(vnode, children, nextChildren, container);
  }
}

function updateComponent(vnode: VNode) {
  const { element, compInstance } = vnode;
  (element as JSXElement).props = compInstance!.props;

  const childVNode = vnode.child!;
  const child = childVNode.element;
  const nextChild = compInstance!.render();

  if (isJSXEmpty(child) && isJSXEmpty(nextChild)) {
    // do nothing
  } else if (isSameJSXType(child, nextChild)) {
    childVNode.receive(nextChild);
  } else {
    // now we need to replace
    childVNode.unmount();

    const nextChildVNode = new VNode(nextChild);
    // No need to set 'nextSibling', it's always null.
    nextChildVNode.parent = vnode;
    vnode.child = nextChildVNode;

    const nextNode = nextChildVNode.mount();
    const node = vnode.getDOMNode();

    if (node) {
      if (nextNode) {
        node.parentNode?.replaceChild(nextNode, node);
      } else {
        node.parentNode?.removeChild(node);
      }
    } else if (nextNode) {
      // If the vnode has no dom node, we need to find
      // the dom parent and the next dom sibling so we can insert.
      let parent: VNode = vnode.parent!;
      let sibling: VNode | null = vnode.nextSibling;
      let parentNode: DOMNode;
      let nextSiblingNode: DOMNode | null = null;

      while (parent.compInstance) {
        sibling = parent.nextSibling;
        parent = parent.parent!;
      }

      while (sibling && !sibling.getDOMNode()) {
        sibling = sibling.nextSibling;
      }

      if (isJSXPortal(parent.element)) {
        parentNode = (parent.element as JSXPortal).container;
      } else {
        parentNode = parent.node!;
      }

      if (sibling) {
        nextSiblingNode = sibling.getDOMNode();
      }

      if (nextSiblingNode) {
        parentNode.insertBefore(nextNode, nextSiblingNode);
      } else {
        parentNode.appendChild(nextNode);
      }
    }
  }
}

function updateElement(vnode: VNode, nextElement: JSXElement) {
  const { props } = vnode.element as JSXElement;
  const { props: nextProps } = nextElement;
  const node = vnode.getDOMNode() as Element | DocumentFragment;

  vnode.element = nextElement;
  if (node.nodeType === Node.ELEMENT_NODE) {
    updateNodeAttrs(node as Element, props, nextProps);
  }

  if (props.hasOwnProperty('children')) {
    if (nextProps.hasOwnProperty('children')) {
      updateChildren(vnode, props.children, nextProps.children, node);
    } else {
      unmountChildren(vnode);
    }
  } else {
    if (nextProps.hasOwnProperty('children')) {
      mountChildren(vnode, nextProps.children, node);
    }
  }
}

function updateText(vnode: VNode, nextElement: JSXNode) {
  const nextText = '' + nextElement;

  if (vnode.element !== nextText) {
    vnode.element = nextText;
    (vnode.node as Text).nodeValue = nextText;
  }
}

function updateChildren(
  vnode: VNode,
  children: JSXChildren,
  nextChildren: JSXChildren,
  node: DOMNode
) {
  if (!Array.isArray(children)) {
    children = [children];
  }
  if (!Array.isArray(nextChildren)) {
    nextChildren = [nextChildren];
  }

  let cur: VNode | null = vnode.child;
  let pre: VNode | null = null;
  let i = 0;
  let currentNodeIndex = 0;

  while (cur) {
    const child = children[i];
    const nextChild = nextChildren[i];
    const childNode = cur.getDOMNode();

    if (i >= nextChildren.length) {
      // remove child if necessary
      cur.unmount();

      if (pre) {
        pre.nextSibling = cur.nextSibling;
      }
      if (childNode) {
        node.removeChild(childNode);
      }
    } else if (isJSXEmpty(child) && isJSXEmpty(nextChild)) {
      // do nothing
    } else if (isSameJSXType(child, nextChild)) {
      cur.receive(nextChild);

      if (childNode) {
        currentNodeIndex++;
      }
    } else {
      // now we need to replace the child
      cur.unmount();

      const next = new VNode(nextChild);
      next.parent = vnode;
      next.nextSibling = cur.nextSibling;

      if (pre) {
        pre.nextSibling = next;
      }

      const nextChildNode = next.mount();
      if (nextChildNode) {
        if (childNode) {
          node.replaceChild(nextChildNode, childNode);
        } else {
          if (currentNodeIndex >= node.childNodes.length) {
            node.appendChild(nextChildNode);
          } else {
            node.insertBefore(nextChildNode, node.childNodes[currentNodeIndex]);
          }
        }

        currentNodeIndex++;
      } else {
        if (childNode) {
          node.removeChild(childNode);
        }
      }
    }

    pre = cur;
    cur = cur.nextSibling;
    i++;
  }

  // append new nodes
  while (i < nextChildren.length) {
    const next = new VNode(nextChildren[i]);
    next.parent = vnode;
    if (pre) {
      pre.nextSibling = next;
    }

    const nextChildNode = next.mount();
    if (nextChildNode) {
      node.appendChild(nextChildNode);
    }

    pre = next;
  }
}
