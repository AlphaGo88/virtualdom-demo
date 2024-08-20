import { JSX_ELEMENT_TYPE, JSX_FRAGMENT_TYPE } from '../shared/symbols';
import type { Props, JSXElement, JSXNode, DOMNode } from '../shared/types';
import type { Component, ComponentInstance } from './component';
import { updateDOMNodeAttrs } from '../dom';

function isJSXNull(element: JSXNode) {
  return element == null || typeof element === 'boolean';
}

function isJSXText(element: JSXNode) {
  return !isJSXNull(element) && !isJSXElement(element);
}

function isJSXElement(element: JSXNode) {
  return (
    typeof element === 'object' &&
    element !== null &&
    element['$$typeof'] === JSX_ELEMENT_TYPE
  );
}

function isJSXFragment(element: JSXNode) {
  return (
    isJSXElement(element) && (element as JSXElement).tag === JSX_FRAGMENT_TYPE
  );
}

function isSameJSXElementTag(prevElement: JSXNode, nextElement: JSXNode) {
  return (
    isJSXElement(prevElement) &&
    isJSXElement(nextElement) &&
    (prevElement as JSXElement).tag === (nextElement as JSXElement).tag
  );
}

export function initVNode(element: JSXNode) {
  if (
    isJSXElement(element) &&
    typeof (element as JSXElement).tag === 'function'
  ) {
    return new CompositeVNode(element as JSXElement);
  }

  return new DOMVNode(element);
}

export class CompositeVNode {
  element: JSXElement;
  private _renderedVNode: CompositeVNode | DOMVNode | null;
  private _compInstance: ComponentInstance | null;

  constructor(element: JSXElement) {
    this.element = element;
    this._renderedVNode = null;
    this._compInstance = null;
  }

  getDOMNode(): DOMNode {
    return this._renderedVNode!.getDOMNode();
  }

  mount(): DOMNode {
    const { tag, ref, props } = this.element;
    const compInstance = new (tag as Component)(props, ref);
    this._compInstance = compInstance;

    const renderedVNode = initVNode(compInstance.render());
    this._renderedVNode = renderedVNode;

    const node = renderedVNode.mount();
    compInstance.mount(this);

    return node;
  }

  unmount() {
    this._compInstance!.unmount();
    this._renderedVNode!.unmount();
  }

  receive(props: Props) {
    this.element.props = props;
    this._compInstance!.receive(props);
  }

  patch() {
    const compInstance = this._compInstance!;
    const renderedVNode = this._renderedVNode!;
    const renderedElement = renderedVNode.element;
    const node = renderedVNode.getDOMNode();
    const nextRenderedElement = compInstance.render();

    if (isJSXNull(renderedElement) && isJSXNull(nextRenderedElement)) {
      // nothing to do
    } else if (isJSXText(renderedElement) && isJSXText(nextRenderedElement)) {
      const nextStr = `${nextRenderedElement}`;

      if (renderedElement !== nextStr) {
        renderedVNode.element = nextStr;
        (node as Text).nodeValue = nextStr;
      }
    } else if (isSameJSXElementTag(renderedElement, nextRenderedElement)) {
      renderedVNode.receive((nextRenderedElement as JSXElement).props);
    } else {
      renderedVNode.unmount();

      const nextRenderedVNode = initVNode(nextRenderedElement);
      this._renderedVNode = nextRenderedVNode;

      const nextNode = nextRenderedVNode.mount();
      node.parentNode!.replaceChild(nextNode, node);
    }
  }
}

export class DOMVNode {
  element: JSXNode;
  private _renderedChildren: (CompositeVNode | DOMVNode)[];
  private _node: DOMNode | null;

  constructor(element: JSXNode) {
    this.element = element;
    this._renderedChildren = [];
    this._node = null;
  }

  getDOMNode() {
    return this._node!;
  }

  mount() {
    const element = this.element;
    let node: DOMNode;

    if (isJSXNull(element)) {
      node = document.createDocumentFragment();
    } else if (isJSXText(element)) {
      const str = `${element}`;

      this.element = str;
      node = document.createTextNode(str);
    } else {
      const { tag, ref, props } = element as JSXElement;

      if (isJSXFragment(element)) {
        node = document.createDocumentFragment();
      } else {
        node = document.createElement(tag as string);
        if (ref) {
          ref.value = node;
        }
        updateDOMNodeAttrs(node, {}, props);
      }

      const renderedChildren = (props.children ?? []).map(initVNode);
      this._renderedChildren = renderedChildren;

      // append child dom nodes
      const childNodes = renderedChildren.map((child) => child.mount());
      childNodes.forEach((childNode) => node.appendChild(childNode));
    }

    this._node = node;
    return node;
  }

  unmount() {
    if (isJSXElement(this.element)) {
      const { ref } = this.element as JSXElement;

      if (ref) {
        ref.value = null;
      }
    }

    this._node = null;
    this._renderedChildren.forEach((child) => child.unmount());
  }

  receive(nextProps: Props) {
    const element = this.element as JSXElement;
    const { props } = element;
    const node = this._node! as Element;

    element.props = nextProps;
    if (!isJSXFragment(element)) {
      updateDOMNodeAttrs(node, props, nextProps);
    }

    const children = props.children ?? [];
    const nextChildren = nextProps.children ?? [];
    const renderedChildren = this._renderedChildren;
    const nextRenderedChildren: (CompositeVNode | DOMVNode)[] = [];
    const opQueue: {
      type: string;
      nextNode?: DOMNode;
      prevNode?: DOMNode;
    }[] = [];

    for (let i = 0; i < nextChildren.length; i++) {
      const child = children[i];
      const nextChild = nextChildren[i];
      const renderedChild = renderedChildren[i];
      const node = renderedChild.getDOMNode();
      let keepChild = true;

      if (isJSXNull(child) && isJSXNull(nextChild)) {
        // nothing to do
      } else if (typeof child === 'string' && isJSXText(nextChild)) {
        const nextStr = `${nextChild}`;

        if (child !== nextStr) {
          renderedChild.element = nextStr;
          (node as Text).nodeValue = nextStr;
        }
      } else if (isSameJSXElementTag(child, nextChild)) {
        renderedChild.receive((nextChild as JSXElement).props);
      } else {
        // now replace old node or append new node
        keepChild = false;

        const nextRenderedChild = initVNode(nextChildren[i]);
        const nextNode = nextRenderedChild.mount();

        if (renderedChild) {
          renderedChild.unmount();
          opQueue.push({ type: 'REPLACE', nextNode, prevNode: node });
        } else {
          opQueue.push({ type: 'APPEND', nextNode });
        }

        nextRenderedChildren.push(nextRenderedChild);
      }

      if (keepChild) {
        nextRenderedChildren.push(renderedChild);
      }
    }

    for (let j = nextChildren.length; j < children.length; j++) {
      const renderedChild = renderedChildren[j];
      const node = renderedChild.getDOMNode();

      renderedChild.unmount();
      opQueue.push({ type: 'REMOVE', prevNode: node });
    }

    this._renderedChildren = nextRenderedChildren;

    while (opQueue.length > 0) {
      const op = opQueue.shift()!;

      switch (op.type) {
        case 'REPLACE':
          node.replaceChild(op.nextNode!, op.prevNode!);
          break;
        case 'APPEND':
          node.appendChild(op.nextNode!);
          break;
        case 'REMOVE':
          node.removeChild(op.prevNode!);
          break;
      }
    }
  }
}
