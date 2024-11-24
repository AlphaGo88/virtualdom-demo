import { COMPONENT_TYPE } from 'shared/symbols';
import type { Ref, Props, JSXNode } from 'shared/types';
import { wrapProps, updateProps } from 'core/props';

type CommonJSXProps = {
  key?: string | number;
  ref?: Ref<Element>;
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
  mount: () => void;
  unmount: () => void;
  receive: (props: Props) => void;
}

export let currentSetupInstance: ComponentInstance | null = null;

class BaseComponent implements ComponentInstance {
  static $$typeof = COMPONENT_TYPE;

  props: Props = {};
  mountCallbacks: (() => void)[] = [];
  unmountCallbacks: (() => void)[] = [];

  // will be rewritten after calling setup function
  render: () => JSXNode = () => null;

  // constructor() {
  //   this.renderEffect = new ReactiveEffect(() => {
  //     this.renderedElement = this.renderToJSXNode();
  //     this.vnode?.updateComponent(this.renderedElement);
  //   });
  // }

  receive(nextProps: Props) {
    updateProps(this.props, nextProps);
  }

  addMountCallback(fn: () => void) {
    this.mountCallbacks.push(fn);
  }

  addUnmountCallback(fn: () => void) {
    this.unmountCallbacks.push(fn);
  }

  mount() {
    const callbacks = this.mountCallbacks;

    this.mountCallbacks = [];
    callbacks.forEach((cb) => cb());
  }

  unmount() {
    const callbacks = this.unmountCallbacks;

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
  return class extends BaseComponent {
    props: P;

    constructor(props: CommonJSXProps & P, ref: Ref<Element> | null) {
      super();

      // make props reactive
      this.props = wrapProps(props ?? {}) as P;

      currentSetupInstance = this;
      // props is reactive, users should not destructure it.
      // 'ref' can be used for ref forwarding.
      this.render = setup(this.props, ref);
      currentSetupInstance = null;
    }
  };
}
