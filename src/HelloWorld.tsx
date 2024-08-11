import vdom, { defineComponent } from 'vdom';
import Hello from './Hello';

export default defineComponent((props) => {
  return () =>
    props.name.length > 3 ? (
      <Hello name={props.name} />
    ) : (
      <div>yo {props.name}</div>
    );
});
