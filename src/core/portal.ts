import { JSX_PORTAL_TYPE } from 'shared/symbols';
import type { JSXChildren, JSXPortal } from 'shared/types';
import { isValidContainer } from 'dom/domContainer';

export function createPortal(
  children: JSXChildren,
  container: Element,
  key?: string | number
): JSXPortal {
  if (!isValidContainer(container)) {
    throw new Error('Target container is not a DOM element.');
  }

  return {
    $$typeof: JSX_PORTAL_TYPE,
    key: key == null ? null : '' + key,
    children,
    container,
  };
}
