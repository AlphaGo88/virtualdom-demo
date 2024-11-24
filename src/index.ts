import { createRoot } from 'vdom/render/root';
import { createPortal } from 'vdom/render/portal';
import { defineComponent } from 'vdom/render/component';
import { mergeProps } from 'vdom/render/props';
import { onMount, onUnmount } from 'vdom/render/lifecycle';
import { useRef } from 'vdom/render/ref';
import { useState } from 'vdom/reactivity/state';
import { useMutable, useShallowMutable } from 'vdom/reactivity/mutable';
import { useEffect } from 'vdom/reactivity/effect';

export {
  createRoot,
  createPortal,
  defineComponent,
  mergeProps,
  onMount,
  onUnmount,
  useRef,
  useState,
  useMutable,
  useShallowMutable,
  useEffect,
};
