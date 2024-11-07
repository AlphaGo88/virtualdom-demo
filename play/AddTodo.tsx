import { createPortal, defineComponent, useStore, useEffect } from 'vdom';
import type { Todo } from './types';

export default defineComponent(
  (props: {
    visible: boolean;
    onSubmit: (todo: Todo) => void;
    onClose: () => void;
  }) => {
    const todo = useStore<Todo>({
      title: '',
      priority: 'normal',
      desc: '',
    });

    useEffect(() => {
      if (props.visible === false) {
        todo.title = '';
        todo.priority = 'normal';
        todo.desc = '';
      }
    });

    function onTitleInput(event: Event) {
      todo.title = (event.target as HTMLInputElement).value;
    }

    function onPriorityChange(event: Event) {
      todo.priority = (event.target as HTMLInputElement).value;
    }

    function onDescInput(event: Event) {
      todo.desc = (event.target as HTMLTextAreaElement).value;
    }

    function onSubmit() {
      props.onSubmit({ ...todo });
    }

    return () => {
      const style = `display: ${props.visible ? 'block' : 'none'}`;
      const canSubmit = !!todo.title && !!todo.desc;

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
                  checked={todo.priority === 'urgent'}
                  onChange={onPriorityChange}
                />
                <label htmlFor='urgent'>urgent</label>
                <input
                  type='radio'
                  id='normal'
                  name='priority'
                  value='normal'
                  checked={todo.priority === 'normal'}
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
                  value={todo.title}
                  onInput={onTitleInput}
                />
              </div>
              <br />

              <div>
                <textarea
                  placeholder='desc'
                  rows='4'
                  value={todo.desc}
                  onInput={onDescInput}
                />
              </div>
              <br />

              <button type='button' disabled={!canSubmit} onClick={onSubmit}>
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
