import { COMPONENT_TYPE } from 'shared/symbols';
import type { Ref, Props, JSXNode } from 'shared/types';
import type { VNode } from 'core/vnode';
import { type Effect, targetEffect } from './hooks';

export interface Component {
  $$typeof: Symbol;
  new (props: any, ref: Ref<Element> | null): ComponentInstance;
}

export interface ComponentInstance {
  props: any;
  render: () => JSXNode;
  addMountCallback: (fn: () => void) => void;
  addUnmountCallback: (fn: () => void) => void;
  mount: (vnode: VNode) => void;
  unmount: () => void;
  receive: (props: any) => void;
}

export type PropConfig = Map<string, { watchers: Set<Effect> }>;

export let currentSetupInstance: ComponentInstance | null = null;

class BaseComponent implements ComponentInstance {
  static $$typeof = COMPONENT_TYPE;

  props: any;
  protected _propConfig: PropConfig;

  // this is circular
  protected _vnode: VNode | null;

  protected _mountCallbacks: Effect[];
  protected _unmountCallbacks: Effect[];
  protected _render: () => JSXNode;
  protected _patch: () => void;

  constructor() {
    this._propConfig = new Map();
    this._vnode = null;
    this._mountCallbacks = [];
    this._unmountCallbacks = [];
    this._render = () => null;
    this._patch = () => this._vnode?.patch();
  }

  render() {
    targetEffect.value = this._patch;
    const renderedElement = this._render();

    targetEffect.value = null;
    return renderedElement;
  }

  addMountCallback(fn: () => void) {
    this._mountCallbacks.push(fn);
  }

  addUnmountCallback(fn: () => void) {
    this._unmountCallbacks.push(fn);
  }

  mount(vnode: VNode) {
    this._vnode = vnode;

    const callbacks = this._mountCallbacks;
    while (callbacks.length) {
      callbacks.shift()!();
    }
  }

  unmount() {
    this._vnode = null;

    const callbacks = this._unmountCallbacks;
    while (callbacks.length) {
      callbacks.shift()!();
    }
  }

  receive(nextProps: any) {
    if (!nextProps || typeof nextProps !== 'object') {
      return;
    }

    const { props } = this;
    const propNames = new Set([
      ...Object.keys(props),
      ...Object.keys(nextProps),
    ]);
    const effectsToRun = new Set<Effect>();

    propNames.forEach((name) => {
      const val = props[name];
      const nextVal = nextProps[name];

      if (!Object.is(val, nextVal)) {
        const config = this._propConfig.get(name);

        props[name] = nextVal;
        config?.watchers.forEach(effectsToRun.add);
      }
    });

    // run effects
    effectsToRun.forEach((fn) => fn());
  }
}

/**
 * The standard way to define components
 *
 * @param setup - The setup function returns a render function
 * @returns component constructor
 */
export function defineComponent<P extends object>(
  setup: (props: P, ref: Ref<Element> | null) => () => JSXNode
) {
  class Component extends BaseComponent {
    props: Props<P>;

    constructor(props: Props<P>, ref: Ref<Element> | null) {
      super();

      const propConfig = this._propConfig;
      this.props = new Proxy(props ?? {}, {
        get(target, p) {
          if (typeof p !== 'string' || !target.hasOwnProperty(p)) {
            return undefined;
          }

          if (targetEffect.value) {
            const config = propConfig.get(p);

            // collect watchers
            if (config) {
              config.watchers.add(targetEffect.value);
            } else {
              propConfig.set(p, {
                watchers: new Set<Effect>().add(targetEffect.value),
              });
            }
          }

          return target[p];
        },

        set(target, p, value) {
          if (typeof p !== 'string') {
            return false;
          }

          target[p] = value;
          return true;
        },
      });

      currentSetupInstance = this;
      // The props is reactive, users should not destructure it.
      // The 'ref' argument can be used to forward ref.
      this._render = setup(this.props, ref);
      currentSetupInstance = null;
    }
  }

  return Component;
}
