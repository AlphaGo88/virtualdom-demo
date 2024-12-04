import {
  JSX_ELEMENT_TYPE,
  JSX_FRAGMENT_TYPE,
  JSX_PORTAL_TYPE,
  COMPONENT_TYPE,
} from 'vdom/shared/symbols';
import type { JSXElement } from 'vdom/shared/types';
import { isFunction, isObject } from 'vdom/shared/utils';

export function isJSXEmpty(element: unknown) {
  return element == null;
}

export function isJSXPortal(element: unknown) {
  return isObject(element) && (element as any).$$typeof === JSX_PORTAL_TYPE;
}

export function isJSXElement(element: unknown) {
  return isObject(element) && (element as any).$$typeof === JSX_ELEMENT_TYPE;
}

export function isJSXText(element: unknown) {
  return (
    !isJSXEmpty(element) && !isJSXPortal(element) && !isJSXElement(element)
  );
}

export function isComponentType(type: unknown) {
  return isFunction(type) && (type as any).$$typeof === COMPONENT_TYPE;
}

export function isFragmentType(type: unknown) {
  return type === JSX_FRAGMENT_TYPE;
}

export function isSameJSXType(prevElement: unknown, nextElement: unknown) {
  if (isJSXEmpty(prevElement) && isJSXEmpty(nextElement)) {
    return true;
  }

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
