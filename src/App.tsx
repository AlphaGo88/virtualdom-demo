import { h, defineComponent, createSignal } from 'vdom';
import HelloWorld from './HelloWorld';
import Counter from './Counter';

export default defineComponent(() => {
  const [name, setName] = createSignal('Steve');

  function handleInput(event: Event) {
    setName((event.target as HTMLInputElement).value);
  }

  return () => (
    <div className='abc'>
      <h3>🌈</h3>
      <input type='text' value={name()} onInput={handleInput} />
      <HelloWorld name={name()} />
      <Counter />
      <ul>
        <li>1</li>
        <li>2</li>
        <li>3</li>
        <li>4</li>
      </ul>
    </div>
  );
});
