export type Key = string;

export interface Ref<T> {
  value: T;
}

export type DOMNodeRef = Ref<Element | null>;

export interface Props {
  [propName: string]: any;
  children?: JSXChildren;
}

export type JSXChildren = JSXNode | JSXNode[];

export interface JSXPortal {
  $$typeof: Symbol;
  key: Key | null;
  children: JSXChildren;
  container: Element | DocumentFragment;
}

export type JSXElementTag = string | Symbol | Function;

export interface JSXElement {
  $$typeof: Symbol;
  tag: JSXElementTag;
  key: Key | null;
  ref: DOMNodeRef | null;
  props: Props;
}

export type JSXNode =
  | JSXPortal
  | JSXElement
  | number
  | string
  | boolean
  | null
  | undefined;

export type DOMNode = Element | Text | DocumentFragment;
