import { isFunction } from 'vdom/shared/utils';

const invokerKey = Symbol();

interface Invoker extends EventListener {
  value: Function;
}

export function setValueForEventListener(
  el: Element & { [invokerKey]?: Record<string, Invoker | undefined> },
  name: string,
  value: unknown,
  prevValue: unknown
) {
  const eventName = name.slice(2).toLowerCase();
  const isFunc = isFunction(value);
  const invokers = el[invokerKey] || (el[invokerKey] = {});
  const existingInvoker = invokers[eventName];

  if (isFunc && existingInvoker) {
    // update
    existingInvoker.value = value;
  } else {
    if (isFunc) {
      // add
      const invoker = (invokers[eventName] = createInvoker(value));
      el.addEventListener(eventName, invoker);
    } else if (existingInvoker) {
      // remove
      el.removeEventListener(eventName, existingInvoker);
      invokers[eventName] = undefined;
    }
  }
}

function createInvoker(initialValue: Function) {
  const invoker: Invoker = (e: Event) => {
    invoker.value(e);
  };
  invoker.value = initialValue;
  return invoker;
}
