import {
  JSX_ELEMENT_TYPE,
  JSX_FRAGMENT_TYPE,
  JSX_PORTAL_TYPE,
  COMPONENT_TYPE,
} from 'shared/symbols';
import type { JSXElement } from 'shared/types';

export function isJSXEmpty(element: unknown) {
  return element == null || typeof element === 'boolean';
}

export function isJSXPortal(element: unknown) {
  return (
    typeof element === 'object' &&
    element !== null &&
    element['$$typeof'] === JSX_PORTAL_TYPE
  );
}

export function isJSXElement(element: unknown) {
  return (
    typeof element === 'object' &&
    element !== null &&
    element['$$typeof'] === JSX_ELEMENT_TYPE
  );
}

export function isJSXText(element: unknown) {
  return (
    !isJSXEmpty(element) && !isJSXPortal(element) && !isJSXElement(element)
  );
}

export function isComponentType(type: unknown) {
  return typeof type === 'function' && type['$$typeof'] === COMPONENT_TYPE;
}

export function isFragmentType(type: unknown) {
  return type === JSX_FRAGMENT_TYPE;
}

export function isSameJSXType(prevElement: unknown, nextElement: unknown) {
  if (isJSXPortal(prevElement) && isJSXPortal(nextElement)) {
    return true;
  }

  if (
    isJSXElement(prevElement) &&
    isJSXElement(nextElement) &&
    (prevElement as JSXElement).type === (nextElement as JSXElement).type
  ) {
    return true;
  }

  if (isJSXText(prevElement) && isJSXText(nextElement)) {
    return true;
  }

  return false;
}
