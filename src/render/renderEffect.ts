import {
  type Effect,
  activeEffect,
  setActiveEffect,
} from 'vdom/reactivity/effect';
import type { Dep } from 'vdom/reactivity/dep';
import type { ComponentInstance } from './component';
import { type VNode, updateChildren } from './vnode';

export class RenderEffect implements Effect {
  isRender: boolean = true;
  deps: Dep[] = [];

  constructor(
    public componentInstance: ComponentInstance,
    public vnode: VNode
  ) {
    componentInstance.addUnmountCallback(() => this.dispose());
  }

  run() {
    const { componentInstance, vnode } = this;
    let lastEffect = activeEffect;
    try {
      setActiveEffect(this);
      this.deps.forEach((dep) => {
        dep.set(this, false);
      });
      const renderedElement = componentInstance.render();
      setActiveEffect(lastEffect);
      if (vnode.child) {
        updateChildren(vnode, renderedElement);
      }
      return renderedElement;
    } catch {
      setActiveEffect(lastEffect);
    }
  }

  dispose() {
    this.deps.forEach((dep) => {
      dep.delete(this);
      if (dep.size === 0) {
        dep.cleanup();
      }
    });
  }
}
