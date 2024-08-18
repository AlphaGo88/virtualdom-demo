export type Key = string;

export interface Ref<T> {
  value: T;
}

export type DOMNodeRef = Ref<Element | null>;

export interface Props {
  [propName: string]: any;
  children?: JSXNode[];
}

export interface JSXElement {
  $$typeof: Symbol;
  type: string | Symbol | Function;
  key: Key | undefined;
  ref: DOMNodeRef | undefined;
  props: Props;
}

export type JSXNode = JSXElement | number | string | boolean | null | undefined;
