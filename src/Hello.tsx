import { h, defineComponent } from 'vdom';

export default defineComponent(() => {
  return (props) => <div>Hello {props.name}</div>;
});
