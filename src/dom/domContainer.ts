export function isValidContainer(node: any) {
  return node != null && node.nodeType === Node.ELEMENT_NODE;
}
