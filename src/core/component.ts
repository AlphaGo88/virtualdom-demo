import { COMPONENT_TYPE } from 'shared/symbols';
import type { Ref, Props, JSXNode } from 'shared/types';
import type { VNode } from 'core/vnode';
import {
  type Effect,
  activeEffect,
  setActiveEffect,
  enqueueEffect,
} from 'core/effect';

export interface Component {
  $$typeof: symbol;
  new (props: Props, ref: Ref<Element> | null): ComponentInstance;
}

export interface ComponentInstance {
  props: Props;
  render: () => JSXNode;
  addMountCallback: (fn: () => void) => void;
  addUnmountCallback: (fn: () => void) => void;
  mount: (vnode: VNode) => void;
  unmount: () => void;
  receive: (props: Props) => void;
}

export let currentSetupInstance: ComponentInstance | null = null;
let canUpdateProps = false;

class BaseComponent implements ComponentInstance {
  static $$typeof = COMPONENT_TYPE;

  props: Props;

  // this is circular
  protected vnode: VNode | null;

  protected mountCallbacks: Effect[];
  protected unmountCallbacks: Effect[];
  protected renderToJSXNode: () => JSXNode;
  protected patch: () => void;

  constructor() {
    this.props = {};
    this.vnode = null;
    this.mountCallbacks = [];
    this.unmountCallbacks = [];
    this.renderToJSXNode = () => null;
    this.patch = () => this.vnode?.patch();
  }

  render() {
    setActiveEffect(this.patch);
    const renderedElement = this.renderToJSXNode();
    setActiveEffect(null);
    return renderedElement;
  }

  addMountCallback(fn: () => void) {
    this.mountCallbacks.push(fn);
  }

  addUnmountCallback(fn: () => void) {
    this.unmountCallbacks.push(fn);
  }

  mount(vnode: VNode) {
    this.vnode = vnode;

    const callbacks = this.mountCallbacks;
    while (callbacks.length) {
      enqueueEffect(callbacks.shift()!);
    }
  }

  unmount() {
    this.vnode = null;

    const callbacks = this.unmountCallbacks;
    while (callbacks.length) {
      enqueueEffect(callbacks.shift()!);
    }
  }

  receive(nextProps: Props) {
    canUpdateProps = true;

    Object.keys(nextProps).forEach((key) => {
      this.props[key] = nextProps[key];
    });
    canUpdateProps = false;
  }
}

/**
 * The standard way to define components.
 *
 * @param setup - setup function must returns the render function
 * @returns component constructor
 */
export function defineComponent<P extends object = {}>(
  setup: (props: P, ref: Ref<Element> | null) => () => JSXNode
) {
  class Component extends BaseComponent {
    props: Props<P>;

    constructor(props: Props<P>, ref: Ref<Element> | null) {
      super();
      const effectMap = new Map<string, Set<Effect>>();

      this.props = new Proxy(props ?? {}, {
        get(target, p) {
          if (typeof p === 'string' && activeEffect) {
            if (!effectMap.get(p)) {
              effectMap.set(p, new Set());
            }

            // collect effects
            effectMap.get(p)!.add(activeEffect);
          }

          return target[p];
        },

        set(target, key, value) {
          if (!canUpdateProps) {
            if (__DEV__) {
              console.error(
                'Invalid operation. Props can not be mutated directly.'
              );
            }

            return false;
          }

          if (typeof key === 'string' && !Object.is(target[key], value)) {
            effectMap.get(key)?.forEach(enqueueEffect);
          }

          return Reflect.set(target, key, value);
        },
      });

      currentSetupInstance = this;
      // props is reactive, users should not destructure it.
      // 'ref' argument can be used for ref forwarding.
      this.renderToJSXNode = setup(this.props, ref);
      currentSetupInstance = null;
    }
  }

  return Component;
}

export function mergeProps(target: Props, ...source: {}[]) {
  canUpdateProps = true;

  for (const src of source) {
    Object.keys(src).forEach((key) => {
      if (target[key] === undefined) {
        target[key] = src[key];
      }
    });
  }
  canUpdateProps = false;
}

export function onMount(fn: () => void) {
  if (!currentSetupInstance) {
    throw new Error(
      'Invalid hook call. "onMount" can only be called inside setup function.'
    );
  }

  currentSetupInstance.addMountCallback(fn);
}

export function onUnmount(fn: () => void) {
  if (!currentSetupInstance) {
    throw new Error(
      'Invalid hook call. "onUnmount" can only be called inside setup function.'
    );
  }

  currentSetupInstance.addUnmountCallback(fn);
}
