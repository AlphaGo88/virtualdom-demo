const VNODE_TYPE = Symbol('vnode');

type Props = Record<string, any>;
type VNodeElement = Element | Text;

interface ComponentCtor {
  new (props?: Props): Component;
}

interface Component {
  el: VNodeElement | null;
  props: Props;
  render: () => VNode;
  unmount: () => void;
}

interface VNode {
  $$typeof: Symbol;
  type: string | Function;
  props: Props;
  children: VNode[];
}

interface SetupFunc {
  (): (props: Props) => VNode;
}

interface Signal<T> {
  value: T;
  component: Component | null;
}

interface SignalGetter<T> {
  (): T;
}
interface SignalSetter<T> {
  (value: T | ((prev: T) => T)): void;
}

let Target: Component | null = null;

/**
 * Jsx is transformed into h funcition
 * @param type
 * @param props
 * @param children
 * @returns
 */
export function h(
  type: string | Function,
  props: Props | null,
  ...children: any[]
): VNode {
  return {
    $$typeof: VNODE_TYPE,
    type,
    props: props || {},
    children: children.map((child) => toVNode(child)),
  };
}

function toVNode(node: any): VNode {
  return isVNode(node) ? node : h('text', { value: `${node}` });
}

function isVNode(node: any) {
  return typeof node === 'object' && node.$$typeof === VNODE_TYPE;
}

/**
 * Updates dom
 * @param vnode
 * @param el
 * @param parent
 * @returns
 */
function patch(vnode: VNode | null, el: VNodeElement | null, parent: Node) {
  if (!vnode) {
    // remove old element if vnode is null
    if (el) {
      unmountComponentAtNode(el);
      parent.removeChild(el);
    }
    return;
  }

  // create new element if there's no old element
  if (el == null) {
    parent.appendChild(createElement(vnode));
    return;
  }
  const { type, props, children } = vnode;

  // handle text node
  if (el.nodeType === Node.TEXT_NODE) {
    if (type !== 'text' || props.value !== el.nodeValue) {
      parent.replaceChild(createElement(vnode), el);
    }
    return;
  }
  const componentCtor: ComponentCtor = el['_componentCtor'];
  const component: Component = el['_component'];

  if (componentCtor === vnode.type) {
    component.props = {
      ...props,
      children,
    };
    patch(component.render(), el, parent);
  } else if (
    typeof type === 'string' &&
    (el as Element).tagName.toUpperCase() === type.toUpperCase()
  ) {
    // same tag, update node props and children
    patchProps(vnode, el as Element);
    patchChildren(vnode, el as Element);
  } else {
    // node type is different, replace the element
    unmountComponentAtNode(el);
    parent.replaceChild(createElement(vnode), el);
  }
}

function patchProps(vnode: VNode, el: Element) {
  const oldProps = el['_props'] ?? {};
  const props = vnode.props;
  const allPropKeys = new Set([
    ...Object.keys(oldProps),
    ...Object.keys(props),
  ]);

  for (const key of allPropKeys.keys()) {
    const ov = oldProps[key];
    const nv = props[key];

    // bind events
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

  el['_props'] = props;
}

function isEventProp(propName: string) {
  return propName.substring(0, 2) === 'on';
}

function patchChildren(vnode: VNode, el: Element) {
  const children = vnode.children;
  const nodes: VNodeElement[] = Array.prototype.slice.call(el.childNodes);
  const len = Math.max(children.length, nodes.length);

  for (let i = 0; i < len; i++) {
    patch(children[i], nodes[i], el);
  }
}

/**
 * Creates dom element
 * @param vnode
 * @returns
 */
function createElement(vnode: VNode): VNodeElement {
  const { type, props, children } = vnode;

  if (type === 'text') {
    return document.createTextNode(vnode.props.value);
  }
  let el: VNodeElement;

  if (typeof type === 'function') {
    const component = new (type as ComponentCtor)({
      ...props,
      children,
    });

    el = createElement(component.render());
    el['_component'] = component;
    el['_componentCtor'] = component.constructor;
    component.el = el;
  } else {
    el = document.createElement(type);
    patchProps(vnode, el);
    patchChildren(vnode, el);
  }

  return el;
}

function unmountComponentAtNode(el: VNodeElement) {
  const component = el['_component'];

  if (component) {
    (component as Component).unmount();
    el['_component'] = undefined;
    el['_componentCtor'] = undefined;
  }
}

/**
 *
 * @param setup - setup function returns a render function
 * @returns the constructor of the component
 */
export function defineComponent(setup: SetupFunc) {
  class Ctor implements Component {
    el: VNodeElement | null;
    props: Props;
    render: () => VNode;

    constructor(props: Props = {}) {
      const _render = setup();

      this.el = null;
      this.props = props;
      this.render = () => {
        Target = this;
        const vnode = _render(this.props);
        Target = null;
        return vnode;
      };
    }

    unmount() {}
  }

  return Ctor as ComponentCtor;
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
    const newVal =
      typeof value === 'function' ? (value as Function)(signal.value) : value;

    if (Object.is(newVal, signal.value)) {
      return;
    }
    const { component } = signal;

    signal.value = newVal;
    if (component?.el?.parentNode) {
      patch(component.render(), component.el, component.el.parentNode);
    }
  };

  return [getter, setter] as [SignalGetter<T>, SignalSetter<T>];
}

export function createApp(App: ComponentCtor) {
  const component = new App();

  return {
    component,
    mount(selector: string) {
      const container = document.querySelector(selector);
      if (!container) {
        throw new Error(`Can't mount app to ${container}`);
      }

      const rootEl = createElement(component.render());
      component.el = rootEl;
      container.innerHTML = '';
      container.appendChild(rootEl);
    },
    unmount() {},
  };
}
