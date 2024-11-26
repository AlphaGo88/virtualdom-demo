import { activeEffect } from 'vdom/reactivity/effect';
import { currentSetupInstance } from './component';

export function onMount(fn: () => void) {
  if (!currentSetupInstance) {
    if (__DEV__) {
      console.error('"onMount" should not be called outside setup function.');
    }
  } else {
    if (__DEV__ && activeEffect) {
      console.error(
        '"onMount" should not be called inside render function or "useEffect".'
      );
    }
    currentSetupInstance.addMountCallback(fn);
  }
}

export function onUnmount(fn: () => void) {
  if (!currentSetupInstance) {
    if (__DEV__) {
      console.error('"onUnmount" should not be called outside setup function.');
    }
  } else {
    if (__DEV__ && activeEffect) {
      console.error(
        '"onUnmount" should not be called inside render function or "useEffect".'
      );
    }
    currentSetupInstance.addUnmountCallback(fn);
  }
}
