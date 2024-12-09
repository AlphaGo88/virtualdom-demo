export const isString = (val: unknown) => typeof val === 'string';

export const isSymbol = (val: unknown) => typeof val === 'symbol';

export const isObject = (val: unknown) =>
  val !== null && typeof val === 'object';

export const isPlainObject = (val: unknown) =>
  Object.prototype.toString.call(val) === '[object Object]';

export const isArray = Array.isArray;

export const isFunction = (val: unknown) => typeof val === 'function';

export const isIndexKey = (key: unknown) => {
  return (
    isString(key) &&
    key !== 'NaN' &&
    key[0] !== '-' &&
    '' + parseInt(key, 10) === key
  );
};

export const hasOwn = (val: object, key: PropertyKey) =>
  Object.prototype.hasOwnProperty.call(val, key);

export const hasChanged = (value: unknown, oldValue: unknown) =>
  !Object.is(value, oldValue);
