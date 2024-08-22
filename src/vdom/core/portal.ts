import { JSX_PORTAL_TYPE } from '../shared/symbols';
import type { JSXChildren } from '../shared/types';
import { createJSXElement } from '../jsx';

export function createPortal(children: JSXChildren) {
  return createJSXElement(JSX_PORTAL_TYPE, null, null, { children });
}
