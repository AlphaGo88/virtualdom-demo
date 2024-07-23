const VNODE_TYPE = Symbol('vnode');

interface VNode {
  $$typeof: Symbol;
  type: string;
  props: Record<string, any>;
  children: any[];
}

export function h(type: string, props: any = {}, ...children: any[]): VNode {
  return {
    $$typeof: VNODE_TYPE,
    type,
    props,
    children,
  };
}

/**
 * This creates html element
 * @param node
 * @returns
 */
export function createElement(node: string | VNode) {
  const isVNode = typeof node === 'object' && node.$$typeof === VNODE_TYPE;
  if (!isVNode) {
    return document.createTextNode(`${node}`);
  }

  const { type, children } = node as VNode;
  const el = document.createElement(type);

  for (const child of children) {
    el.appendChild(createElement(child));
  }
  return el;
}

export function createApp(rootComponent: Function) {
  const vnode = rootComponent();

  return {
    vnode,
    mount(selector: string) {
      const parentEl = document.querySelector(selector);
      if (!parentEl) {
        throw new Error(`Can't mount app to ${parentEl}`);
      }

      const el = createElement(vnode);
      parentEl.innerHTML = '';
      parentEl.appendChild(el);
    },
  };
}
