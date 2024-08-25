import type { Props } from 'shared/types';
import { type AttrInfo, AttrType, attributes } from 'dom/attributes';

function getAttrInfo(propName: string) {
  return attributes.hasOwnProperty(propName) ? attributes[propName] : null;
}

function shouldIgnoreAttr(attrInfo: AttrInfo | null) {
  return attrInfo?.type === AttrType.RESERVED;
}

function isEventProp(propName: string) {
  return propName.slice(0, 2) === 'on';
}

export function updateNodeAttrs(
  node: Element,
  prevProps: Props,
  nextProps: Props
) {
  for (const propName of Object.keys(nextProps)) {
    const attrInfo = getAttrInfo(propName);
    const prevValue = prevProps[propName];
    const nextValue = nextProps[propName];

    if (shouldIgnoreAttr(attrInfo) || Object.is(prevValue, nextValue)) {
      continue;
    }

    if (isEventProp(propName)) {
      const eventName = propName.slice(2).toLowerCase();

      if (typeof prevValue === 'function') {
        node.removeEventListener(eventName, prevValue);
      }
      if (typeof nextValue === 'function') {
        node.addEventListener(eventName, nextValue);
      }
      continue;
    }

    // If the prop isn't in the special list, treat it as a simple attribute.
    if (attrInfo === null) {
      if (nextValue == null) {
        node.removeAttribute(propName);
      } else {
        node.setAttribute(propName, nextValue);
      }
      continue;
    }

    const { attrName, type, useIDL } = attrInfo;

    if (useIDL(node)) {
      if (nextValue == null) {
        node[attrName] = type === AttrType.BOOLEAN ? false : '';
      } else {
        node[attrName] = nextValue;
      }
      continue;
    }

    if (nextValue == null) {
      node.removeAttribute(attrName);
    } else {
      let attrValue: any;

      if (
        type === AttrType.BOOLEAN ||
        (type === AttrType.OVERLOADED_BOOLEAN && nextValue === true)
      ) {
        attrValue = '';
      } else {
        attrValue = '' + nextValue;
      }
      node.setAttribute(attrName, attrValue);
    }
  }
}
