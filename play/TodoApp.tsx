import { defineComponent, useEffect, useStore } from 'vdom';
import type { Todo } from './types';
import AddTodo from './AddTodo';
import './styles.css';

export default defineComponent(() => {
  const store = useStore<{
    todoList: Todo[];
    addTodoVisible: boolean;
    newTodo: Todo;
  }>({
    todoList: [],
    addTodoVisible: false,
    newTodo: {
      title: '',
      priority: 'normal',
      desc: '',
    },
  });

  useEffect(() => {
    console.log(store.addTodoVisible);
  });

  function onAddClick() {
    store.newTodo = {
      title: '',
      priority: 'normal',
      desc: '',
    };
    store.addTodoVisible = true;
  }

  function onNewTodoChange(todo: Todo) {
    store.newTodo = todo;
  }

  function onSubmitNewTodo() {
    store.addTodoVisible = false;
    store.todoList.push(store.newTodo);
  }

  function onCloseAddTodo() {
    store.addTodoVisible = false;
  }

  return (
    <div class='todo-app'>
      <h2>🌈 Todo App 🌈</h2>
      <button onClick={onAddClick}>Add Todo</button>
      <br />
      <ul>
        {store.todoList.map((todo) => (
          <li key={todo.title}>
            <h3>{todo.title}</h3>
            <p>{todo.desc}</p>
          </li>
        ))}
      </ul>
      <AddTodo
        visible={store.addTodoVisible}
        todo={store.newTodo}
        onChange={onNewTodoChange}
        onSubmit={onSubmitNewTodo}
        onClose={onCloseAddTodo}
      />
    </div>
  );
});
