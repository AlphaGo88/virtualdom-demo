import type { Ref } from 'shared/types';

// ref is not reactive, it should be used to access the dom element.
export function useRef<T>(initialValue: T): Ref<T> {
  return { value: initialValue };
}
