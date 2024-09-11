import { defineComponent, useEffect } from 'vdom';
import Hello from './Hello';

export default defineComponent<{ name: string }>((props) => {
  useEffect(() => console.log(props.name));

  return () =>
    props.name.length > 3 ? (
      <Hello name={props.name} />
    ) : (
      <div>yo {props.name}</div>
    );
});
