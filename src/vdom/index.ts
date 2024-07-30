const VNODE_TYPE = Symbol('vnode');
const COMPONENT_TYPE = Symbol('component');

type Props = Record<string, any>;

interface VNode {
  $$typeof: Symbol;
  type: string | Component;
  props: Props;
  children: any[];
}

interface ComponentInstance {
  $$typeof: Symbol;
  props: Props;
  node: CTreeNode | null;
  render: () => any;
  unmount: () => void;
}

interface Component {
  new (props?: Props): ComponentInstance;
}

type CTreeNodeElement = Element | Text | Comment;

// node of component tree
interface CTreeNode {
  element: ComponentInstance | CTreeNodeElement;
  props: Props;
  parent: CTreeNode | null;
  children: CTreeNode[];
}

interface SetupFunc {
  (): (props: Props) => any;
}

interface Signal<T> {
  value: T;
  component: ComponentInstance | null;
}

interface SignalGetter<T> {
  (): T;
}

interface SignalSetter<T> {
  (value: T | ((prev: T) => T)): T;
}

let Target: ComponentInstance | null = null;

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
  ...children: any[]
): VNode {
  return {
    $$typeof: VNODE_TYPE,
    type,
    props: props ?? {},
    children,
  };
}

function isVNode(value: any) {
  return value?.$$typeof === VNODE_TYPE;
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
    declare node: CTreeNode | null;
    declare render: () => any;

    constructor(props?: Props) {
      this.$$typeof = COMPONENT_TYPE;
      this.props = props ?? {};
      this.node = null;

      const _render = setup();
      this.render = () => {
        Target = this;
        const vnode = _render(this.props);
        Target = null;
        return vnode;
      };
    }
    unmount() {}
  }
  return Component;
}

function isComponent(value: any) {
  return value?.$$typeof === COMPONENT_TYPE;
}

function patch(vnode: any, node: CTreeNode, parent: CTreeNode) {
  const nodeType = isComponent(node.element)
    ? ''
    : (node.element as CTreeNodeElement).nodeType;

  if (!isVNode(vnode)) {
    if (vnode == null && nodeType === Node.COMMENT_NODE) {
      // both are empty nodes, nothing to do
    } else if (nodeType === Node.TEXT_NODE) {
      // both are text nodes
      (node.element as Text).nodeValue = `${vnode}`;
    } else {
      replaceNode(createNodeFromVNode(vnode), node, parent);
    }
  } else {
    const { type, props, children } = vnode as VNode;

    if (isComponent(node.element) && node.element.constructor === type) {
      const component = node.element as ComponentInstance;
      component.props = {
        ...props,
        children,
      };
      patch(component.render(), node.children[0], node);
    } else if (
      typeof type === 'string' &&
      nodeType === Node.ELEMENT_NODE &&
      type.toUpperCase() === (node.element as Element).tagName.toUpperCase()
    ) {
      const childNodes = node.children;
      updateDOMProps(props, node);

      for (let i = 0; i < Math.max(children.length, childNodes.length); i++) {
        if (i >= children.length) {
          removeNode(childNodes[i], parent);
        } else if (i >= childNodes.length) {
          appendNode(createNodeFromVNode(children[i]), parent);
        } else {
          patch(children[i], childNodes[i], node);
        }
      }
    } else {
      // now node type is different
      replaceNode(createNodeFromVNode(vnode), node, parent);
    }
  }
}

function updateDOMProps(props: Props | null, node: CTreeNode) {
  const el = node.element as Element;
  const oldProps = node.props;
  const newProps = props ?? {};
  const allKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

  for (const key of allKeys.keys()) {
    const ov = oldProps[key];
    const nv = newProps[key];

    if (isEventProp(key)) {
      const type = key.substring(2).toLowerCase();

      if (nv !== ov) el.removeEventListener(type, ov);
      if (typeof nv === 'function') el.addEventListener(type, nv);
    } else {
      if (nv == undefined) {
        el.removeAttribute(key);
      } else if (nv !== ov) {
        el.setAttribute(key, nv);
      }
    }
  }
  node.props = newProps;
}

function isEventProp(propName: string) {
  return propName.substring(0, 2) === 'on';
}

function createNode(
  element: ComponentInstance | CTreeNodeElement,
  props?: Props
) {
  return {
    element,
    props: props ?? {},
    parent: null,
    children: [],
  } as CTreeNode;
}

function createNodeFromVNode(vnode: any) {
  // use comment node for components that return null
  if (vnode == null) {
    return createNode(document.createComment(''));
  }
  // text node
  if (!isVNode(vnode)) {
    return createNode(document.createTextNode(`${vnode}`));
  }
  const { type, props, children } = vnode as VNode;
  let node: CTreeNode;

  // component node
  if (typeof type === 'function') {
    const component = new type({
      ...props,
      children,
    });
    node = createNode(component);
    component.node = node;
    appendNode(createNodeFromVNode(component.render()), node);
  } else {
    // element node
    node = createNode(document.createElement(type));
    updateDOMProps(props, node);
    children.forEach((child) => {
      appendNode(createNodeFromVNode(child), node);
    });
  }
  return node;
}

function removeNode(node: CTreeNode, parent: CTreeNode) {
  const el = findDOMElement(node);
  const parentEl = findDOMElement(parent, true);

  node.parent = null;
  parent.children.splice(parent.children.indexOf(node), 1);
  if (parentEl && el) {
    parentEl.removeChild(el);
  }
}

function appendNode(node: CTreeNode, parent: CTreeNode) {
  const el = findDOMElement(node);
  const parentEl = findDOMElement(parent, true);

  node.parent = parent;
  parent.children.push(node);
  if (parentEl && el) {
    parentEl.appendChild(el);
  }
}

function replaceNode(node: CTreeNode, oldNode: CTreeNode, parent: CTreeNode) {
  const el = findDOMElement(node);
  const oldEl = findDOMElement(oldNode);
  const parentEl = findDOMElement(parent, true);

  node.parent = parent;
  oldNode.parent = null;
  parent.children.splice(parent.children.indexOf(oldNode), 1, node);
  if (parentEl && el && oldEl) {
    parentEl.replaceChild(el, oldEl);
  }
}

function findDOMElement(node: CTreeNode, up: boolean = false) {
  let ptr: CTreeNode | null = node;

  if (up) {
    while (ptr && isComponent(ptr.element)) {
      ptr = ptr.parent;
    }
    return ptr ? (ptr.element as Element) : null;
  }
  while (ptr && isComponent(ptr.element)) {
    ptr = ptr.children[0];
  }
  return ptr ? (ptr.element as CTreeNodeElement) : null;
}

export function createSignal<T>(initialValue: T) {
  const signal: Signal<T> = {
    value: initialValue,
    component: null,
  };
  const getter: SignalGetter<T> = () => {
    if (Target && !signal.component) {
      // associate the component with the signal when getter() is first called by render()
      signal.component = Target;
    }
    return signal.value;
  };
  const setter: SignalSetter<T> = (value) => {
    const component = signal.component;
    const newVal: T =
      typeof value === 'function' ? (value as Function)(signal.value) : value;

    if (!Object.is(newVal, signal.value)) {
      signal.value = newVal;
      if (component?.node) {
        patch(component.render(), component.node.children[0], component.node);
      }
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
      const containerNode = createNode(container);
      const appNode = createNode(appComponent);

      appComponent.node = appNode;
      appendNode(appNode, containerNode);
      appendNode(createNodeFromVNode(appComponent.render()), appNode);
    },
    unmount() {},
  };
}
