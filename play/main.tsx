import { createRoot } from 'vdom';
import TodoApp from './TodoApp';

createRoot(document.getElementById('root')!).render(<TodoApp />);
