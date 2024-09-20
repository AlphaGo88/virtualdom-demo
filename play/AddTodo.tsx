import { createPortal, defineComponent } from 'vdom';
import type { Todo } from './types';

import './styles.css';

export default defineComponent(
  (props: {
    visible: boolean;
    todo: Todo;
    onChange: (todo: Todo) => void;
    onSubmit: () => void;
    onClose: () => void;
  }) => {
    function handleInput(event: Event) {
      props.onChange({
        ...props.todo,
        title: (event.target as HTMLInputElement).value,
      });
    }

    function handlePriorityChange(event: Event) {
      props.onChange({
        ...props.todo,
        priority: (event.target as HTMLInputElement).value,
      });
    }

    function handleDescInput(event: Event) {
      props.onChange({
        ...props.todo,
        desc: (event.target as HTMLTextAreaElement).value,
      });
    }

    function handleSubmit() {
      props.onSubmit();
    }

    function handleClose() {
      props.onClose();
    }

    return () => {
      const canSubmit = !!props.todo.title && !!props.todo.desc;
      const style = `display: ${props.visible ? 'block' : 'none'}`;

      const addTodo = (
        <div className='add-todo-mask' style={style}>
          <div className='add-todo'>
            <div className='add-todo-close' onClick={handleClose}>
              x
            </div>

            <h3>Add Todo</h3>

            <form>
              <div>
                <input
                  type='text'
                  value={props.todo.title}
                  autofocus
                  onInput={handleInput}
                />
              </div>
              <br />
              <div>
                <input
                  type='radio'
                  id='urgent'
                  name='priority'
                  value='urgent'
                  checked={props.todo.priority === 'urgent'}
                  onChange={handlePriorityChange}
                />
                <label htmlFor='urgent'>urgent</label>
                <input
                  type='radio'
                  id='urgent'
                  name='priority'
                  value='normal'
                  checked={props.todo.priority === 'normal'}
                  onChange={handlePriorityChange}
                />
                <label htmlFor='normal'>normal</label>
              </div>
              <br />
              <div>
                <textarea
                  name='desc'
                  id='desc'
                  value={props.todo.desc}
                  onInput={handleDescInput}
                />
              </div>
              <br />
            </form>

            <button disabled={!canSubmit} onClick={handleSubmit}>
              OK
            </button>
          </div>
        </div>
      );

      return createPortal(addTodo, document.body);
    };
  }
);
