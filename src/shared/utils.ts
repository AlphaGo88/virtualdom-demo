export function isString(val: unknown) {
  return typeof val === 'string';
}

export function isSymbol(val: unknown) {
  return typeof val === 'symbol';
}

export function isObject(val: unknown) {
  return val !== null && typeof val === 'object';
}

export function isPlainObject(val: unknown) {
  return Object.prototype.toString.call(val) === '[object Object]';
}

export const isArray = Array.isArray;

export function isFunction(val: unknown) {
  return typeof val === 'function';
}

export function isIndexKey(key: unknown) {
  return (
    isString(key) &&
    key !== 'NaN' &&
    key[0] !== '-' &&
    '' + parseInt(key, 10) === key
  );
}

export function hasOwn(val: object, key: string | symbol) {
  return Object.prototype.hasOwnProperty.call(val, key);
}

export function isSame(value: unknown, oldValue: unknown) {
  return Object.is(value, oldValue);
}
