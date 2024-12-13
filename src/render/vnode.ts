import type {
  JSXNode,
  JSXPortal,
  JSXElement,
  JSXChildren,
} from 'vdom/shared/types';
import { hasOwn, isArray } from 'vdom/shared/utils';
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
  const { element, componentInstance, node, child } = vnode;
  if (componentInstance) {
    componentInstance.unmount();
  } else if (isJSXPortal(element)) {
    // dom nodes mounted to the portal container should be removed immediately.
    needRemove = true;
  } else if (isJSXElement(element)) {
    const { ref } = element as JSXElement;
    if (ref) {
      ref.value = null;
    }
  }

  if (child) {
    unmountChildren(vnode, needRemove && !node);
  }
  if (node) {
    needRemove && removeNode(node);
    vnode.node = null;
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
  } else {
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
  if (!isArray(children)) {
    children = [children];
  }
  let cur: VNode;
  let pre: VNode | null = null;
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
  vnode.child = null;
}

function updatePortalVNode(vnode: VNode, nextElement: JSXPortal) {
  const { container } = vnode.element as JSXPortal;
  const { children: nextChildren, container: nextContainer } = nextElement;
  if (container !== nextContainer) {
    // If the container is changed, we need to rebuild the portal.
    unmountChildren(vnode, true);
    vnode.element = nextElement;
    mountPortalVNode(vnode);
  } else {
    updateChildren(vnode, nextChildren, container);
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
      updateChildren(vnode, nextProps.children);
    } else {
      unmountChildren(vnode, true);
    }
  } else if (hasOwn(nextProps, 'children')) {
    mountChildren(
      vnode,
      nextProps.children,
      findHolderDOMNode(vnode),
      node ? null : findNextSiblingDOMNode(vnode)
    );
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
  parentVNode: VNode,
  nextChildren: JSXChildren,
  parentNode?: Element
) {
  if (!isArray(nextChildren)) {
    nextChildren = [nextChildren];
  }
  if (!parentNode) {
    parentNode = findHolderDOMNode(parentVNode);
  }

  const tailAnchor =
    parentVNode.node || isJSXPortal(parentVNode.element)
      ? null
      : findNextSiblingDOMNode(parentVNode);

  const tempArr: VNode[] = [];
  let cur = parentVNode.child;
  while (cur) {
    tempArr.push(cur);
    cur = cur.nextSibling;
  }

  let start = 0;
  let end = tempArr.length - 1;
  let nextStart = 0;
  let nextEnd = nextChildren.length - 1;

  while (start <= end && nextStart <= nextEnd) {
    if (isSameVNode(tempArr[start].element, nextChildren[nextStart])) {
      updateVNode(tempArr[start], nextChildren[nextStart]);
      start++;
      nextStart++;
    } else if (isSameVNode(tempArr[end].element, nextChildren[nextEnd])) {
      updateVNode(tempArr[end], nextChildren[nextEnd]);
      end--;
      nextEnd--;
    } else if (isSameVNode(tempArr[start].element, nextChildren[nextEnd])) {
      updateVNode(tempArr[start], nextChildren[nextEnd]);
      moveVNode(parentVNode, tempArr, start, end, parentNode, tailAnchor);
      end--;
      nextEnd--;
    } else if (isSameVNode(tempArr[end].element, nextChildren[nextStart])) {
      updateVNode(tempArr[end], nextChildren[nextStart]);
      moveVNode(parentVNode, tempArr, end, start, parentNode, tailAnchor);
      start++;
      nextStart++;
    } else {
      let matchedIndex = -1;
      for (let i = start + 1; i < end; i++) {
        if (isSameVNode(nextChildren[nextStart], tempArr[i].element)) {
          matchedIndex = i;
          break;
        }
      }

      if (matchedIndex !== -1) {
        updateVNode(tempArr[matchedIndex], nextChildren[nextStart]);
        moveVNode(
          parentVNode,
          tempArr,
          matchedIndex,
          start,
          parentNode,
          tailAnchor
        );
      } else {
        insertVNode(
          parentVNode,
          tempArr,
          start,
          createVNode(nextChildren[nextStart]),
          parentNode,
          tailAnchor
        );
        end++;
      }

      start++;
      nextStart++;
    }
  }

  if (start > end) {
    // now vnodes from `nextStart` to `nextEnd` should be added
    for (let i = nextStart; i <= nextEnd; i++) {
      insertVNode(
        parentVNode,
        tempArr,
        i,
        createVNode(nextChildren[i]),
        parentNode,
        tailAnchor
      );
    }
  } else if (nextStart > nextEnd && start <= end) {
    // now vnodes from `start` to `end` should be removed
    if (start === 0) {
      parentVNode.child = tempArr[end].nextSibling;
    } else {
      tempArr[start - 1].nextSibling = tempArr[end].nextSibling;
    }

    for (let i = start; i <= end; i++) {
      unmountVNode(tempArr[i], true);
    }
  }
}

function isSameVNode(prev: any, next: any) {
  return prev.key === next.key && isSameJSXType(prev, next);
}

function insertVNode(
  parentVNode: VNode,
  tempArr: VNode[],
  index: number,
  vnode: VNode,
  parentNode: Element,
  tailAnchor: Node | null
) {
  tempArr.splice(index, 0, vnode);
  if (index === 0) {
    parentVNode.child = vnode;
  } else {
    tempArr[index - 1].nextSibling = vnode;
  }
  vnode.nextSibling = tempArr[index + 1];
  mountVNode(
    vnode,
    parentNode,
    vnode.nextSibling ? findNextSiblingDOMNode(vnode) : tailAnchor
  );
}

function moveVNode(
  parentVNode: VNode,
  tempArr: VNode[],
  from: number,
  to: number,
  parentNode: Element,
  tailAnchor: Node | null
) {
  const vnode = tempArr[from];
  tempArr.splice(from, 1);
  if (from === 0) {
    parentVNode.child = vnode.nextSibling;
  } else {
    tempArr[from - 1].nextSibling = vnode.nextSibling;
  }

  tempArr.splice(to, 0, vnode);
  if (to === 0) {
    parentVNode.child = vnode;
  } else {
    tempArr[to - 1].nextSibling = vnode;
  }
  vnode.nextSibling = tempArr[to + 1];

  moveDOMNodeForVNode(
    vnode,
    parentNode,
    vnode.nextSibling ? findNextSiblingDOMNode(vnode) : tailAnchor
  );
}

function moveDOMNodeForVNode(
  vnode: VNode,
  parentNode: Element,
  anchor: Node | null
) {
  if (vnode.node) {
    insertNode(vnode.node, parentNode, anchor);
  } else {
    let child = vnode.child;
    while (child) {
      moveDOMNodeForVNode(child, parentNode, anchor);
      child = child.nextSibling;
    }
  }
}

function findHolderDOMNode(vnode: VNode): Element {
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
  // root vnode should have element node
  return vnode.node! as Element;
}

function findNextSiblingDOMNode(vnode: VNode) {
  let sibling = vnode.nextSibling;
  while (sibling) {
    const node = findDOMNode(sibling);
    if (node) {
      return node;
    }
    sibling = sibling.nextSibling;
  }

  let parent = vnode.parent;
  if (!parent || parent.node) {
    return null;
  }
  return findNextSiblingDOMNode(parent);
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
