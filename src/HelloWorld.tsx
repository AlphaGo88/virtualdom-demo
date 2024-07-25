import { h, defineComponent, createSignal } from 'vdom';

export default defineComponent((props) => {
  const [name, setName] = createSignal('Steve');

  return () => <div>Hello {name()}</div>;
});
