import { Props } from 'vdom/shared/types';
import { hasChanged, isSymbol } from 'vdom/shared/utils';
import { setValueForStyles } from './styles';
import { setValueForEventListener } from './events';

const xlinkNamespace = 'http://www.w3.org/1999/xlink';
const xmlNamespace = 'http://www.w3.org/XML/1998/namespace';

function setValueForAttribute(
  node: Element,
  name: string,
  value: unknown,
  namespace?: string
) {
  if (value == null || isSymbol(value)) {
    node.removeAttribute(name);
  } else {
    if (namespace) {
      node.setAttributeNS(namespace, name, '' + value);
    } else {
      node.setAttribute(name, '' + value);
    }
  }
}

function setProp(
  el: Element,
  tag: string,
  key: string,
  value: any,
  prevValue: any
): void {
  switch (key) {
    // These are very common props and therefore are in the beginning of the switch.
    case 'class':
    case 'tabindex':
    case 'dir':
    case 'role':
    case 'viewBox':
    case 'width':
    case 'height':
      setValueForAttribute(el, key, value);
      break;

    case 'style':
      setValueForStyles(el, value, prevValue);
      break;

    // These are props that we set as DOM properties rather than attributes.
    case 'checked':
    case 'multiple':
    case 'muted':
    case 'selected':
      (el as any)[key] = value;
      break;

    case 'value':
      if (tag === 'input' || tag === 'select' || tag === 'textarea') {
        (el as any)[key] = value;
      } else {
        setValueForAttribute(el, 'value', value);
      }
      break;

    case 'onClick':
      setValueForEventListener(el, 'onClick', value, prevValue);
      break;

    // We polyfill it separately on the client during commit.
    case 'autofocus':
      break;

    // These are boolean attributes.
    case 'allowfullscreen':
    case 'async':
    case 'autoplay':
    case 'controls':
    case 'default':
    case 'defer':
    case 'disabled':
    case 'disablePictureInPicture':
    case 'disableRemotePlayback':
    case 'formnovalidate':
    case 'hidden':
    case 'loop':
    case 'nomodule':
    case 'novalidate':
    case 'open':
    case 'playsinline':
    case 'readonly':
    case 'required':
    case 'reversed':
    case 'scoped':
    case 'seamless':
    case 'itemscope':
      if (value === '' || (value && !isSymbol(value))) {
        el.setAttribute(key, '');
      } else {
        el.removeAttribute(key);
      }
      break;

    // Overloaded Boolean
    // An attribute that can be used as a flag as well as with a value.
    // When true, it should be present (set either to an empty string or its name).
    // When false, it should be omitted.
    // For any other value, should be present with that value.
    case 'capture':
    case 'download':
      if (value === true) {
        el.setAttribute(key, '');
      } else if (value !== false && value != null && !isSymbol(value)) {
        el.setAttribute(key, value);
      } else {
        el.removeAttribute(key);
      }
      break;

    // These attributes are ignored.
    case 'children':
    case 'innerHTML':
    case 'innerText':
    case 'textContent':
      break;

    case 'xlink:href':
    case 'xlink:actuate':
    case 'xlink:arcrole':
    case 'xlink:role':
    case 'xlink:show':
    case 'xlink:title':
    case 'xlink:type':
      setValueForAttribute(el, key, value, xlinkNamespace);
      break;

    case 'xml:base':
    case 'xml:lang':
    case 'xml:space':
      setValueForAttribute(el, key, value, xmlNamespace);
      break;

    default:
      if (key.length > 2 && key[0] === 'o' && key[1] === 'n') {
        setValueForEventListener(el, key, value, prevValue);
      } else {
        setValueForAttribute(el, key, value);
      }
  }
}

export function setProps(el: Element, props: Props, prevProps: Props = {}) {
  for (const key of Object.keys(props)) {
    const value = props[key];
    const prevValue = prevProps[key];

    if (hasChanged(value, prevValue)) {
      setProp(el, el.tagName.toLowerCase(), key, value, prevValue);
    }
  }
}
