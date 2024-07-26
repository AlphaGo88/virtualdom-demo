import { h, defineComponent, createSignal } from 'vdom';

export default defineComponent(() => {
  const [count, setCount] = createSignal(0);
  function handleClick() {
    setCount((prev) => prev + 1);
  }

  return () => (
    <div>
      {count()}
      <button type='button' onClick={handleClick}>
        +
      </button>
    </div>
  );
});
