import { COMPONENT_TYPE } from 'shared/symbols';
import type { Ref, Props, JSXNode } from 'shared/types';
import { isPlainObject, isSame, isString } from 'shared/utils';
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
let internallyMutateProps = false;

class BaseComponent implements ComponentInstance {
  static $$typeof = COMPONENT_TYPE;

  props: Props;

  protected effectMap: Map<string, Set<Effect>>;

  // this is circular
  protected vnode: VNode | null;

  protected mountCallbacks: Effect[];
  protected unmountCallbacks: Effect[];
  protected renderToJSXNode: () => JSXNode;
  protected patch: () => void;

  constructor() {
    this.props = {};
    this.effectMap = new Map();
    this.vnode = null;
    this.mountCallbacks = [];
    this.unmountCallbacks = [];
    this.renderToJSXNode = () => null;
    this.patch = () => this.vnode?.patch();
  }

  protected track(propName: string) {
    const { effectMap } = this;

    if (activeEffect) {
      let effects = effectMap.get(propName);

      if (!effects) {
        effectMap.set(propName, (effects = new Set()));
      }
      effects.add(activeEffect);
    }
  }

  protected trigger(propName: string, value: unknown) {
    const { props, effectMap } = this;

    if (!isSame(props[propName], value)) {
      effectMap.get(propName)?.forEach(enqueueEffect);
    }
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
    const { props } = this;

    internallyMutateProps = true;
    Object.keys(nextProps).forEach((key) => {
      props[key] = nextProps[key];
    });
    internallyMutateProps = false;
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

      const { track, trigger } = this;
      this.props = new Proxy(props ?? {}, {
        get(target, key, receiver) {
          if (isString(key)) {
            track(key);
          }
          return Reflect.get(target, key, receiver);
        },

        set(target, key, value, receiver) {
          if (!internallyMutateProps) {
            if (__DEV__) {
              console.error('Props can not be mutated directly.');
            }
            return false;
          }

          if (isString(key)) {
            trigger(key, value);
          }
          return Reflect.set(target, key, value, receiver);
        },

        has(target, key) {
          if (isString(key)) {
            track(key);
          }
          return Reflect.has(target, key);
        },

        deleteProperty() {
          if (__DEV__) {
            console.error('Props can not be deleted.');
          }
          return false;
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

export function mergeProps(target: Props, ...source: object[]) {
  if (__DEV__) {
    if (!currentSetupInstance) {
      console.error(
        '"mergeProps" should not be called outside setup function.'
      );
    }

    if (activeEffect) {
      console.error(
        '"mergeProps" should not be called inside render function or "useEffect".'
      );
    }
  }

  internallyMutateProps = true;
  for (const src of source) {
    if (isPlainObject(src)) {
      Object.keys(src).forEach((key) => {
        if (target[key] === undefined) {
          target[key] = src[key];
        }
      });
    } else if (__DEV__) {
      console.error(`${String(src)} can not be merged into props.`);
    }
  }
  internallyMutateProps = false;
}
