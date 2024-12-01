import { isArray } from 'vdom/shared/utils';

type Style = Record<string, string | string[]> | null;

export function setValueForStyles(el: Element, next: Style, prev: Style) {
  const style = (el as HTMLElement).style;
  if (next) {
    if (prev) {
      for (const key in prev) {
        if (next[key] == null) {
          setStyle(style, key, '');
        }
      }
    }
    for (const key in next) {
      setStyle(style, key, next[key]);
    }
  } else {
    el.removeAttribute('style');
  }
}

const importantRE = /\s*!important$/;

function setStyle(
  style: CSSStyleDeclaration,
  name: string,
  value: string | string[]
) {
  if (isArray(value)) {
    value.forEach((v) => setStyle(style, name, v));
  } else {
    if (value == null) value = '';
    if (importantRE.test(value)) {
      // !important
      style.setProperty(name, value.replace(importantRE, ''), 'important');
    } else {
      style.setProperty(name, value);
    }
  }
}
