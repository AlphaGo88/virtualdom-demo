import { defineComponent, useEffect, useMutable } from 'vdom';
import type { Todo } from './types';
import AddTodo from './AddTodo';
import './styles.css';

export default defineComponent(() => {
  const state = useMutable<{
    todoList: Todo[];
    addTodoVisible: boolean;
    editIndex: number;
  }>({
    todoList: [],
    addTodoVisible: false,
    editIndex: -1,
  });

  useEffect(() => {
    console.log(state.addTodoVisible);
  });

  function onAddClick() {
    state.addTodoVisible = true;
  }

  function onSubmitNewTodo(todo: Todo) {
    state.addTodoVisible = false;
    state.todoList.push(todo);
  }

  function onCloseAddTodo() {
    state.addTodoVisible = false;
  }

  function onRemoveTodo(index: number) {
    state.todoList.splice(index, 1);
  }

  function onDescClick(index: number) {
    state.editIndex = index;
  }

  function onDescInput(event: Event, index: number) {
    state.todoList[index].desc = (event.target as HTMLTextAreaElement).value;
  }

  function onDescBlur() {
    state.editIndex = -1;
  }

  return () => (
    <div class='todo-app'>
      <h2>🌈 Todo App 🌈</h2>
      <button onClick={onAddClick}>Add Todo</button>
      <br />
      <ul>
        {state.todoList.map((todo, i) => (
          <li class='todo-li'>
            <h3>
              {todo.title}
              <span class='remove-btn' onClick={() => onRemoveTodo(i)}>
                ❌
              </span>
            </h3>
            {i === state.editIndex ? (
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
        visible={state.addTodoVisible}
        onSubmit={onSubmitNewTodo}
        onClose={onCloseAddTodo}
      />
    </div>
  );
});
