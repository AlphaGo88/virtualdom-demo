import type {
  JSXNode,
  JSXPortal,
  JSXElement,
  JSXChildren,
  DOMNode,
} from 'vdom/shared/types';
import { hasOwn, isArray, isString } from 'vdom/shared/utils';
import {
  isJSXEmpty,
  isJSXPortal,
  isJSXElement,
  isComponentType,
  isFragmentType,
  isSameJSXType,
} from 'vdom/jsx';
import { updateNodeAttrs } from 'vdom/dom/attributeOperation';
import { ReactiveEffect } from 'vdom/reactivity/effect';
import type { Component, ComponentInstance } from './component';

export class VNode {
  element: JSXNode;

  // this is used when the vnode represents a component instance
  compInstance: ComponentInstance | null = null;

  // this is used when the vnode represents a dom node
  node: DOMNode | null = null;

  parent: VNode | null = null;
  nextSibling: VNode | null = null;

  // child vnodes are organized as a linked list
  child: VNode | null = null;

  constructor(element: JSXNode) {
    this.element = element;
  }

  getDOMNode(): DOMNode | null {
    return this.compInstance ? this.child!.getDOMNode() : this.node;
  }

  mount(): DOMNode | null {
    const vnode = this;
    let { element } = vnode;

    if (isJSXEmpty(element)) {
      return null;
    }

    if (isJSXPortal(element)) {
      return mountPortal(vnode, element as JSXPortal);
    }

    if (isJSXElement(element)) {
      element = element as JSXElement;
      const { type } = element;

      if (isComponentType(type)) {
        return mountComponent(vnode, element);
      }

      return mountElement(vnode, element);
    }

    // now treat the element as a text string
    return mountText(vnode, element);
  }

  unmount() {
    const vnode = this;
    const { element, compInstance } = vnode;

    vnode.parent = null;
    vnode.node = null;

    if (compInstance) {
      compInstance.unmount();
    } else if (isJSXPortal(element)) {
      // dom nodes mounted to the portal container are removed immediately
      unmountChildren(vnode, true);
    } else if (isJSXElement(element)) {
      // we don't remove the dom node here to avoid unnecessary 'removeChild'
      unmountChildren(vnode);
    }
  }

  /**
   * This is called when the vnode should update.
   * @param nextElement
   */
  update(nextElement: JSXNode) {
    const vnode = this;
    const { element, compInstance } = vnode;

    if (compInstance) {
      vnode.element = nextElement;
      // this will trigger update effect if necessary.
      compInstance.receive((nextElement as JSXElement).props);
    } else if (isJSXPortal(element)) {
      updatePortal(vnode, nextElement as JSXPortal);
    } else if (isJSXElement(element)) {
      updateElement(vnode, nextElement as JSXElement);
    } else {
      updateText(vnode, nextElement);
    }
  }
}

function mountPortal(vnode: VNode, element: JSXPortal) {
  const { children, container } = element;

  mountChildren(vnode, children, container);
  return null;
}

function mountElement(vnode: VNode, element: JSXElement) {
  const { type, ref, props } = element;
  let node: Element | DocumentFragment | null = null;

  if (isFragmentType(type)) {
    // for <>...</> or <Fragment>...</Fragment>
    node = document.createDocumentFragment();
  } else if (isString(type)) {
    node = document.createElement(type);
    if (ref) {
      ref.value = node;
    }
    updateNodeAttrs(node, {}, props);
  } else {
    // unknown type
    if (__DEV__) {
      console.error(`Unknown element type "${type}".`);
    }
    vnode.element = null;
  }

  vnode.node = node;
  if (node && hasOwn(props, 'children')) {
    mountChildren(vnode, props.children, node);
  }
  return node;
}

function mountComponent(vnode: VNode, element: JSXElement) {
  const { type, ref, props } = element;
  const compInstance = new (type as Component)(props, ref);
  vnode.compInstance = compInstance;

  let renderedElement: JSXNode;
  const updateEffect = new ReactiveEffect(() => {
    renderedElement = compInstance.render();
    if (vnode.child) {
      updateComponent(vnode, renderedElement);
    }
  });
  compInstance.addUnmountCallback(() => updateEffect.cleanup());
  updateEffect.run();

  const childVNode = new VNode(renderedElement);
  vnode.child = childVNode;
  childVNode.parent = vnode;

  const node = childVNode.mount();
  // trigger 'mount' after the dom node is created
  compInstance.mount();

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
  let cur: VNode;
  let pre: VNode | null = null;

  if (!isArray(children)) {
    children = [children];
  }

  children.forEach((child) => {
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

function unmountChildren(vnode: VNode, removeDOMNode: boolean = false) {
  let cur = vnode.child;

  while (cur) {
    const node = cur.getDOMNode();

    cur.unmount();
    if (removeDOMNode) {
      node?.parentNode?.removeChild(node);
    }
    cur = cur.nextSibling;
  }
}

function updatePortal(vnode: VNode, nextElement: JSXPortal) {
  const { children, container } = vnode.element as JSXPortal;
  const { children: nextChildren, container: nextContainer } = nextElement;

  if (container !== nextContainer) {
    // If the container is changed, we need to rebuild the portal.
    unmountChildren(vnode, true);
    vnode.element = nextElement;
    vnode.mount();
  } else {
    updateChildren(vnode, children, nextChildren, container);
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

  if (hasOwn(props, 'children')) {
    if (hasOwn(nextProps, 'children')) {
      updateChildren(vnode, props.children, nextProps.children, node);
    } else {
      unmountChildren(vnode);
    }
  } else if (hasOwn(nextProps, 'children')) {
    mountChildren(vnode, nextProps.children, node);
  }
}

function updateComponent(vnode: VNode, nextRenderedElement: JSXNode) {
  const childVNode = vnode.child!;
  const child = childVNode.element;
  const nextChild = nextRenderedElement;

  if (isJSXEmpty(child) && isJSXEmpty(nextChild)) {
    // do nothing
  } else if (isSameJSXType(child, nextChild)) {
    childVNode.update(nextChild);
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
  if (!isArray(children)) {
    children = [children];
  }
  if (!isArray(nextChildren)) {
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

      if (i === nextChildren.length) {
        if (pre) {
          pre.nextSibling = null;
        } else {
          vnode.child = null;
        }
      }

      if (childNode) {
        node.removeChild(childNode);
      }
    } else if (isJSXEmpty(child) && isJSXEmpty(nextChild)) {
      // do nothing
    } else if (isSameJSXType(child, nextChild)) {
      cur.update(nextChild);

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
      } else {
        vnode.child = next;
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
      } else if (childNode) {
        node.removeChild(childNode);
      }

      cur = next;
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
    } else {
      vnode.child = next;
    }

    const nextChildNode = next.mount();
    if (nextChildNode) {
      node.appendChild(nextChildNode);
    }

    pre = next;
    i++;
  }
}
