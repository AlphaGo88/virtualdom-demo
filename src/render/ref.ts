import type { Ref } from 'vdom/shared/types';

// ref is not reactive, it can be used to access the dom element.
export function useRef<T>(initialValue: T): Ref<T> {
  return { value: initialValue };
}
