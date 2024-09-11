export enum AttrType {
  RESERVED,
  STRING,
  BOOLEAN,
  OVERLOADED_BOOLEAN,
  NUMBER,
  POSITIVE_NUMBER,
}

export interface AttrInfo {
  propName: string;
  attrName: string;
  type: AttrType;
  useIDL: (node: Element) => boolean;
}

function createAttrInfo(
  propName: string,
  attrName: string,
  type: AttrType,
  useIDL: (node: Element) => boolean = () => false
): AttrInfo {
  return {
    propName,
    attrName,
    type,
    useIDL,
  };
}

export const attributes: Record<string, AttrInfo> = {};

// Reserved props are not written to the DOM.
['key', 'ref', 'children'].forEach((name) => {
  attributes[name] = createAttrInfo(name, name, AttrType.RESERVED);
});

// A few string attributes have a different name.
// This is a mapping from prop names to the attribute names.
[
  ['acceptCharset', 'accept-charset'],
  ['className', 'class'],
  ['htmlFor', 'for'],
  ['httpEquiv', 'http-equiv'],
].forEach(([name, attrName]) => {
  attributes[name] = createAttrInfo(name, attrName, AttrType.STRING);
});

// These are HTML boolean attributes.
[
  'allowFullScreen',
  'async',
  'autoFocus',
  'autoPlay',
  'controls',
  'default',
  'defer',
  'disabled',
  'disablePictureInPicture',
  'disableRemotePlayback',
  'formNoValidate',
  'hidden',
  'loop',
  'noModule',
  'noValidate',
  'open',
  'playsInline',
  'readOnly',
  'required',
  'reversed',
  'scoped',
  'seamless',
  // Microdata
  'itemScope',
].forEach((name) => {
  attributes[name] = createAttrInfo(name, name.toLowerCase(), AttrType.BOOLEAN);
});

// These props are set through IDL rather than `setAttribute`.
[
  'checked',
  // Note: `option.selected` is not updated if `select.multiple` is
  // disabled with `removeAttribute`.
  'multiple',
  'muted',
  'selected',
].forEach((name) => {
  attributes[name] = createAttrInfo(name, name, AttrType.BOOLEAN, () => true);
});

// A few elements set the "value" prop through IDL rather than `setAttribute`.
attributes.value = createAttrInfo('value', 'value', AttrType.STRING, (node) =>
  ['INPUT', 'SELECT', 'TEXTAREA'].includes(node.tagName)
);

// These are HTML attributes that are "overloaded booleans": they behave like
// booleans, but can also accept a string value.
['capture', 'download'].forEach((name) => {
  attributes[name] = createAttrInfo(name, name, AttrType.OVERLOADED_BOOLEAN);
});

// These are HTML attributes that must be positive numbers.
['cols', 'rows', 'size', 'span'].forEach((name) => {
  attributes[name] = createAttrInfo(name, name, AttrType.POSITIVE_NUMBER);
});

// These are HTML attributes that must be numbers.
['rowSpan', 'start'].forEach((name) => {
  attributes[name] = createAttrInfo(name, name, AttrType.NUMBER);
});
