import { COMPONENT_TYPE } from 'shared/symbols';
import type { Ref, Key, Props, JSXNode } from 'shared/types';
import { wrapProps, receive } from 'core/props';
import { type Effect, pushEffect, popEffect } from 'core/effect';
import type { VNode } from 'core/vnode';

type CommonJSXProps = {
  ref?: Ref<Element> | null;
  key?: Key;
};

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

  // this is circular
  protected vnode: VNode | null;

  protected mountCallbacks: Effect[];
  protected unmountCallbacks: Effect[];
  protected renderToJSXNode: () => JSXNode;

  // 'render' is unique for every instance since it's regarded as an effect.
  render: () => JSXNode;

  constructor() {
    this.props = {};

    // will be set after the instance mounts.
    this.vnode = null;

    this.mountCallbacks = [];
    this.unmountCallbacks = [];

    // will be rewritten after calling setup function.
    this.renderToJSXNode = () => null;

    this.render = () => {
      pushEffect(this.render);

      const renderedElement = this.renderToJSXNode();
      this.vnode?.updateComponent(renderedElement);

      popEffect();
      return renderedElement;
    };
  }

  receive(nextProps: Props) {
    receive(this.props, nextProps);
  }

  addMountCallback(fn: () => void) {
    this.mountCallbacks.push(fn);
  }

  addUnmountCallback(fn: () => void) {
    this.unmountCallbacks.push(fn);
  }

  mount(vnode: VNode) {
    const callbacks = this.mountCallbacks;

    this.vnode = vnode;
    this.mountCallbacks = [];
    callbacks.forEach((cb) => cb());
  }

  unmount() {
    const callbacks = this.unmountCallbacks;

    this.vnode = null;
    this.unmountCallbacks = [];
    callbacks.forEach((cb) => cb());
  }
}

/**
 * The standard way to define components.
 *
 * @param setup - setup function must return a render function
 * @returns component constructor
 */
export function defineComponent<P extends Props>(
  setup: (props: P, ref: Ref<Element> | null) => () => JSXNode
) {
  class Component extends BaseComponent {
    props: P;

    constructor(props: CommonJSXProps & P, ref: Ref<Element> | null) {
      super();

      // make props reactive
      this.props = wrapProps(props ?? {}) as P;

      currentSetupInstance = this;
      // props is reactive, users should not destructure it.
      // 'ref' can be used for ref forwarding.
      this.renderToJSXNode = setup(this.props as P, ref);
      currentSetupInstance = null;
    }
  }

  return Component;
}
