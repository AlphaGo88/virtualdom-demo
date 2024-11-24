import { createRoot } from 'vdom';
import TodoApp from './TodoApp';
// import Test from './Test';

createRoot(document.getElementById('root')!).render(<TodoApp />);
// createRoot(document.getElementById('root')!).render(<Test />);
