const COMPONENT_TYPE = Symbol('component');
const VNODE_TYPE = Symbol('vnode');

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

interface VNode extends JSX.Element {
  element: ComponentInstance | Element | Text | Comment;
  parent: VNode | null;
  childNodes: VNode[];
}

interface ComponentInstance {
  $$typeof: Symbol;
  props: Props;
  vnode: VNode | null;
  _renderToJSXNode: (props: Props) => JSX.Node;
  renderToJSXNode: () => JSX.Node;
  render: () => void;
  patch: () => void;
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

let Target: Function | null = null;
const patchQueue: ComponentInstance[] = [];

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

function isJSXElement(value: any) {
  return value?.$$typeof === JSX.ELEMENT_TYPE;
}

/**
 *
 * @param setup - setup function returns a render function
 * @returns component constructor
 */
export function defineComponent(setup: SetupFunc) {
  class Component implements ComponentInstance {
    declare $$typeof: Symbol;
    declare props: Props;
    declare vnode: VNode | null;
    declare _renderToJSXNode: (props: Props) => JSX.Node;

    constructor(props?: Props) {
      this.$$typeof = COMPONENT_TYPE;
      this.props = props ?? {};
      this.vnode = null;
      this._renderToJSXNode = setup.call(this);
    }
    renderToJSXNode() {
      Target = this.render.bind(this);
      const jsxNode = this._renderToJSXNode(this.props);
      Target = null;
      return jsxNode;
    }
    render() {
      enqueuePatch(this);
    }
    patch() {
      if (this.vnode) {
        patch(this.renderToJSXNode(), this.vnode.childNodes[0], this.vnode);
      }
    }
    unmount() {}
  }
  return Component;
}

function isComponent(value: any) {
  return value?.$$typeof === COMPONENT_TYPE;
}

function enqueuePatch(component: ComponentInstance) {
  if (!patchQueue.includes(component)) {
    patchQueue.push(component);

    Promise.resolve().then(() => {
      const pq = patchQueue.slice();

      patchQueue.splice(0, patchQueue.length);
      pq.forEach((c) => c.patch());
    });
  }
}

function patch(jsxNode: JSX.Node, vnode: VNode, parent: VNode) {
  if (!isJSXElement(jsxNode)) {
    if (
      (jsxNode == null || typeof jsxNode === 'boolean') &&
      vnode.type === 'null'
    ) {
      // nothing to do
    } else if (
      jsxNode != null &&
      typeof jsxNode !== 'boolean' &&
      vnode.type === 'text'
    ) {
      const text = `${jsxNode}`;

      if (vnode.props.text !== text) {
        vnode.props.text = text;
        (vnode.element as Text).nodeValue = text;
      }
    } else {
      replaceVNode(createVNodeFromJSXNode(jsxNode), vnode, parent);
    }
  } else {
    const { type, props } = jsxNode as JSX.Element;

    if (type === vnode.type) {
      if (typeof type === 'function') {
        const component = vnode.element as ComponentInstance;

        component.props = props;
        patch(component.renderToJSXNode(), vnode.childNodes[0], vnode);
      } else {
        const { childNodes } = vnode;
        const { children, ...rest } = props;

        patchDOMProps(rest, vnode);
        for (let i = 0; i < Math.max(children.length, childNodes.length); i++) {
          if (i >= children.length) {
            removeVNode(childNodes[i], parent);
          } else if (i >= childNodes.length) {
            appendVNode(createVNodeFromJSXNode(children[i]), parent);
          } else {
            patch(children[i], childNodes[i], vnode);
          }
        }
      }
    } else {
      replaceVNode(createVNodeFromJSXNode(jsxNode), vnode, parent);
    }
  }
}

function patchDOMProps(props: Props, vnode: VNode) {
  const el = vnode.element as Element;
  const tagName = el.tagName;
  const oldProps = vnode.props;
  const allKeys = new Set([...Object.keys(oldProps), ...Object.keys(props)]);

  for (const key of allKeys.keys()) {
    const nv = props[key];
    const ov = oldProps[key];

    if (nv != ov) {
      if (key === 'className') {
        el.className = nv;
      } else if (isEventProp(key)) {
        const type = key.substring(2).toLowerCase();

        el.removeEventListener(type, ov);
        el.addEventListener(type, nv);
      } else if (tagName === 'TEXTAREA' && key === 'value') {
        (el as HTMLTextAreaElement).innerText = nv;
      } else if (tagName === 'INPUT' && key === 'checked') {
        (el as HTMLInputElement).checked = nv;
      } else if (['SELECT', 'INPUT'].includes(tagName) && key === 'value') {
        (el as HTMLSelectElement | HTMLInputElement).value = nv;
      } else {
        if (nv == undefined) {
          el.removeAttribute(key);
        } else {
          el.setAttribute(key, nv);
        }
      }
    }
  }
  vnode.props = props;
}

function isEventProp(propName: string) {
  return propName.substring(0, 2) === 'on';
}

function createVNode(
  type: string | Component,
  element: ComponentInstance | Element | Text | Comment,
  props?: Props
) {
  return {
    $$typeof: VNODE_TYPE,
    type,
    element,
    props: props ?? {},
    parent: null,
    childNodes: [],
  } as VNode;
}

function createVNodeFromJSXNode(jsxNode: JSX.Node) {
  if (jsxNode == null || typeof jsxNode === 'boolean') {
    return createVNode('null', document.createComment(''));
  }
  if (!isJSXElement(jsxNode)) {
    const text = `${jsxNode}`;
    return createVNode('text', document.createTextNode(text), { text });
  }

  let vnode: VNode;
  const { type, props } = jsxNode as JSX.Element;
  const { children, ..._props } = props;

  if (typeof type === 'function') {
    const component = new type(props);

    vnode = createVNode(type, component);
    component.vnode = vnode;
    appendVNode(createVNodeFromJSXNode(component.renderToJSXNode()), vnode);
  } else {
    // html element node
    vnode = createVNode(type, document.createElement(type));
    patchDOMProps(_props, vnode);
    (children as JSX.Node[]).forEach((child) => {
      appendVNode(createVNodeFromJSXNode(child), vnode);
    });
  }
  return vnode;
}

function appendVNode(vnode: VNode, parent: VNode) {
  const el = findDOMElement(vnode);
  const parentEl = findDOMElement(parent, true);

  vnode.parent = parent;
  parent.childNodes.push(vnode);
  if (parentEl && el) {
    parentEl.appendChild(el);
  }
}

function removeVNode(vnode: VNode, parent: VNode) {
  const el = findDOMElement(vnode);
  const parentEl = findDOMElement(parent, true);

  vnode.parent = null;
  parent.childNodes.splice(parent.childNodes.indexOf(vnode), 1);
  if (parentEl && el) {
    parentEl.removeChild(el);
  }
  unmountComponentAtVNode(vnode);
}

function replaceVNode(vnode: VNode, oldVNode: VNode, parent: VNode) {
  const el = findDOMElement(vnode);
  const oldEl = findDOMElement(oldVNode);
  const parentEl = findDOMElement(parent, true);

  vnode.parent = parent;
  oldVNode.parent = null;
  parent.childNodes.splice(parent.childNodes.indexOf(oldVNode), 1, vnode);
  if (parentEl && el && oldEl) {
    parentEl.replaceChild(el, oldEl);
  }
  unmountComponentAtVNode(oldVNode);
}

function unmountComponentAtVNode(vnode: VNode) {
  if (typeof vnode.type === 'function') {
    (vnode.element as ComponentInstance).unmount();
  }
  vnode.childNodes.forEach((child) => unmountComponentAtVNode(child));
}

function findDOMElement(node: VNode, up: boolean = false) {
  let ptr: VNode | null = node;

  if (up) {
    while (ptr && isComponent(ptr.element)) {
      ptr = ptr.parent;
    }
    return ptr ? (ptr.element as Element) : null;
  }

  while (ptr && isComponent(ptr.element)) {
    ptr = ptr.childNodes[0];
  }
  return ptr ? (ptr.element as Element | Text | Comment) : null;
}

export function createSignal<T>(initialValue: T) {
  const signal: Signal<T> = {
    value: initialValue,
    listeners: [],
  };
  const getter: SignalGetter<T> = () => {
    if (Target && !signal.listeners.includes(Target)) {
      signal.listeners.push(Target);
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

export function createApp(App: Component) {
  const appComponent = new App();

  return {
    mount(selector: string) {
      const container = document.querySelector(selector);

      if (!container || container.nodeType !== Node.ELEMENT_NODE) {
        throw new Error(`Can't mount app to ${container}`);
      }
      container.innerHTML = '';

      const containerVNode = createVNode(
        (container as Element).tagName.toLowerCase(),
        container
      );
      const appVNode = createVNode(App, appComponent);

      appComponent.vnode = appVNode;
      appendVNode(appVNode, containerVNode);
      appendVNode(
        createVNodeFromJSXNode(appComponent.renderToJSXNode()),
        appVNode
      );
    },
    unmount() {},
  };
}
