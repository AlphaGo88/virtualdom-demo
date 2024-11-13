import { currentSetupInstance } from 'core/component';
import { activeEffect } from 'core/effect';

export function onMount(fn: () => void) {
  if (__DEV__) {
    if (!currentSetupInstance) {
      console.error('"onMount" should not be called outside setup function.');
    }

    if (activeEffect) {
      console.error(
        '"onMount" should not be called inside render function or "useEffect".'
      );
    }
  }
  currentSetupInstance?.addMountCallback(fn);
}

export function onUnmount(fn: () => void) {
  if (__DEV__) {
    if (!currentSetupInstance) {
      console.error('"onUnmount" should not be called outside setup function.');
    }

    if (activeEffect) {
      console.error(
        '"onUnmount" should not be called inside render function or "useEffect".'
      );
    }
  }
  currentSetupInstance?.addUnmountCallback(fn);
}
