import { h, defineComponent, createSignal } from 'vdom';
import HelloWorld from './HelloWorld';
import Counter from './Counter';

export default defineComponent(() => {
  const [name, setName] = createSignal('Steve');

  // setTimeout(() => setName('Jobs'), 3000);

  return () => (
    <div>
      <h3>🌈</h3>
      <HelloWorld name={name()} />
      <Counter />
    </div>
  );
});
