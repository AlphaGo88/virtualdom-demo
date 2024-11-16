import { defineComponent, useEffect, useStore } from 'vdom';

export default defineComponent(() => {
  const store = useStore({
    arr: [0, 1, 2, 3],
  });

  function onPush() {
    store.arr.push(4);
  }

  function onSplice() {
    store.arr.splice(1);
  }

  function onSetLength() {
    store.arr.length = 2;
  }

  return () => (
    <div>
      {/* <div>{store.arr[3]}</div>
        <div>{store.arr[4]}</div> */}
      <div>{store.arr.length}</div>
      <button onClick={onPush}>push</button>
      <button onClick={onSplice}>splice(1)</button>
      <button onClick={onSetLength}>set length(2)</button>
    </div>
  );
});
