const VNODE_TYPE = Symbol('vnode');
const PROPS_KEY = Symbol('props');

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
  (props: Props): () => VNode;
}

interface Signal<T> {
  value: T;
  component: Component | null;
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
  props: Props = {},
  ...children: any[]
): VNode {
  return {
    $$typeof: VNODE_TYPE,
    type,
    props,
    children: children.map((child) => toVNode(child)),
  };
}

function toVNode(node: any): VNode {
  return isVNode(node) ? node : h('text', { value: `${node}` });
}

function isVNode(node: any) {
  return typeof node === 'object' && node.$$typeof === VNODE_TYPE;
}

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
    updateProps(vnode, el as Element);
    updateChildren(vnode, el as Element);
  } else {
    // node type is different, replace the element
    unmountComponentAtNode(el);
    parent.replaceChild(createElement(vnode), el);
  }
}

function updateProps(vnode: VNode, el: Element) {
  const props = vnode.props;
  const all = { ...el[PROPS_KEY], ...props };
  const newProps = {};

  Object.keys(all).forEach((key) => {
    const ov = el[PROPS_KEY][key];
    const nv = props[key];

    if (nv == null) {
      el.removeAttribute(key);
      return;
    }
    if (ov == null || ov !== nv) {
      el.setAttribute(key, nv);
    }
    newProps[key] = all[key];
  });

  // save new props
  el[PROPS_KEY] = newProps;
}

function updateChildren(vnode: VNode, el: Element) {
  const children = vnode.children;
  const nodes: VNodeElement[] = Array.prototype.slice.call(el.childNodes);
  const len = Math.max(children.length, nodes.length);

  for (let i = 0; i < len; i++) {
    patch(children[i], nodes[i], el);
  }
}

/**
 * This creates dom element
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
    const vnode = component.render();

    el = createElement(vnode);
    el['_component'] = component;
    el['_componentCtor'] = component.constructor;
    component.el = el;
  } else {
    el = document.createElement(type);
    el[PROPS_KEY] = props;
    for (const child of children) {
      el.appendChild(createElement(child));
    }
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

export function defineComponent(setup: SetupFunc) {
  class Ctor implements Component {
    el: VNodeElement | null;
    props: Props;
    render: () => VNode;

    constructor(props: Props = {}) {
      this.el = null;
      this.props = props;
      const _render = setup(this.props);
      this.render = () => {
        Target = this;
        const vnode = _render();
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

  function getter() {
    if (Target && !signal.component) {
      // set component when getter() is first called by render()
      signal.component = Target;
    }
    return signal.value;
  }

  function setter(value: T) {
    if (Object.is(value, signal.value)) {
      return;
    }
    const { component } = signal;
    signal.value = value;
    if (component?.el?.parentNode) {
      patch(component.render(), component.el, component.el.parentNode);
    }
  }

  return [getter, setter] as [() => T, (value: T) => void];
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
      const vnode = component.render();
      const rootEl = createElement(vnode);
      container.innerHTML = '';
      container.appendChild(rootEl);
    },
    unmount() {},
  };
}
