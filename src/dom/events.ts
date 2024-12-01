import { isFunction } from 'vdom/shared/utils';

export function setValueForEventListener(
  el: Element,
  key: string,
  value: any,
  prevValue: any
) {
  const eventName = key.slice(2).toLowerCase();

  if (isFunction(prevValue)) {
    el.removeEventListener(eventName, prevValue);
  }
  if (isFunction(value)) {
    el.addEventListener(eventName, value);
  }
}
