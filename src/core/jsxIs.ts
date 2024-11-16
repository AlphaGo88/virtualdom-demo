import {
  JSX_ELEMENT_TYPE,
  JSX_FRAGMENT_TYPE,
  JSX_PORTAL_TYPE,
  COMPONENT_TYPE,
} from 'shared/symbols';
import type { JSXElement } from 'shared/types';

export function isJSXEmpty(element: any) {
  return element == null;
}

export function isJSXPortal(element: any) {
  return element['$$typeof'] === JSX_PORTAL_TYPE;
}

export function isJSXElement(element: any) {
  return element['$$typeof'] === JSX_ELEMENT_TYPE;
}

export function isJSXText(element: any) {
  return (
    !isJSXEmpty(element) && !isJSXPortal(element) && !isJSXElement(element)
  );
}

export function isComponentType(type: any) {
  return type['$$typeof'] === COMPONENT_TYPE;
}

export function isFragmentType(type: any) {
  return type === JSX_FRAGMENT_TYPE;
}

export function isSameJSXType(prevElement: any, nextElement: any) {
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
