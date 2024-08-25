import {
  JSX_ELEMENT_TYPE,
  JSX_FRAGMENT_TYPE,
  JSX_PORTAL_TYPE,
} from 'shared/symbols';
import type {
  JSXPortal,
  JSXElement,
  JSXNode,
  JSXChildren,
  DOMNode,
} from 'shared/types';
import type { Component } from 'core/component';
import { VNode } from 'core/vnode';
import { updateNodeAttrs } from 'dom/attributeOperation';

function isJSXNull(element: JSXNode) {
  return element == null || typeof element === 'boolean';
}

function isJSXText(element: JSXNode) {
  return !isJSXNull(element) && !isJSXPortal(element) && !isJSXElement(element);
}

function isJSXPortal(element: JSXNode) {
  return (
    typeof element === 'object' &&
    element !== null &&
    element['$$typeof'] === JSX_PORTAL_TYPE
  );
}

function isJSXElement(element: JSXNode) {
  return (
    typeof element === 'object' &&
    element !== null &&
    element['$$typeof'] === JSX_ELEMENT_TYPE
  );
}

function isJSXComponent(element: JSXNode) {
  return (
    isJSXElement(element) && typeof (element as JSXElement).tag === 'function'
  );
}

function isJSXFragment(element: JSXNode) {
  return (
    isJSXElement(element) && (element as JSXElement).tag === JSX_FRAGMENT_TYPE
  );
}

function isSameJSXType(prevElement: JSXNode, nextElement: JSXNode) {
  if (isJSXPortal(prevElement) && isJSXPortal(nextElement)) {
    return true;
  }

  if (
    isJSXElement(prevElement) &&
    isJSXElement(nextElement) &&
    (prevElement as JSXElement).tag === (nextElement as JSXElement).tag
  ) {
    return true;
  }

  if (isJSXText(prevElement) && isJSXText(nextElement)) {
    return true;
  }

  return false;
}

function mountChildren(
  vnode: VNode,
  children: JSXChildren,
  node: Element | DocumentFragment
) {
  let childVNodes: VNode[] = [];

  if (Array.isArray(children)) {
    childVNodes = children.map((child) => new VNode(child));
  } else {
    childVNodes = [new VNode(children)];
  }

  vnode.children = childVNodes;

  // append child dom nodes
  childVNodes.forEach((childVNode) => {
    const childNode = childVNode.mount();

    if (childNode) {
      node.appendChild(childNode);
    }
  });
}

function patchChildren(
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

  const childVNodes = Array.isArray(vnode.children)
    ? (vnode.children as VNode[])
    : [vnode.children as VNode];
  const nextChildVNodes: VNode[] = [];

  const len = Math.min(children.length, nextChildren.length);
  let currentNodeIndex = 0;

  for (let i = 0; i < len; i++) {
    const child = children[i];
    const nextChild = nextChildren[i];
    const childVNode = childVNodes[i];
    const childNode = childVNode.getDOMNode();
    let replace = false;

    if (isJSXNull(child) && isJSXNull(nextChild)) {
      // do nothing
    } else if (isSameJSXType(child, nextChild)) {
      childVNode.receive(nextChild);

      if (childNode) {
        currentNodeIndex++;
      }
    } else {
      // now we need to replace the child
      replace = true;

      childVNode.unmount();
      if (childNode) {
        childNode.parentNode!.removeChild(childNode);
      }

      const nextChildVNode = new VNode(nextChild);
      const nextChildNode = nextChildVNode.mount();

      if (nextChildNode) {
        if (currentNodeIndex >= node.childNodes.length) {
          node.appendChild(nextChildNode);
        } else {
          node.insertBefore(nextChildNode, node.childNodes[currentNodeIndex]);
        }
        currentNodeIndex++;
      }

      nextChildVNodes.push(nextChildVNode);
    }

    if (!replace) {
      nextChildVNodes.push(childVNode);
    }
  }

  // remove nodes if necessary
  for (let j = nextChildren.length; j < children.length; j++) {
    const childVNode = childVNodes[j];
    const childNode = childVNode.getDOMNode();

    childVNode.unmount();
    if (childNode) {
      childNode.parentNode!.removeChild(childNode);
    }
  }

  // append nodes if necessary
  for (let k = children.length; k < nextChildren.length; k++) {
    const nextChild = nextChildren[k];
    const nextChildVNode = new VNode(nextChild);
    const nextChildNode = nextChildVNode.mount();

    nextChildVNodes.push(nextChildVNode);
    if (nextChildNode) {
      node.appendChild(nextChildNode);
    }
  }

  vnode.children = vnode.compInstance ? nextChildVNodes[0] : nextChildVNodes;
}

export function mountImpl(vnode: VNode): DOMNode | null {
  const { element } = vnode;

  if (isJSXNull(element)) {
    return null;
  }

  if (isJSXPortal(element)) {
    const { children, container } = element as JSXPortal;

    mountChildren(vnode, children, container);
    return null;
  }

  let node: DOMNode | null;

  if (isJSXElement(element)) {
    const { tag, ref, props } = element as JSXElement;

    if (isJSXComponent(element)) {
      const compInstance = new (tag as Component)(props, ref);
      vnode.compInstance = compInstance;

      const childVNode = new VNode(compInstance.render());
      vnode.children = childVNode;

      node = childVNode.mount();

      // run life cycle 'mount'
      compInstance.mount(vnode);
    } else {
      if (isJSXFragment(element)) {
        // for <>...</> or <Fragment>...</Fragment>
        node = document.createDocumentFragment();
      } else {
        node = document.createElement(tag as string);

        if (ref) {
          ref.value = node;
        }
        updateNodeAttrs(node, {}, props);
      }

      vnode.node = node;
      mountChildren(vnode, props.children, node);
    }
  } else {
    // now treat the element as a text node
    const text = '' + element;

    vnode.element = text;
    node = document.createTextNode(text);
    vnode.node = node;
  }

  return node;
}

export function unmountImpl(vnode: VNode) {
  const { element, compInstance, children } = vnode;

  if (compInstance) {
    // run life cycle 'unmount'
    compInstance.unmount();

    (children as VNode).unmount();
  } else {
    const isPortal = isJSXPortal(element);

    if (!isPortal && isJSXElement(element)) {
      const { ref } = element as JSXElement;

      if (ref) {
        ref.value = null;
      }
    }

    // We don't remove the dom node here to avoid unnecessary 'removeChild' calls on child nodes.
    // The dom node should be removed manually.
    vnode.node = null;

    // unmount children
    (children as VNode[]).forEach((child) => {
      child.unmount();

      if (isPortal) {
        const childNode = child.getDOMNode();

        if (childNode) {
          // If the vnode represents a portal,
          // the child nodes are removed immediately from the container node.
          childNode.parentNode!.removeChild(childNode);
        }
      }
    });
  }
}

export function patchImpl(vnode: VNode, nextElement: JSXNode) {
  const { element, compInstance } = vnode;

  if (typeof element === 'string') {
    const text = '' + nextElement;

    if (element !== text) {
      vnode.element = text;
      (vnode.node as Text).nodeValue = text;
    }
    return;
  }

  if (isJSXPortal(element)) {
    const { children, container } = element as JSXPortal;
    const { children: nextChildren, container: nextContainer } =
      nextElement as JSXPortal;

    if (container !== nextContainer) {
      // If the container is changed, we need to rebuild the vnode.
      unmountImpl(vnode);
      vnode.element = nextElement;
      mountImpl(vnode);
    } else {
      patchChildren(vnode, children, nextChildren, container);
    }
    return;
  }

  if (compInstance) {
    const childVNode = vnode.children as VNode;
    const children = childVNode.element;
    const nextChildren = compInstance.render();
    const node = vnode.getDOMNode()!;

    (element as JSXElement).props = compInstance.props;
    patchChildren(vnode, children, nextChildren, node);
    return;
  }

  const { props } = element as JSXElement;
  const { props: nextProps } = nextElement as JSXElement;
  const node = vnode.getDOMNode()!;

  vnode.element = nextElement;
  if (!isJSXFragment(element)) {
    updateNodeAttrs(node as Element, props, nextProps);
  }
  patchChildren(vnode, props.children, nextProps.children, node);
}
