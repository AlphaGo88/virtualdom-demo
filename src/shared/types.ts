export type Key = number | string;

export interface Ref<T> {
  value: T;
}

export type Props = Record<string, any>;

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
  ref: Ref<any> | null;
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

export type JSXChildren = JSXNode | JSXNode[];
