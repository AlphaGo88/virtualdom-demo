import { h, defineComponent } from 'vdom';
import Hello from './Hello';

export default defineComponent(() => {
  return (props) => <Hello name={props.name} />;
});
