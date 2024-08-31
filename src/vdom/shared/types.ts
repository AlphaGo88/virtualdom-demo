export interface ValueContainer<T> {
  value: T;
}

export type Key = string;

export interface Ref<T> {
  value: T | null;
}

export type Props<P> = P & {
  key?: string | number;
  ref?: Ref<Element>;
  children?: JSXChildren;
};

export interface JSXPortal {
  $$typeof: symbol;
  key: Key | null;
  children: JSXChildren;
  container: Element;
}

export interface JSXElement {
  $$typeof: symbol;
  type: any;
  key: Key | null;
  ref: Ref<Element> | null;
  props: any;
}

export type JSXNode =
  | JSXPortal
  | JSXElement
  | number
  | string
  | boolean
  | null
  | undefined;

export type JSXChildren = JSXNode | JSXNode[];

export type DOMNode = Element | Text | DocumentFragment;
