import type {
  JSXNode,
  JSXPortal,
  JSXElement,
  JSXChildren,
} from 'vdom/shared/types';
import { hasOwn, isArray, isString } from 'vdom/shared/utils';
import { setProps } from 'vdom/dom/setProps';
import {
  createElement,
  createText,
  insertNode,
  removeNode,
  setText,
} from 'vdom/dom/nodeOps';
import {
  isJSXEmpty,
  isJSXPortal,
  isJSXElement,
  isComponentType,
  isFragmentType,
  isSameJSXType,
} from './jsxIs';
import type { Component, ComponentInstance } from './component';
import { RenderEffect } from './renderEffect';

export interface VNode {
  element: JSXNode;

  // this is used if the vnode represents a component instance
  componentInstance: ComponentInstance | null;

  // this is used if the vnode represents a dom node
  node: Element | Text | null;

  parent: VNode | null;
  nextSibling: VNode | null;

  // child vnodes are organized as a linked list
  child: VNode | null;
}

export function createVNode(element: JSXNode): VNode {
  return {
    element,
    componentInstance: null,
    node: null,
    parent: null,
    nextSibling: null,
    child: null,
  };
}

export function mountVNode(
  vnode: VNode,
  parent: Element,
  anchor: Node | null = null
) {
  let { element } = vnode;

  if (isJSXEmpty(element)) {
    // do nothing
  } else if (isJSXPortal(element)) {
    mountPortalVNode(vnode);
  } else if (isJSXElement(element)) {
    if (isComponentType((element as JSXElement).type)) {
      mountComponentVNode(vnode, parent, anchor);
    } else {
      mountElementVNode(vnode, parent, anchor);
    }
  } else {
    // now treat the element as a text string
    mountTextVNode(vnode, parent, anchor);
  }
}

export function unmountVNode(vnode: VNode, needRemove: boolean) {
  const { element, componentInstance } = vnode;
  let needRemoveChildNodes: boolean;

  if (componentInstance) {
    componentInstance.unmount();
    needRemoveChildNodes = needRemove;
  } else if (isJSXPortal(element)) {
    // dom nodes mounted to the portal container should be removed immediately.
    needRemoveChildNodes = true;
  } else if (isJSXElement(element)) {
    const { ref } = element as JSXElement;
    if (ref) {
      ref.value = null;
    }
    needRemoveChildNodes = needRemove && !vnode.node;
  } else {
    // text vnode or empty vnode
    needRemoveChildNodes = false;
  }

  if (vnode.node) {
    needRemove && removeNode(vnode.node);
    vnode.node = null;
  }
  if (vnode.child) {
    unmountChildren(vnode, needRemoveChildNodes);
  }
}

export function updateVNode(vnode: VNode, nextElement: JSXNode) {
  if (vnode.componentInstance) {
    vnode.element = nextElement;
    // this will trigger render effect, and then update the child vnode
    vnode.componentInstance.receive((nextElement as JSXElement).props);
  } else if (isJSXEmpty(nextElement)) {
    // do nothing
  } else if (isJSXPortal(nextElement)) {
    updatePortalVNode(vnode, nextElement as JSXPortal);
  } else if (isJSXElement(nextElement)) {
    updateElementVNode(vnode, nextElement as JSXElement);
  } else {
    updateTextVNode(vnode, nextElement);
  }
}

function mountPortalVNode(vnode: VNode) {
  const { children, container } = vnode.element as JSXPortal;
  mountChildren(vnode, children, container);
}

function mountElementVNode(
  vnode: VNode,
  parent: Element,
  anchor: Node | null = null
) {
  const { type, ref, props } = vnode.element as JSXElement;

  if (isFragmentType(type)) {
    // for <>...</> or <Fragment>...</Fragment>
    if (hasOwn(props, 'children')) {
      mountChildren(vnode, props.children, parent, anchor);
    }
  } else if (isString(type)) {
    const node = createElement(type);
    vnode.node = node;
    if (ref) {
      ref.value = node;
    }
    setProps(node, props);
    if (hasOwn(props, 'children')) {
      mountChildren(vnode, props.children, node);
    }
    insertNode(node, parent, anchor);
  } else {
    // unknown type
    if (__DEV__) {
      console.error('Unknown element type %s.', type);
    }
    vnode.element = null;
  }
}

function mountComponentVNode(
  vnode: VNode,
  parent: Element,
  anchor: Node | null = null
) {
  const { type, ref, props } = vnode.element as JSXElement;
  const componentInstance = new (type as Component)(props, ref);
  vnode.componentInstance = componentInstance;

  const renderEffect = new RenderEffect(componentInstance, vnode);
  const renderedVNode = createVNode(renderEffect.run());
  vnode.child = renderedVNode;
  renderedVNode.parent = vnode;
  mountVNode(renderedVNode, parent, anchor);
  // trigger 'mount' after the dom node is created
  componentInstance.mount();
}

function mountTextVNode(
  vnode: VNode,
  parent: Element,
  anchor: Node | null = null
) {
  const text = '' + vnode.element;
  vnode.element = text;

  const node = createText(text);
  vnode.node = node;
  insertNode(node, parent, anchor);
}

export function mountChildren(
  vnode: VNode,
  children: JSXChildren,
  parentNode: Element,
  anchor: Node | null = null
) {
  let cur: VNode;
  let pre: VNode | null = null;

  if (!isArray(children)) {
    children = [children];
  }

  children.forEach((child) => {
    cur = createVNode(child);
    cur.parent = vnode;
    if (pre) {
      pre.nextSibling = cur;
    } else {
      vnode.child = cur;
    }
    mountVNode(cur, parentNode, anchor);
    pre = cur;
  });
}

function unmountChildren(vnode: VNode, needRemove: boolean) {
  let cur = vnode.child;
  while (cur) {
    unmountVNode(cur, needRemove);
    cur = cur.nextSibling;
  }
}

function updatePortalVNode(vnode: VNode, nextElement: JSXPortal) {
  const { children, container } = vnode.element as JSXPortal;
  const { children: nextChildren, container: nextContainer } = nextElement;

  if (container !== nextContainer) {
    // If the container is changed, we need to rebuild the portal.
    unmountChildren(vnode, true);
    vnode.element = nextElement;
    mountPortalVNode(vnode);
  } else {
    updateChildren(vnode, children, nextChildren, container);
  }
}

function updateElementVNode(vnode: VNode, nextElement: JSXElement) {
  const { element, node } = vnode;
  const { props } = element as JSXElement;
  const { props: nextProps } = nextElement;

  vnode.element = nextElement;
  if (node) {
    setProps(node as Element, nextProps, props);
  }

  if (hasOwn(props, 'children')) {
    if (hasOwn(nextProps, 'children')) {
      updateChildren(vnode, props.children, nextProps.children);
    } else {
      unmountChildren(vnode, true);
    }
  } else if (hasOwn(nextProps, 'children')) {
    mountChildren(vnode, nextProps.children, findParentDOMNode(vnode));
  }
}

function updateTextVNode(vnode: VNode, nextElement: JSXNode) {
  const text = '' + nextElement;
  if (vnode.element !== text) {
    vnode.element = text;
    setText(vnode.node as Text, text);
  }
}

export function updateChildren(
  vnode: VNode,
  children: JSXChildren,
  nextChildren: JSXChildren,
  parentNode?: Element
) {
  if (!parentNode) {
    parentNode = findParentDOMNode(vnode);
  }

  if (!isArray(children)) {
    children = [children];
  }
  if (!isArray(nextChildren)) {
    nextChildren = [nextChildren];
  }

  let cur: VNode | null = vnode.child;
  let pre: VNode | null = null;
  let i = 0;

  while (cur) {
    const child = children[i];
    const nextChild = nextChildren[i];

    if (i >= nextChildren.length) {
      // remove child if necessary
      if (i === nextChildren.length) {
        if (pre) {
          pre.nextSibling = null;
        } else {
          vnode.child = null;
        }
      }
      unmountVNode(cur, true);
    } else if (isSameJSXType(child, nextChild)) {
      updateVNode(cur, nextChild);
    } else {
      // now we need to replace
      const next = createVNode(nextChild);
      const nextSiblingDOMNode = findNextSiblingDOMNode(cur);
      next.parent = vnode;
      next.nextSibling = cur.nextSibling;
      if (pre) {
        pre.nextSibling = next;
      } else {
        vnode.child = next;
      }
      unmountVNode(cur, true);
      mountVNode(next, parentNode, nextSiblingDOMNode);
      cur = next;
    }

    pre = cur;
    cur = cur.nextSibling;
    i++;
  }

  // append new nodes
  while (i < nextChildren.length) {
    const next = createVNode(nextChildren[i]);
    next.parent = vnode;
    if (pre) {
      pre.nextSibling = next;
    } else {
      vnode.child = next;
    }
    mountVNode(next, parentNode);
    pre = next;
    i++;
  }
}

function findParentDOMNode(vnode: VNode): Element {
  while (vnode.parent) {
    const { element, node } = vnode;
    if (node) {
      return node as Element;
    }
    if (isJSXPortal(element)) {
      return (element as JSXPortal).container;
    }
    vnode = vnode.parent;
  }
  // root vnode should have an element node
  return vnode.node! as Element;
}

function findNextSiblingDOMNode(vnode: VNode): Node | null {
  if (vnode.node) {
    return vnode.node.nextSibling;
  }
  let sibling = vnode.nextSibling;
  while (sibling) {
    const node = findDOMNode(sibling);
    if (node) {
      return node;
    }
    sibling = sibling.nextSibling;
  }
  return null;
}

function findDOMNode(vnode: VNode): Node | null {
  if (vnode.node) {
    return vnode.node;
  }
  if (isJSXPortal(vnode.element)) {
    return null;
  }
  let child = vnode.child;
  while (child) {
    const node = findDOMNode(child);
    if (node) {
      return node;
    }
    child = child.nextSibling;
  }
  return null;
}

// function updateChildren(
//   vnode: VNode,
//   children: JSXChildren,
//   nextChildren: JSXChildren,
//   node: Element
// ) {
//   if (!isArray(children)) {
//     children = [children];
//   }
//   if (!isArray(nextChildren)) {
//     nextChildren = [nextChildren];
//   }

//   let cur: VNode | null = vnode.child;
//   let pre: VNode | null = null;
//   let i = 0;
//   let currentNodeIndex = 0;

//   while (cur) {
//     const child = children[i];
//     const nextChild = nextChildren[i];
//     const childNode = cur.getDOMNode();

//     if (i >= nextChildren.length) {
//       // remove child if necessary
//       cur.unmount();

//       if (i === nextChildren.length) {
//         if (pre) {
//           pre.nextSibling = null;
//         } else {
//           vnode.child = null;
//         }
//       }

//       if (childNode) {
//         node.removeChild(childNode);
//       }
//     } else if (isJSXEmpty(child) && isJSXEmpty(nextChild)) {
//       // do nothing
//     } else if (isSameJSXType(child, nextChild)) {
//       cur.update(nextChild);
//       if (childNode) {
//         currentNodeIndex++;
//       }
//     } else {
//       // now we need to replace the child
//       cur.unmount();

//       const next = new VNode(nextChild);
//       next.parent = vnode;
//       next.nextSibling = cur.nextSibling;

//       if (pre) {
//         pre.nextSibling = next;
//       } else {
//         vnode.child = next;
//       }

//       const nextChildNode = next.mount();
//       if (nextChildNode) {
//         if (childNode) {
//           node.replaceChild(nextChildNode, childNode);
//         } else {
//           if (currentNodeIndex >= node.childNodes.length) {
//             node.appendChild(nextChildNode);
//           } else {
//             node.insertBefore(nextChildNode, node.childNodes[currentNodeIndex]);
//           }
//         }
//         currentNodeIndex++;
//       } else if (childNode) {
//         node.removeChild(childNode);
//       }

//       cur = next;
//     }

//     pre = cur;
//     cur = cur.nextSibling;
//     i++;
//   }

//   // append new nodes
//   while (i < nextChildren.length) {
//     const next = new VNode(nextChildren[i]);
//     next.parent = vnode;

//     if (pre) {
//       pre.nextSibling = next;
//     } else {
//       vnode.child = next;
//     }

//     const nextChildNode = next.mount();
//     if (nextChildNode) {
//       node.appendChild(nextChildNode);
//     }

//     pre = next;
//     i++;
//   }
// }
