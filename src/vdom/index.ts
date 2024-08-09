type Props = Record<string, any>;

export namespace JSX {
  export const ELEMENT_TYPE = Symbol('jsx.element');

  export interface Element {
    $$typeof: Symbol;
    type: string | Component;
    props: Props;
  }

  export type Node = Element | number | string | boolean | null | undefined;
}

type DOMNode = Element | Text | Comment;

interface ComponentInstance {
  props: Props;
  onMountCallbacks: Function[];
  onUnmountCallbacks: Function[];
  render: () => JSX.Node;
  triggerMount: () => void;
  unmount: () => void;
}

interface Component {
  new (props?: Props): ComponentInstance;
}

interface SetupFunc {
  (): (props: Props) => JSX.Node;
}

interface Signal<T> {
  value: T;
  listeners: Function[];
}

interface SignalGetter<T> {
  (): T;
}

interface SignalSetter<T> {
  (value: T | ((prev: T) => T)): T;
}

let currentTargetFn: Function | null = null;
let currentSetupInstance: ComponentInstance | null = null;
let patchQueue: CompositeVNode[] = [];

/**
 * Jsx is transformed into h funcition
 * @param type
 * @param props
 * @param children
 * @returns
 */
export function h(
  type: string | Component,
  props: Props | null,
  ...children: JSX.Node[]
): JSX.Element {
  return {
    $$typeof: JSX.ELEMENT_TYPE,
    type,
    props: {
      ...(props ?? {}),
      children,
    },
  };
}

function isJSXElement(value: unknown) {
  return (
    value !== null &&
    typeof value === 'object' &&
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
    declare props: Props;
    declare onMountCallbacks: Function[];
    declare onUnmountCallbacks: Function[];
    #render: (props: Props) => JSX.Node;

    constructor(props: Props = {}) {
      this.props = props;
      this.onMountCallbacks = [];
      this.onUnmountCallbacks = [];

      currentSetupInstance = this;
      this.#render = setup();
      currentSetupInstance = null;
    }

    render() {
      return this.#render(this.props);
    }

    triggerMount() {
      const callbacks = this.onMountCallbacks;

      this.onMountCallbacks = [];
      callbacks.forEach((cb) => cb());
    }

    unmount() {
      const callbacks = this.onUnmountCallbacks;

      this.onUnmountCallbacks = [];
      callbacks.forEach((cb) => cb());
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
  #element: JSX.Element;
  #renderedVNode: CompositeVNode | DOMVNode | null;
  #compInstance: ComponentInstance | null;
  #enqueuePatch: () => void;

  constructor(element: JSX.Element) {
    this.#element = element;
    this.#renderedVNode = null;
    this.#compInstance = null;
    this.#enqueuePatch = () => {
      enqueuePatch(this);
    };
  }

  get element() {
    return this.#element;
  }

  getDOMNode(): DOMNode | null {
    return this.#renderedVNode?.getDOMNode() ?? null;
  }

  mount(): DOMNode {
    const { type, props } = this.element;
    const compInstance = new (type as Component)(props);

    this.#compInstance = compInstance;
    currentTargetFn = this.#enqueuePatch;
    const renderedElement = compInstance.render();

    currentTargetFn = null;
    this.#renderedVNode = initVNode(renderedElement);

    const node = this.#renderedVNode.mount();
    compInstance.triggerMount();
    return node;
  }

  unmount() {
    this.#compInstance?.unmount();
    this.#renderedVNode?.unmount();
  }

  receive(props: Props) {
    this.element.props = props;
    this.#compInstance!.props = props;
    this.patch();
  }

  patch() {
    const compInstance = this.#compInstance!;
    const renderedVNode = this.#renderedVNode!;
    const renderedElement = renderedVNode.element;
    const node = renderedVNode.getDOMNode()!;
    const nextRenderedElement = compInstance.render();

    if (isNullElement(renderedElement) && isNullElement(nextRenderedElement)) {
      return;
    }

    if (isTextElement(renderedElement) && isTextElement(nextRenderedElement)) {
      (renderedVNode as DOMVNode).element = nextRenderedElement;
      (node as Text).nodeValue = `${nextRenderedElement}`;
      return;
    }

    if (isSameElementType(renderedElement, nextRenderedElement)) {
      renderedVNode.receive((nextRenderedElement as JSX.Element).props);
      return;
    }

    renderedVNode.unmount();
    const nextRenderedVNode = initVNode(nextRenderedElement);
    const nextNode = nextRenderedVNode.mount();

    this.#renderedVNode = nextRenderedVNode;
    node.parentNode!.replaceChild(nextNode, node);
  }
}

class DOMVNode {
  #element: JSX.Node;
  #renderedChildren: (CompositeVNode | DOMVNode)[];
  #node: DOMNode | null;

  constructor(element: JSX.Node) {
    this.#element = element;
    this.#renderedChildren = [];
    this.#node = null;
  }

  get element() {
    return this.#element;
  }

  set element(value: JSX.Node) {
    this.#element = value;
  }

  getDOMNode() {
    return this.#node;
  }

  mount() {
    const element = this.element;
    let node: DOMNode;

    if (isNullElement(element)) {
      node = document.createComment('');
    } else if (isTextElement(element)) {
      node = document.createTextNode(`${element}`);
    } else {
      const { type, props } = element as JSX.Element;
      const { children, ..._props } = props;

      node = document.createElement(type as string);
      updateNodeProps(node, _props);

      const renderedChildren = (children as JSX.Node[]).map(initVNode);
      this.#renderedChildren = renderedChildren;

      // append child dom nodes
      const childNodes = renderedChildren.map((child) => child.mount());
      childNodes.forEach((childNode) => node.appendChild(childNode));
    }

    this.#node = node;
    return node;
  }

  unmount() {
    this.#renderedChildren.forEach((child) => child.unmount());
  }

  receive(props: Props) {
    const element = this.element as JSX.Element;
    const prevProps = element.props;

    element.props = props;
    updateNodeProps(this.#node as Element, props, prevProps);

    const prevChildren = prevProps.children as JSX.Node[];
    const nextChildren = props.children as JSX.Node[];
    const prevRenderedChildren = this.#renderedChildren;
    const nextRenderedChildren: (CompositeVNode | DOMVNode)[] = [];
    const opQueue: {
      type: string;
      node: DOMNode;
      prevNode?: DOMNode;
    }[] = [];

    for (let i = 0; i < nextChildren.length; i++) {
      const prevChild = prevChildren[i];
      const nextChild = nextChildren[i];
      const prevRenderedChild = prevRenderedChildren[i];
      const prevNode = prevRenderedChild.getDOMNode()!;

      if (isNullElement(prevChild) && isNullElement(nextChild)) {
        nextRenderedChildren.push(prevRenderedChild);
        continue;
      }

      if (isTextElement(prevChild) && isTextElement(nextChild)) {
        (prevRenderedChild as DOMVNode).element = nextChild;
        (prevNode as Text).nodeValue = `${nextChild}`;
        nextRenderedChildren.push(prevRenderedChild);
        continue;
      }

      if (isSameElementType(prevChild, nextChild)) {
        prevRenderedChild.receive((nextChild as JSX.Element).props);
        nextRenderedChildren.push(prevRenderedChild);
        continue;
      }

      const nextRenderedChild = initVNode(nextChildren[i]);
      const node = nextRenderedChild.mount();

      if (prevRenderedChild) {
        prevRenderedChild.unmount();
        opQueue.push({ type: 'REPLACE', node, prevNode });
      } else {
        opQueue.push({ type: 'ADD', node });
      }
      nextRenderedChildren.push(nextRenderedChild);
    }

    for (let j = nextChildren.length; j < prevChildren.length; j++) {
      const prevRenderedChild = prevRenderedChildren[j];
      const node = prevRenderedChild.getDOMNode()!;

      prevRenderedChild.unmount();
      opQueue.push({ type: 'REMOVE', node });
    }

    this.#renderedChildren = nextRenderedChildren;
    const node = this.#node!;

    while (opQueue.length > 0) {
      var op = opQueue.shift()!;

      switch (op.type) {
        case 'ADD':
          node.appendChild(op.node);
          break;
        case 'REPLACE':
          node.replaceChild(op.node, op.prevNode as DOMNode);
          break;
        case 'REMOVE':
          node.removeChild(op.node);
          break;
      }
    }
  }
}

function isSameElementType(prevElement: JSX.Node, nextElement: JSX.Node) {
  return (
    isJSXElement(prevElement) &&
    isJSXElement(nextElement) &&
    (prevElement as JSX.Element).type === (nextElement as JSX.Element).type
  );
}

function isNullElement(element: JSX.Node) {
  return element === null || typeof element === 'boolean';
}

function isTextElement(element: JSX.Node) {
  return !isNullElement(element) && !isJSXElement(element);
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

    if (Object.is(prevValue, value)) continue;

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
  const signal: Signal<T> = {
    value: initialValue,
    listeners: [],
  };

  const getter: SignalGetter<T> = () => {
    if (currentTargetFn && !signal.listeners.includes(currentTargetFn)) {
      signal.listeners.push(currentTargetFn);
    }
    return signal.value;
  };

  const setter: SignalSetter<T> = (value) => {
    const newVal: T =
      typeof value === 'function' ? (value as Function)(signal.value) : value;

    if (!Object.is(newVal, signal.value)) {
      signal.value = newVal;
      signal.listeners.forEach((listener) => listener());
    }
    return newVal;
  };

  return [getter, setter] as [SignalGetter<T>, SignalSetter<T>];
}

export function onMount(fn: Function) {
  currentSetupInstance?.onMountCallbacks.push(fn);
}

export function onUnmount(fn: Function) {
  currentSetupInstance?.onUnmountCallbacks.push(fn);
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

export function mount(element: JSX.Element, containerNode: Element) {
  unmount(containerNode);

  const rootVNode = initVNode(element);
  const node = rootVNode.mount();

  containerNode.appendChild(node);
  node['_internalVNode'] = rootVNode;
}
