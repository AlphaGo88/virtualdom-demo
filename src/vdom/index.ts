const BOOL_ATTRS = [
  'autofocus',
  'autoplay',
  'controls',
  'disabled',
  'disablepictureinpicture',
  'disableremoteplayback',
  'hidden',
  'insert',
  'ismap',
  'loop',
  'multiple',
  'muted',
  'novalidate',
  'playsinline',
  'readonly',
  'required',
  'selected',
];

interface Ref<T> {
  value: T;
}

type DOMNodeRef = Ref<Element | null>;

interface Props {
  [propName: string]: any;
  children?: JSX.Node[];
}

interface Component {
  new (props: Props, ref?: Ref<Element | null>): ComponentInstance;
}

namespace JSX {
  export const ELEMENT_TYPE = Symbol('jsx.element');

  export interface Element {
    $$typeof: Symbol;
    type: string | Component;
    props: Props;
    ref?: DOMNodeRef;
  }

  export type Node = Element | number | string | boolean | null | undefined;
}

interface ComponentInstance {
  render: () => JSX.Node;
  addMountCallback: (fn: () => void) => void;
  addUnmountCallback: (fn: () => void) => void;
  addEffect: (effect: Effect) => void;
  mount: (vnode: CompositeVNode) => void;
  unmount: () => void;
  receive: (props: Props) => void;
  updateAsync: (stateId: Symbol) => void;
}

interface SetupFunc {
  (props: Props, ref?: Ref<Element | null>): () => JSX.Node;
}

interface State<T> {
  id: Symbol;
  value: T;
  compInstance: ComponentInstance;
}

interface StateGetter<T> {
  (): T;
}

interface StateSetter<T> {
  (value: T | ((prev: T) => T)): T;
}

type Dep = string | Symbol;

interface EffectFunc {
  (): void;
}

interface Effect {
  fn: EffectFunc;
  deps: Set<Dep>;
}

type DOMNode = Element | Text | DocumentFragment;

let currentSetupInstance: ComponentInstance | null = null;
let targetEffect: Effect | null = null;

const effectQueue: EffectFunc[] = [];

/**
 * Jsx is transformed into h funcition
 *
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
  const { ref, ..._props } = props;

  return {
    $$typeof: JSX.ELEMENT_TYPE,
    type,
    props: {
      ..._props,
      children,
    },
    ref,
  };
}

/**
 * Jsx fragment
 */
export const Fragment = 'jsx.fragment';

class BaseComponent implements ComponentInstance {
  protected _props: Props;
  private _vnode: CompositeVNode | null;
  private _mountCallbacks: EffectFunc[];
  private _unmountCallbacks: EffectFunc[];
  private _effects: Effect[];
  protected _render: () => JSX.Node;

  constructor(props: Props = {}) {
    this._props = new Proxy(props, {
      get: (target, propName) => {
        if (!target.hasOwnProperty(propName)) {
          return undefined;
        }

        // collect effect dependencies
        if (targetEffect) {
          targetEffect.deps.add(propName as string);
        }

        return target[propName as string];
      },
    });

    this._vnode = null;
    this._mountCallbacks = [];
    this._unmountCallbacks = [];
    this._effects = [
      {
        fn: () => {
          this._vnode?.patch();
        },
        deps: new Set<Dep>(),
      },
    ];
    this._render = () => null;
  }

  render() {
    // collect dependencies for vnode.patch() in render function
    targetEffect = this._effects[0];
    const renderedElement = this._render();

    targetEffect = null;
    return renderedElement;
  }

  addMountCallback(fn: EffectFunc) {
    this._mountCallbacks.push(fn);
  }

  addUnmountCallback(fn: EffectFunc) {
    this._unmountCallbacks.push(fn);
  }

  addEffect(effect: Effect) {
    this._effects.push(effect);
  }

  mount(vnode: CompositeVNode) {
    this._vnode = vnode;

    const callbacks = this._mountCallbacks;
    while (callbacks.length) {
      callbacks.shift()!();
    }

    // run effects created by `useEffect`
    this._effects.slice(1).forEach(({ fn }) => fn());
  }

  unmount() {
    this._vnode = null;

    const callbacks = this._unmountCallbacks;
    while (callbacks.length) {
      callbacks.shift()!();
    }
  }

  receive(props: Props) {
    const effectsToRun = new Set<EffectFunc>();

    Object.keys(this._props).forEach((propName) => {
      const oldValue = this._props[propName];
      const newValue = props[propName];

      if (!Object.is(oldValue, newValue)) {
        this._props[propName] = newValue;

        this._effects.forEach(({ fn, deps }) => {
          if (!effectsToRun.has(fn) && deps.has(propName)) {
            effectsToRun.add(fn);
          }
        });
      }
    });

    // run effects
    effectsToRun.forEach((fn) => fn());
  }

  // run effects asynchronously when a state changes
  updateAsync(stateId: Symbol) {
    this._effects.forEach(({ fn, deps }) => {
      if (deps.has(stateId)) {
        enqueueEffect(fn);
      }
    });
  }
}

/**
 * The standard way to define component
 *
 * @param setup - setup function returns a render function
 * @returns component constructor
 */
export function defineComponent(setup: SetupFunc) {
  class UserDefinedComponent extends BaseComponent {
    constructor(props: Props = {}, ref?: Ref<Element | null>) {
      super(props);

      currentSetupInstance = this;
      this._render = setup(this._props, ref);
      currentSetupInstance = null;
    }
  }

  return UserDefinedComponent;
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
  private _renderedVNode: CompositeVNode | DOMVNode | null;
  private _compInstance: ComponentInstance | null;

  constructor(element: JSX.Element) {
    this.element = element;
    this._renderedVNode = null;
    this._compInstance = null;
  }

  getDOMNode(): DOMNode {
    return this._renderedVNode!.getDOMNode();
  }

  mount(): DOMNode {
    const { type, props, ref } = this.element;
    const compInstance = new (type as Component)(props, ref);
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
    } else if (isSameJSXElementType(renderedElement, nextRenderedElement)) {
      renderedVNode.receive((nextRenderedElement as JSX.Element).props);
    } else {
      renderedVNode.unmount();

      const nextRenderedVNode = initVNode(nextRenderedElement);
      this._renderedVNode = nextRenderedVNode;

      const nextNode = nextRenderedVNode.mount();
      node.parentNode!.replaceChild(nextNode, node);
    }
  }
}

class DOMVNode {
  element: JSX.Node;
  private _renderedChildren: (CompositeVNode | DOMVNode)[];
  private _node: DOMNode | null;

  constructor(element: JSX.Node) {
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
      const { type, props, ref } = element as JSX.Element;

      if (type === Fragment) {
        node = document.createDocumentFragment();
      } else {
        node = document.createElement(type as string);
        if (ref) {
          ref.value = node;
        }
        updateDOMNodeAttrs(node, props);
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
      const { ref } = this.element as JSX.Element;

      if (ref) {
        ref.value = null;
      }
    }

    this._node = null;
    this._renderedChildren.forEach((child) => child.unmount());
  }

  receive(nextProps: Props) {
    const element = this.element as JSX.Element;
    const { type, props } = element;
    const node = this._node! as Element;

    element.props = nextProps;
    if (type !== Fragment) {
      updateDOMNodeAttrs(node, nextProps, props);
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
      } else if (isSameJSXElementType(child, nextChild)) {
        renderedChild.receive((nextChild as JSX.Element).props);
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

function isJSXElement(element: JSX.Node) {
  return (
    typeof element === 'object' &&
    element !== null &&
    element['$$typeof'] === JSX.ELEMENT_TYPE
  );
}

function isJSXNull(element: JSX.Node) {
  return element === null || typeof element === 'boolean';
}

function isJSXText(element: JSX.Node) {
  return !isJSXNull(element) && !isJSXElement(element);
}

function isSameJSXElementType(prevElement: JSX.Node, nextElement: JSX.Node) {
  return (
    isJSXElement(prevElement) &&
    isJSXElement(nextElement) &&
    (prevElement as JSX.Element).type === (nextElement as JSX.Element).type
  );
}

function updateDOMNodeAttrs(
  node: Element,
  nextProps: Props,
  prevProps: Props = {}
) {
  const tagName = node.tagName;
  const allPropNames = new Set([
    ...Object.keys(prevProps),
    ...Object.keys(nextProps),
  ]);

  for (const propName of allPropNames.keys()) {
    const prevValue = prevProps[propName];
    const nextValue = nextProps[propName];

    if (propName === 'children' || Object.is(prevValue, nextValue)) {
      continue;
    }

    if (isEventProp(propName)) {
      const eventType = propName.substring(2).toLowerCase();

      if (prevValue) {
        node.removeEventListener(eventType, prevValue);
      }
      if (nextValue) {
        node.addEventListener(eventType, nextValue);
      }
      continue;
    }

    let attr = propName.toLowerCase();

    if (attr === 'classname') {
      attr = 'class';
    } else if (attr === 'htmlfor') {
      attr = 'for';
    }

    if (attr === 'value' && ['SELECT', 'INPUT', 'TEXTAREA'].includes(tagName)) {
      (
        node as HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement
      ).value = nextValue;
      continue;
    }

    if (attr === 'checked' && tagName === 'INPUT') {
      (node as HTMLInputElement).checked = nextValue;
      continue;
    }

    // handle boolean attributes
    if (BOOL_ATTRS.includes(attr)) {
      if (nextValue === false) {
        node.removeAttribute(attr);
      } else {
        node.setAttribute(attr, '');
      }
      continue;
    }

    if (nextValue == undefined) {
      node.removeAttribute(attr);
    } else {
      node.setAttribute(attr, nextValue);
    }
  }
}

function isEventProp(propName: string) {
  return propName.substring(0, 2) === 'on';
}

function enqueueEffect(fn: EffectFunc) {
  if (!effectQueue.includes(fn)) {
    effectQueue.push(fn);

    Promise.resolve().then(() => {
      while (effectQueue.length > 0) {
        effectQueue.shift()!();
      }
    });
  }
}

export function useRef<T>(initialValue: T): Ref<T> {
  return { value: initialValue };
}

export function useState<T>(initialValue: T) {
  if (!currentSetupInstance) {
    throw new Error('`useState` must be called in setup function');
  }

  const state: State<T> = {
    id: Symbol(),
    value: initialValue,
    compInstance: currentSetupInstance,
  };

  const getter: StateGetter<T> = () => {
    if (targetEffect) {
      targetEffect.deps.add(state.id);
    }

    return state.value;
  };

  const setter: StateSetter<T> = (value) => {
    const newVal: T =
      typeof value === 'function'
        ? (value as (prev: T) => T)(state.value)
        : value;

    if (!Object.is(newVal, state.value)) {
      state.value = newVal;
      state.compInstance.updateAsync(state.id);
    }

    return newVal;
  };

  return [getter, setter] as [StateGetter<T>, StateSetter<T>];
}

export function useEffect(fn: EffectFunc) {
  if (!currentSetupInstance) {
    throw new Error('`useEffect` must be called in setup function');
  }

  const effect = {
    fn: () => {
      targetEffect = effect;
      fn();
      targetEffect = null;
    },
    deps: new Set<Dep>(),
  };

  currentSetupInstance.addEffect(effect);
}

export function onMount(fn: EffectFunc) {
  if (!currentSetupInstance) {
    throw new Error('`onMount` must be called in setup function');
  }

  currentSetupInstance.addMountCallback(fn);
}

export function onUnmount(fn: EffectFunc) {
  if (!currentSetupInstance) {
    throw new Error('`onUnmount` must be called in setup function');
  }

  currentSetupInstance.addUnmountCallback(fn);
}

function unmount(containerNode: HTMLElement) {
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
  useState,
  useEffect,
  onMount,
  onUnmount,
  mount,
};

export default vdom;
