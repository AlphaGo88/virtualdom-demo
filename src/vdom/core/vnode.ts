import {
  JSX_ELEMENT_TYPE,
  JSX_FRAGMENT_TYPE,
  JSX_PORTAL_TYPE,
} from '../shared/symbols';
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

function isJSXPortal(element: JSXNode) {
  return (
    isJSXElement(element) && (element as JSXElement).tag === JSX_PORTAL_TYPE
  );
}

function isSameJSXElementTag(prevElement: JSXNode, nextElement: JSXNode) {
  return (
    isJSXElement(prevElement) &&
    isJSXElement(nextElement) &&
    (prevElement as JSXElement).tag === (nextElement as JSXElement).tag
  );
}

export class VNode {
  element: JSXNode;
  private _compInstance: ComponentInstance | null;
  private _node: DOMNode | null;
  private _children: VNode | VNode[] | null;

  constructor(element: JSXNode) {
    this.element = element;

    // This is used only for component vnode.
    this._compInstance = null;

    // This is used only for dom vnode.
    this._node = null;

    this._children = null;
  }

  getDOMNode(): DOMNode | null {
    // for component vnode
    if (isJSXComponent(this.element)) {
      return (this._children as VNode).getDOMNode();
    }

    // for dom vnode
    return this._node;
  }

  mount(): DOMNode | null {
    const { element } = this;
    let node: DOMNode | null = null;

    if (isJSXNull(element)) {
      return null;
    }

    if (isJSXElement(element)) {
      const { tag, ref, props } = element as JSXElement;

      if (isJSXComponent(element)) {
        const compInstance = new (tag as Component)(props, ref);
        this._compInstance = compInstance;

        const childVNode = new VNode(compInstance.render());
        this._children = childVNode;

        node = childVNode.mount();
        compInstance.mount(this);
      } else {
        if (isJSXPortal(element)) {
          node = document.body;
        } else if (isJSXFragment(element)) {
          node = document.createDocumentFragment();
        } else {
          // Now it should be a html element.
          node = document.createElement(tag as string);

          if (ref) {
            ref.value = node;
          }
          updateDOMNodeAttrs(node, {}, props);
        }

        let childVNodes: VNode[] = [];

        if (Array.isArray(props.children)) {
          childVNodes = props.children.map((child) => new VNode(child));
        } else {
          childVNodes = [new VNode(props.children)];
        }
        this._children = childVNodes;

        // append child dom nodes
        childVNodes.forEach((childVNode) => {
          const childNode = childVNode.mount();

          if (childNode && !isJSXPortal(childVNode.element)) {
            node!.appendChild(childNode);
          }
        });
      }
    } else {
      // now treat the element as a text node
      const text = '' + element;

      this.element = text;
      node = document.createTextNode(text);
    }

    // don't set '_node' if we are in a component vnode
    if (!isJSXComponent(element)) {
      this._node = node;
    }
    return node;
  }

  unmount() {
    const { element, _compInstance, _node, _children } = this;

    if (_compInstance) {
      _compInstance.unmount();
      (_children as VNode).unmount();
    } else {
      if (isJSXElement(element)) {
        const { ref } = element as JSXElement;

        if (ref) {
          ref.value = null;
        }
      }

      // portal children are removed immediately
      if (_node?.parentNode === document.body) {
        document.body.removeChild(_node);
      }

      this._node = null;
      (_children as VNode[]).forEach((child) => child.unmount());
    }
  }

  receive(props: Props) {
    if (this._compInstance) {
      // When there is a component instance,
      // vnode.patch() will be called as the instance's effect.
      this._compInstance.receive(props);
    } else {
      this.patch(props);
    }
  }

  patch(nextProps: Props = {}) {
    const element = this.element as JSXElement;
    const compInstance = this._compInstance;

    let childVNodes: VNode[] = [];
    const nextChildVNodes: VNode[] = [];

    let childElements: JSXNode[] = [];
    let nextChildElements: JSXNode[] = [];

    const node = this.getDOMNode()!;

    if (compInstance) {
      const childVNode = this._children as VNode;

      element.props = compInstance.props;

      childVNodes = [childVNode];
      childElements = [childVNode.element];
      nextChildElements = [compInstance.render()];
    } else {
      const { props } = element;

      element.props = nextProps;

      childVNodes = this._children as VNode[];
      childElements = Array.isArray(props.children)
        ? props.children
        : [props.children];
      nextChildElements = Array.isArray(nextProps.children)
        ? nextProps.children
        : [nextProps.children];

      if (!isJSXPortal(element) && !isJSXFragment(element)) {
        updateDOMNodeAttrs(node as Element, props, nextProps);
      }
    }

    const len = Math.min(childElements.length, nextChildElements.length);
    let currentNodeIndex = 0;

    for (let i = 0; i < len; i++) {
      const childVNode = childVNodes[i];
      const childElement = childElements[i];
      const nextChildElement = nextChildElements[i];
      const childNode = childVNode.getDOMNode();

      let keepChild = true;

      if (isJSXNull(childElement) && isJSXNull(nextChildElement)) {
        // do nothing
      } else if (
        typeof childElement === 'string' &&
        isJSXText(nextChildElement)
      ) {
        const text = '' + nextChildElement;

        // update text node
        if (childElement !== text) {
          childVNode.element = text;
          (childNode as Text).nodeValue = text;
        }

        currentNodeIndex++;
      } else if (isSameJSXElementTag(childElement, nextChildElement)) {
        // same jsx element tag, apply new props
        childVNode.receive((nextChildElement as JSXElement).props);

        if (!isJSXPortal(childElement)) {
          currentNodeIndex++;
        }
      } else {
        // now we need to replace the child vnode
        keepChild = false;
        childVNode.unmount();

        const nextChildVNode = new VNode(nextChildElement);
        const nextChildNode = nextChildVNode.mount();

        if (childNode && !isJSXPortal(childElement)) {
          node.removeChild(childNode);
        }

        if (nextChildNode && !isJSXPortal(nextChildElement)) {
          if (currentNodeIndex >= node.childNodes.length) {
            node.appendChild(nextChildNode);
          } else {
            node.insertBefore(nextChildNode, node.childNodes[currentNodeIndex]);
          }

          currentNodeIndex++;
        }

        nextChildVNodes.push(nextChildVNode);
      }

      if (keepChild) {
        nextChildVNodes.push(childVNode);
      }
    }

    // remove nodes if necessary
    for (let j = nextChildElements.length; j < childElements.length; j++) {
      const childVNode = childVNodes[j];
      const childElement = childVNode.element;
      const childNode = childVNode.getDOMNode();

      childVNode.unmount();
      if (childNode && !isJSXPortal(childElement)) {
        node.removeChild(childNode);
      }
    }

    // append nodes if necessary
    for (let k = childElements.length; k < nextChildElements.length; k++) {
      const nextChildElement = nextChildElements[k];
      const nextChildVNode = new VNode(nextChildElement);
      const nextChildNode = nextChildVNode.mount();

      nextChildVNodes.push(nextChildVNode);
      if (nextChildNode && !isJSXPortal(nextChildElement)) {
        node.appendChild(nextChildNode);
      }
    }

    this._children = compInstance ? nextChildVNodes[0] : nextChildVNodes;
  }
}
