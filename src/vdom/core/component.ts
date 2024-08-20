import type { Ref, DOMNodeRef, Props, JSXNode } from '../shared/types';
import type { CompositeVNode } from './vnode';

export interface Component {
  new (props: Props, ref: DOMNodeRef | null): ComponentInstance;
}

export interface ComponentInstance {
  render: () => JSXNode;
  addMountCallback: (fn: () => void) => void;
  addUnmountCallback: (fn: () => void) => void;
  addEffect: (effect: Effect) => void;
  mount: (vnode: CompositeVNode) => void;
  unmount: () => void;
  receive: (props: Props) => void;
  updateAsync: (stateId: Symbol) => void;
}

export interface SetupFunc {
  (props: Props, ref: DOMNodeRef | null): () => JSXNode;
}

export interface State<T> {
  id: Symbol;
  value: T;
  compInstance: ComponentInstance;
}

export interface StateGetter<T> {
  (): T;
}

export interface StateSetter<T> {
  (value: T | ((prev: T) => T)): T;
}

export type Dep = string | Symbol;

export interface EffectFunc {
  (): void;
}

export interface Effect {
  fn: EffectFunc;
  deps: Set<Dep>;
}

let currentSetupInstance: ComponentInstance | null = null;
let targetEffect: Effect | null = null;

const effectQueue: EffectFunc[] = [];

function enqueueEffect(fn: EffectFunc) {
  if (!effectQueue.includes(fn)) {
    effectQueue.push(fn);

    Promise.resolve().then(() => {
      while (effectQueue.length > 0) {
        effectQueue.shift()!();
      }
    });
  }
}

class BaseComponent implements ComponentInstance {
  protected _props: Props;
  private _vnode: CompositeVNode | null;
  private _mountCallbacks: EffectFunc[];
  private _unmountCallbacks: EffectFunc[];
  private _effects: Effect[];
  protected _render: () => JSXNode;

  constructor(props: Props = {}) {
    this._props = new Proxy(props, {
      get: (target, propName) => {
        if (!target.hasOwnProperty(propName)) {
          return undefined;
        }

        // collect effect dependencies
        if (targetEffect) {
          targetEffect.deps.add(propName as string);
        }

        return target[propName as string];
      },
    });

    this._vnode = null;
    this._mountCallbacks = [];
    this._unmountCallbacks = [];
    this._effects = [
      {
        fn: () => {
          this._vnode?.patch();
        },
        deps: new Set<Dep>(),
      },
    ];
    this._render = () => null;
  }

  render() {
    // collect dependencies for vnode.patch() in render function
    targetEffect = this._effects[0];
    const renderedElement = this._render();

    targetEffect = null;
    return renderedElement;
  }

  addMountCallback(fn: EffectFunc) {
    this._mountCallbacks.push(fn);
  }

  addUnmountCallback(fn: EffectFunc) {
    this._unmountCallbacks.push(fn);
  }

  addEffect(effect: Effect) {
    this._effects.push(effect);
  }

  mount(vnode: CompositeVNode) {
    this._vnode = vnode;

    const callbacks = this._mountCallbacks;
    while (callbacks.length) {
      callbacks.shift()!();
    }

    // run effects created by `useEffect`
    this._effects.slice(1).forEach(({ fn }) => fn());
  }

  unmount() {
    this._vnode = null;

    const callbacks = this._unmountCallbacks;
    while (callbacks.length) {
      callbacks.shift()!();
    }
  }

  receive(props: Props) {
    const effectsToRun = new Set<EffectFunc>();

    Object.keys(this._props).forEach((propName) => {
      const oldValue = this._props[propName];
      const newValue = props[propName];

      if (!Object.is(oldValue, newValue)) {
        this._props[propName] = newValue;

        this._effects.forEach(({ fn, deps }) => {
          if (!effectsToRun.has(fn) && deps.has(propName)) {
            effectsToRun.add(fn);
          }
        });
      }
    });

    // run effects
    effectsToRun.forEach((fn) => fn());
  }

  // run effects asynchronously when a state changes
  updateAsync(stateId: Symbol) {
    this._effects.forEach(({ fn, deps }) => {
      if (deps.has(stateId)) {
        enqueueEffect(fn);
      }
    });
  }
}

/**
 * The standard way to define components
 *
 * @param setup - setup function returns a render function
 * @returns component constructor
 */
export function defineComponent(setup: SetupFunc) {
  class UserDefinedComponent extends BaseComponent {
    constructor(props: Props = {}, ref: DOMNodeRef | null) {
      super(props);

      currentSetupInstance = this;
      this._render = setup(this._props, ref);
      currentSetupInstance = null;
    }
  }

  return UserDefinedComponent;
}

export function useRef<T>(initialValue: T): Ref<T> {
  return { value: initialValue };
}

export function useState<T>(initialValue: T) {
  if (!currentSetupInstance) {
    throw new Error(
      'Invalid hook call. "useState" can only be called inside setup function.'
    );
  }

  const state: State<T> = {
    id: Symbol(),
    value: initialValue,
    compInstance: currentSetupInstance,
  };

  const getter: StateGetter<T> = () => {
    if (targetEffect) {
      targetEffect.deps.add(state.id);
    }

    return state.value;
  };

  const setter: StateSetter<T> = (value) => {
    const newVal: T =
      typeof value === 'function'
        ? (value as (prev: T) => T)(state.value)
        : value;

    if (!Object.is(newVal, state.value)) {
      state.value = newVal;
      state.compInstance.updateAsync(state.id);
    }

    return newVal;
  };

  return [getter, setter] as [StateGetter<T>, StateSetter<T>];
}

export function useEffect(fn: EffectFunc) {
  if (!currentSetupInstance) {
    throw new Error(
      'Invalid hook call. "useEffect" can only be called inside setup function.'
    );
  }

  const effect = {
    fn: () => {
      targetEffect = effect;
      fn();
      targetEffect = null;
    },
    deps: new Set<Dep>(),
  };

  currentSetupInstance.addEffect(effect);
}

export function onMount(fn: EffectFunc) {
  if (!currentSetupInstance) {
    throw new Error(
      'Invalid hook call. "onMount" can only be called inside setup function.'
    );
  }

  currentSetupInstance.addMountCallback(fn);
}

export function onUnmount(fn: EffectFunc) {
  if (!currentSetupInstance) {
    throw new Error(
      'Invalid hook call. "onUnmount" can only be called inside setup function.'
    );
  }

  currentSetupInstance.addUnmountCallback(fn);
}
