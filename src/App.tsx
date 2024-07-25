import { h, defineComponent } from 'vdom';
import HelloWorld from './HelloWorld';

export default defineComponent(() => {
  return () => (
    <div>
      <h3>🌈</h3>
      <HelloWorld name='Steve' />
    </div>
  );
});
