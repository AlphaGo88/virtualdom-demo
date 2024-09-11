import { COMPONENT_TYPE } from 'shared/symbols';
import type { Ref, Props, JSXNode } from 'shared/types';
import type { VNode } from 'core/vnode';
import { type Effect, targetEffect } from 'core/hooks';

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

class BaseComponent implements ComponentInstance {
  static $$typeof = COMPONENT_TYPE;

  props: Props;
  protected propWatchers: Map<string, Set<Effect>>;
  // this is circular
  protected vnode: VNode | null;
  protected mountCallbacks: Effect[];
  protected unmountCallbacks: Effect[];
  protected renderToJSXNode: () => JSXNode;
  protected patch: () => void;

  constructor() {
    this.props = {};
    this.propWatchers = new Map();
    this.vnode = null;
    this.mountCallbacks = [];
    this.unmountCallbacks = [];
    this.renderToJSXNode = () => null;
    this.patch = () => this.vnode?.patch();
  }

  render() {
    targetEffect.value = this.patch;
    const renderedElement = this.renderToJSXNode();

    targetEffect.value = null;
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
      callbacks.shift()!();
    }
  }

  unmount() {
    this.vnode = null;

    const callbacks = this.unmountCallbacks;
    while (callbacks.length) {
      callbacks.shift()!();
    }
  }

  receive(nextProps: Props) {
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
        const watchers = this.propWatchers.get(name);

        props[name] = nextVal;
        watchers?.forEach((watcher) => effectsToRun.add(watcher));
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
export function defineComponent<P = {}>(
  setup: (props: P, ref: Ref<Element> | null) => () => JSXNode
) {
  class Component extends BaseComponent {
    props: Props<P>;

    constructor(props: Props<P>, ref: Ref<Element> | null) {
      super();

      const { propWatchers } = this;
      this.props = new Proxy(props ?? {}, {
        get(target, p) {
          if (!target.hasOwnProperty(p)) {
            return undefined;
          }

          if (typeof p === 'string' && targetEffect.value) {
            const watchers = propWatchers.get(p);

            // collect watchers
            if (watchers) {
              watchers.add(targetEffect.value);
            } else {
              propWatchers.set(p, new Set<Effect>().add(targetEffect.value));
            }
          }

          return target[p];
        },
      });

      currentSetupInstance = this;
      // The props is reactive, users should not destructure it.
      // The 'ref' argument can be used to forward ref.
      this.renderToJSXNode = setup(this.props, ref);
      currentSetupInstance = null;
    }
  }

  return Component;
}
