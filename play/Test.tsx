import { defineComponent, useEffect, useStore } from 'vdom';

export default defineComponent(() => {
  const obj = { a: 1 };
  const store = useStore<{ arr: any[] }>({
    arr: [0, 1, 2, 3],
  });

  function onPush() {
    store.arr.push(4);
  }

  function onSplice() {
    store.arr.splice(1);
  }

  function onSetLength() {
    store.arr.length = 1;
  }

  return () => {
    return (
      <div>
        {/* <div>{store.arr[3]}</div>
        <div>{store.arr[4]}</div> */}
        <div>{store.arr.length}</div>
        <button onClick={onPush}>push</button>
        <button onClick={onSplice}>splice</button>
        <button onClick={onSetLength}>set length</button>
      </div>
    );
  };
});
