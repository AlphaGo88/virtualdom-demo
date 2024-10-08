import { createPortal, defineComponent } from 'vdom';
import type { Todo } from './types';

export default defineComponent(
  (props: {
    visible: boolean;
    todo: Todo;
    onChange: (todo: Todo) => void;
    onSubmit: () => void;
    onClose: () => void;
  }) => {
    function onInput(event: Event) {
      props.onChange({
        ...props.todo,
        title: (event.target as HTMLInputElement).value,
      });
    }

    function onPriorityChange(event: Event) {
      props.onChange({
        ...props.todo,
        priority: (event.target as HTMLInputElement).value,
      });
    }

    function onDescInput(event: Event) {
      props.onChange({
        ...props.todo,
        desc: (event.target as HTMLTextAreaElement).value,
      });
    }

    return () => {
      const canSubmit = !!props.todo.title && !!props.todo.desc;
      const style = `display: ${props.visible ? 'block' : 'none'}`;

      const addTodo = (
        <div className='add-todo-mask' style={style}>
          <div className='add-todo'>
            <div className='add-todo-close' onClick={props.onClose}>
              x
            </div>

            <h3>Add Todo</h3>

            <form>
              <div>
                <input
                  type='radio'
                  id='urgent'
                  name='priority'
                  value='urgent'
                  checked={props.todo.priority === 'urgent'}
                  onChange={onPriorityChange}
                />
                <label htmlFor='urgent'>urgent</label>
                <input
                  type='radio'
                  id='normal'
                  name='priority'
                  value='normal'
                  checked={props.todo.priority === 'normal'}
                  onChange={onPriorityChange}
                />
                <label htmlFor='normal'>normal</label>
              </div>
              <br />
              <div>
                <input
                  type='text'
                  id='title'
                  placeholder='title'
                  value={props.todo.title}
                  onInput={onInput}
                />
              </div>
              <br />
              <div>
                <textarea
                  placeholder='desc'
                  rows='4'
                  value={props.todo.desc}
                  onInput={onDescInput}
                />
              </div>
              <br />

              <button
                type='button'
                disabled={!canSubmit}
                onClick={props.onSubmit}
              >
                OK
              </button>
            </form>
          </div>
        </div>
      );

      return createPortal(addTodo, document.body);
    };
  }
);
