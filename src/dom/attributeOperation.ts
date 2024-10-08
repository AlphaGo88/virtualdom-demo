import { Props } from 'shared/types';
import { type AttrInfo, AttrType, attributes } from 'dom/attributes';

function shouldIgnoreAttr(attrInfo: AttrInfo | null) {
  return attrInfo?.type === AttrType.RESERVED;
}

function isEventProp(propName: string) {
  return propName.slice(0, 2) === 'on';
}

export function updateNodeAttrs(
  node: Element,
  prevProps: Props = {},
  nextProps: Props = {}
) {
  for (const propName of Object.keys(nextProps)) {
    const attrInfo = attributes[propName];
    const oldVal = prevProps[propName];
    const newVal = nextProps[propName];

    if (shouldIgnoreAttr(attrInfo) || Object.is(oldVal, newVal)) {
      continue;
    }

    if (isEventProp(propName)) {
      const eventName = propName.slice(2).toLowerCase();

      if (typeof oldVal === 'function') {
        node.removeEventListener(eventName, oldVal);
      }

      if (typeof newVal === 'function') {
        node.addEventListener(eventName, newVal);
      }

      continue;
    }

    // If the prop isn't in the special list, treat it as a simple attribute.
    if (!attrInfo) {
      if (newVal == null) {
        node.removeAttribute(propName);
      } else {
        node.setAttribute(propName, newVal);
      }

      continue;
    }

    const { attrName, type, useIDL } = attrInfo;

    if (useIDL(node)) {
      if (newVal == null) {
        node[attrName] = type === AttrType.BOOLEAN ? false : '';
      } else {
        node[attrName] = newVal;
      }

      continue;
    }

    if (type === AttrType.BOOLEAN) {
      if (!newVal) {
        node.removeAttribute(attrName);
      } else {
        node.setAttribute(attrName, '');
      }

      continue;
    }

    if (type === AttrType.OVERLOADED_BOOLEAN) {
      if (newVal == null || newVal === false) {
        node.removeAttribute(attrName);
      } else if (newVal === true) {
        node.setAttribute(attrName, '');
      } else {
        node.setAttribute(attrName, newVal);
      }

      continue;
    }

    if (newVal == null) {
      node.removeAttribute(attrName);
    } else {
      node.setAttribute(attrName, newVal);
    }
  }
}
