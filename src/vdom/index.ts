export namespace JSX {
  export const ELEMENT_TYPE = Symbol('jsx.element');

  export interface Element {
    $$typeof: Symbol;
    type: string | Component;
    props: Props;
  }

  export type Node = Element | number | string | boolean | null | undefined;
}

type DOMNode = Element | Text | DocumentFragment;

interface Props {
  [propName: string]: any;
  children?: JSX.Node[];
}

interface SetupFunc {
  (props: Props): () => JSX.Node;
}

interface ComponentInstance {
  props: Props;
  vnode: CompositeVNode | null;
  render: () => JSX.Node;
  receive: (props: Props) => boolean;
  onMount: (fn: Function) => void;
  onUpdate: (fn: Function) => void;
  onUnmount: (fn: Function) => void;
  triggerMount: () => void;
  triggerUpdate: () => void;
  unmount: () => void;
}

interface Component {
  new (props: Props): ComponentInstance;
}

interface Signal<T> {
  value: T;
  compInstance: ComponentInstance;
}

interface SignalGetter<T> {
  (): T;
}

interface SignalSetter<T> {
  (value: T | ((prev: T) => T)): T;
}

let currentSetupInstance: ComponentInstance | null = null;
const patchQueue: CompositeVNode[] = [];

/**
 * Jsx is transformed into h funcition
 * @param type
 * @param props
 * @param children
 * @returns
 */
export function h(
  type: string | Component,
  props: Props = {},
  ...children: JSX.Node[]
): JSX.Element {
  return {
    $$typeof: JSX.ELEMENT_TYPE,
    type,
    props: {
      ...props,
      children,
    },
  };
}

export const Fragment = 'jsx.fragment';

function isJSXElement(value: unknown) {
  return (
    typeof value === 'object' &&
    value !== null &&
    value['$$typeof'] === JSX.ELEMENT_TYPE
  );
}

/**
 *
 * @param setup - setup function returns a render function
 * @returns component constructor
 */
export function defineComponent(setup: SetupFunc) {
  class Component implements ComponentInstance {
    props: Props;
    vnode: CompositeVNode | null;
    private onMountCallbacks: Function[];
    private onUpdateCallbacks: Function[];
    private onUnmountCallbacks: Function[];
    private _render: () => JSX.Node;

    constructor(props: Props = {}) {
      this.props = props;
      this.vnode = null;
      this.onMountCallbacks = [];
      this.onUpdateCallbacks = [];
      this.onUnmountCallbacks = [];

      currentSetupInstance = this;
      this._render = setup(props);
      currentSetupInstance = null;
    }

    render() {
      return this._render();
    }

    receive(props: Props) {
      let changed = false;
      let oldValue: any, newValue: any;

      Object.keys(this.props).forEach((propName) => {
        oldValue = this.props[propName];
        newValue = props[propName];

        if (!Object.is(oldValue, newValue)) {
          changed = true;
          this.props[propName] = newValue;
        }
      });

      return changed;
    }

    onMount(fn: Function) {
      this.onMountCallbacks.push(fn);
    }

    onUpdate(fn: Function) {
      this.onUpdateCallbacks.push(fn);
    }

    onUnmount(fn: Function) {
      this.onUnmountCallbacks.push(fn);
    }

    triggerMount() {
      this.runCallbacks(this.onMountCallbacks);
    }

    triggerUpdate() {
      this.runCallbacks(this.onUpdateCallbacks);
    }

    unmount() {
      this.runCallbacks(this.onUnmountCallbacks);
    }

    private runCallbacks(callbacks: Function[]) {
      while (callbacks.length) {
        const fn = callbacks.shift()!;
        fn();
      }
    }
  }

  return Component;
}

function initVNode(element: JSX.Node) {
  if (
    isJSXElement(element) &&
    typeof (element as JSX.Element).type === 'function'
  ) {
    return new CompositeVNode(element as JSX.Element);
  }

  return new DOMVNode(element);
}

class CompositeVNode {
  element: JSX.Element;
  private renderedVNode: CompositeVNode | DOMVNode | null;
  private compInstance: ComponentInstance | null;

  constructor(element: JSX.Element) {
    this.element = element;
    this.renderedVNode = null;
    this.compInstance = null;
  }

  getDOMNode(): DOMNode {
    return this.renderedVNode!.getDOMNode();
  }

  mount(): DOMNode {
    const { type, props } = this.element;
    const compInstance = new (type as Component)(props);
    compInstance.vnode = this;
    this.compInstance = compInstance;

    const renderedVNode = initVNode(compInstance.render());
    this.renderedVNode = renderedVNode;

    const node = this.renderedVNode.mount();
    compInstance.triggerMount();

    return node;
  }

  unmount() {
    this.compInstance?.unmount();
    this.renderedVNode?.unmount();
  }

  receive(props: Props) {
    if (this.compInstance!.receive(props)) {
      this.element.props = props;
      this.patch();
    }
  }

  patch() {
    const compInstance = this.compInstance!;
    const renderedVNode = this.renderedVNode!;
    const renderedElement = renderedVNode.element;
    const node = renderedVNode.getDOMNode();
    const nextRenderedElement = compInstance.render();

    if (isNullElement(renderedElement) && isNullElement(nextRenderedElement)) {
      // nothing to do
    } else if (
      isTextElement(renderedElement) &&
      isTextElement(nextRenderedElement)
    ) {
      (renderedVNode as DOMVNode).element = nextRenderedElement;
      (node as Text).nodeValue = `${nextRenderedElement}`;
    } else if (isSameElementType(renderedElement, nextRenderedElement)) {
      renderedVNode.receive((nextRenderedElement as JSX.Element).props);
    } else {
      renderedVNode.unmount();

      const nextRenderedVNode = initVNode(nextRenderedElement);
      this.renderedVNode = nextRenderedVNode;

      const nextNode = nextRenderedVNode.mount();
      node.parentNode!.replaceChild(nextNode, node);
    }

    compInstance.triggerUpdate();
  }
}

class DOMVNode {
  element: JSX.Node;
  private renderedChildren: (CompositeVNode | DOMVNode)[];
  private node: DOMNode | null;

  constructor(element: JSX.Node) {
    this.element = element;
    this.renderedChildren = [];
    this.node = null;
  }

  getDOMNode() {
    return this.node!;
  }

  mount() {
    const element = this.element;
    let node: DOMNode;

    if (isNullElement(element)) {
      node = document.createDocumentFragment();
    } else if (isTextElement(element)) {
      const str = `${element}`;

      this.element = str;
      node = document.createTextNode(str);
    } else {
      const { type, props } = element as JSX.Element;
      const { children, ..._props } = props;

      if (type === Fragment) {
        node = document.createDocumentFragment();
      } else {
        node = document.createElement(type as string);
        updateNodeProps(node, _props);
      }

      const renderedChildren = (children ?? []).map(initVNode);
      this.renderedChildren = renderedChildren;

      // append child dom nodes
      const childNodes = renderedChildren.map((child) => child.mount());
      childNodes.forEach((childNode) => node.appendChild(childNode));
    }

    this.node = node;
    return node;
  }

  unmount() {
    this.node = null;
    this.renderedChildren.forEach((child) => child.unmount());
  }

  receive(nextProps: Props) {
    const element = this.element as JSX.Element;
    const { type, props } = element;

    element.props = nextProps;
    if (type !== Fragment) {
      updateNodeProps(this.node as Element, nextProps, props);
    }

    const children = props.children ?? [];
    const nextChildren = nextProps.children ?? [];
    const renderedChildren = this.renderedChildren;
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

      if (isNullElement(child) && isNullElement(nextChild)) {
        // nothing to do
      } else if (typeof child === 'string' && isTextElement(nextChild)) {
        const nextStr = `${nextChild}`;

        if (child !== nextStr) {
          renderedChild.element = nextStr;
          (node as Text).nodeValue = nextStr;
        }
      } else if (isSameElementType(child, nextChild)) {
        renderedChild.receive((nextChild as JSX.Element).props);
      } else {
        // now add new node or replace old node
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

    this.renderedChildren = nextRenderedChildren;
    const node = this.node!;

    while (opQueue.length > 0) {
      var op = opQueue.shift()!;

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

function isNullElement(element: JSX.Node) {
  return element === null || typeof element === 'boolean';
}

function isTextElement(element: JSX.Node) {
  return !isNullElement(element) && !isJSXElement(element);
}

function isSameElementType(prevElement: JSX.Node, nextElement: JSX.Node) {
  return (
    isJSXElement(prevElement) &&
    isJSXElement(nextElement) &&
    (prevElement as JSX.Element).type === (nextElement as JSX.Element).type
  );
}

function updateNodeProps(node: Element, props: Props, prevProps: Props = {}) {
  const tagName = node.tagName;
  const allPropNames = new Set([
    ...Object.keys(prevProps),
    ...Object.keys(props),
  ]);

  for (const propName of allPropNames.keys()) {
    const prevValue = prevProps[propName];
    const value = props[propName];

    if (propName === 'children' || Object.is(prevValue, value)) continue;

    if (propName === 'className') {
      node.className = value;
    } else if (isEventProp(propName)) {
      const type = propName.substring(2).toLowerCase();

      if (prevValue) {
        node.removeEventListener(type, prevValue);
      }
      if (value) {
        node.addEventListener(type, value);
      }
    } else if (tagName === 'TEXTAREA' && propName === 'value') {
      (node as HTMLTextAreaElement).innerText = value;
    } else if (tagName === 'INPUT' && propName === 'checked') {
      (node as HTMLInputElement).checked = value;
    } else if (['SELECT', 'INPUT'].includes(tagName) && propName === 'value') {
      (node as HTMLSelectElement | HTMLInputElement).value = value;
    } else {
      if (value === undefined) {
        node.removeAttribute(propName);
      } else {
        node.setAttribute(propName, value);
      }
    }
  }
}

function isEventProp(propName: string) {
  return propName.substring(0, 2) === 'on';
}

function enqueuePatch(vnode: CompositeVNode) {
  if (!patchQueue.includes(vnode)) {
    patchQueue.push(vnode);

    Promise.resolve().then(() => {
      while (patchQueue.length > 0) {
        patchQueue.shift()!.patch();
      }
    });
  }
}

export function createSignal<T>(initialValue: T) {
  if (!currentSetupInstance) {
    throw new Error('`createSignal` must be called in setup function');
  }

  const signal: Signal<T> = {
    value: initialValue,
    compInstance: currentSetupInstance,
  };

  const getter: SignalGetter<T> = () => {
    return signal.value;
  };

  const setter: SignalSetter<T> = (value) => {
    const newVal: T =
      typeof value === 'function' ? (value as Function)(signal.value) : value;

    if (!Object.is(newVal, signal.value)) {
      signal.value = newVal;

      const { vnode } = signal.compInstance;
      if (vnode) {
        enqueuePatch(vnode);
      }
    }
    return newVal;
  };

  return [getter, setter] as [SignalGetter<T>, SignalSetter<T>];
}

export function onMount(fn: Function) {
  if (!currentSetupInstance) {
    throw new Error('`onMount` must be called in setup function');
  }
  currentSetupInstance.onMount(fn);
}

export function onUpdate(fn: Function) {
  if (!currentSetupInstance) {
    throw new Error('`onUpdate` must be called in setup function');
  }
  currentSetupInstance.onUpdate(fn);
}

export function onUnmount(fn: Function) {
  if (!currentSetupInstance) {
    throw new Error('`onUnmount` must be called in setup function');
  }
  currentSetupInstance.onUnmount(fn);
}

export function unmount(containerNode: Element) {
  const node = containerNode.childNodes[0];

  if (node) {
    const rootVNode = node['_internalVNode'];

    if (rootVNode) {
      (rootVNode as CompositeVNode | DOMVNode).unmount();
    }
  }
  containerNode.innerHTML = '';
}

export function mount(element: JSX.Element, containerNode: HTMLElement) {
  unmount(containerNode);

  const rootVNode = initVNode(element);
  const node = rootVNode.mount();

  containerNode.appendChild(node);
  node['_internalVNode'] = rootVNode;
}

const vdom = {
  h,
  Fragment,
  defineComponent,
  createSignal,
  onMount,
  onUpdate,
  onUnmount,
  mount,
  unmount,
};

export default vdom;
