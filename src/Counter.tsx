import { h, defineComponent, createSignal } from 'vdom';

export default defineComponent(() => {
  const [count, setCount] = createSignal(0);
  const [count2, setCount2] = createSignal(0);

  function handleClick() {
    setCount((prev) => prev + 1);
    setCount2((prev) => prev + 1);
  }

  return () => (
    <div>
      <span>{count()}</span>
      <span>{count2()}</span>
      <button type='button' onClick={handleClick}>
        +
      </button>
    </div>
  );
});
