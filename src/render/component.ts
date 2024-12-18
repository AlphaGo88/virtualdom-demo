import { COMPONENT_TYPE } from 'vdom/shared/symbols';
import type { Ref, Props, JSXNode } from 'vdom/shared/types';
import { wrapProps, updateProps } from './componentProps';

export interface Component {
  $$typeof: symbol;
  new (props: Props, ref: Ref<any> | null): ComponentInstance;
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

export interface SetupFunction<P> {
  (props: P, ref: Ref<any> | null): () => JSXNode;
}

export let currentSetupInstance: ComponentInstance | null = null;

class BaseComponent implements ComponentInstance {
  static $$typeof = COMPONENT_TYPE;

  props: Props = {};
  mountCallbacks?: (() => void)[];
  unmountCallbacks?: (() => void)[];

  // will be rewritten after calling setup function
  render: () => JSXNode = () => null;

  receive(nextProps: Props) {
    updateProps(this.props, nextProps);
  }

  addMountCallback(fn: () => void) {
    if (!this.mountCallbacks) {
      this.mountCallbacks = [fn];
    } else {
      this.mountCallbacks.push(fn);
    }
  }

  addUnmountCallback(fn: () => void) {
    if (!this.unmountCallbacks) {
      this.unmountCallbacks = [fn];
    } else {
      this.unmountCallbacks.push(fn);
    }
  }

  mount() {
    const callbacks = this.mountCallbacks;
    if (callbacks) {
      this.mountCallbacks = undefined;
      callbacks.forEach((cb) => cb());
    }
  }

  unmount() {
    const callbacks = this.unmountCallbacks;
    if (callbacks) {
      this.unmountCallbacks = undefined;
      callbacks.forEach((cb) => cb());
    }
  }
}

/**
 * The standard way to define components.
 *
 * @param setup - setup function must return a render function
 * @returns component constructor
 */
export function defineComponent<P extends Props>(setup: SetupFunction<P>) {
  return class extends BaseComponent {
    props: P;

    constructor(props: P, ref: Ref<any> | null) {
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
