const svgNamespace = 'http://www.w3.org/2000/svg';
const mathmlNamespace = 'http://www.w3.org/1998/Math/MathML';

export function createElement(tag: string): Element {
  return tag === 'svg'
    ? document.createElementNS(svgNamespace, 'svg')
    : tag === 'math'
    ? document.createElementNS(mathmlNamespace, 'math')
    : document.createElement(tag);
}

export function createText(text: string) {
  return document.createTextNode(text);
}

export function setText(node: Text, text: string) {
  node.nodeValue = text;
}

export function insertNode(
  node: Node,
  parent: Node,
  anchor: Node | null = null
) {
  parent.insertBefore(node, anchor || null);
}

export function removeNode(node: Node) {
  node.parentNode?.removeChild(node);
}
