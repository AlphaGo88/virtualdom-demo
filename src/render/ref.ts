import type { Ref } from 'vdom/shared/types';

// ref is not reactive, it should be used to access the dom element.
export function useRef<T>(initialValue: T): Ref<T> {
  return { value: initialValue };
}
