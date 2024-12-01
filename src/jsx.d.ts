import { NativeElements, ReservedProps } from 'vdom/dom/jsx';

declare global {
  namespace JSX {
    export interface IntrinsicElements extends NativeElements {}
    export interface IntrinsicAttributes extends ReservedProps {}
  }
}
