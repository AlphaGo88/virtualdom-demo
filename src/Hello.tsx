import { defineComponent, onMount, onUnmount } from 'vdom';

export default defineComponent((props) => {
  onMount(() => console.log('mount'));
  onUnmount(() => console.log('unmount'));

  return () => <div>Hello {props.name}</div>;
});
