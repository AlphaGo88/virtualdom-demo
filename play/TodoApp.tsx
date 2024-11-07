import { defineComponent, useEffect, useStore } from 'vdom';
import type { Todo } from './types';
import AddTodo from './AddTodo';
import './styles.css';

export default defineComponent(() => {
  const store = useStore<{
    todoList: Todo[];
    addTodoVisible: boolean;
    editIndex: number;
  }>({
    todoList: [],
    addTodoVisible: false,
    editIndex: -1,
  });

  useEffect(() => {
    console.log(store.addTodoVisible);
  });

  function onAddClick() {
    store.addTodoVisible = true;
  }

  function onSubmitNewTodo(todo: Todo) {
    store.addTodoVisible = false;
    store.todoList.push(todo);
  }

  function onCloseAddTodo() {
    store.addTodoVisible = false;
  }

  function onRemoveTodo(index: number) {
    store.todoList.splice(index, 1);
  }

  function onDescClick(index: number) {
    store.editIndex = index;
  }

  function onDescInput(event: Event, index: number) {
    store.todoList[index].desc = (event.target as HTMLTextAreaElement).value;
  }

  function onDescBlur() {
    store.editIndex = -1;
  }

  return () => (
    <div className='todo-app'>
      <h2>🌈 Todo App 🌈</h2>
      <button onClick={onAddClick}>Add Todo</button>
      <br />
      <ul>
        {store.todoList.map((todo, i) => (
          <li className='todo-li'>
            <h3>
              {todo.title}
              <span className='remove-btn' onClick={() => onRemoveTodo(i)}>
                ❌
              </span>
            </h3>
            {i === store.editIndex ? (
              <textarea
                value={todo.desc}
                onInput={(e: Event) => onDescInput(e, i)}
                onBlur={onDescBlur}
              />
            ) : (
              <p onClick={() => onDescClick(i)}>{todo.desc}</p>
            )}
          </li>
        ))}
      </ul>
      <AddTodo
        visible={store.addTodoVisible}
        onSubmit={onSubmitNewTodo}
        onClose={onCloseAddTodo}
      />
    </div>
  );
});
