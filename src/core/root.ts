import type { JSXNode } from 'shared/types';
import { VNode } from 'core/vnode';
import { createJSXElement } from 'core/jsx';
import { isValidContainer } from 'dom/domContainer';

interface Root {
  container: Element;
  rootVNode: VNode;
  render: (element: JSXNode) => void;
  unmount: () => void;
}

export function createRoot(container: Element) {
  if (!isValidContainer(container)) {
    throw new Error('Target container is not a DOM element.');
  }

  const rootElement = createJSXElement('__ROOT__', null, null, {});
  const rootVNode = new VNode(rootElement);
  rootVNode.node = container;

  const root: Root = {
    container,
    rootVNode,

    render(element: JSXNode) {
      const { rootVNode } = this;

      if (rootVNode.child) {
        rootVNode.child.receive(element);
      } else {
        container.innerHTML = '';

        const vnode = new VNode(element);
        vnode.parent = rootVNode;
        rootVNode.child = vnode;

        const node = vnode.mount();
        if (node) {
          container.appendChild(node);
        }
      }
    },

    unmount() {
      this.rootVNode.unmount();
      this.container.innerHTML = '';
    },
  };

  return root;
}
