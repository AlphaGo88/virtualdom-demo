import { defineComponent, useEffect, useState } from 'vdom';
import type { Todo } from './types';
import AddTodo from './AddTodo';

export default defineComponent(() => {
  const [todoList, setTodoList] = useState<Todo[]>([]);
  const [addTodoVisible, setAddTodoVisible] = useState(false);
  const [newTodo, setNewTodo] = useState<Todo>({
    title: '',
    priority: 'normal',
    desc: '',
  });

  useEffect(() => {
    console.log(addTodoVisible());
  });

  function handleAddClick() {
    setNewTodo({
      title: '',
      priority: 'normal',
      desc: '',
    });
    setAddTodoVisible(true);
  }

  function onNewTodoChange(todo: Todo) {
    setNewTodo(todo);
  }

  function onSubmitNewTodo() {
    setAddTodoVisible(false);
    setTodoList([...todoList(), newTodo()]);
  }

  function onCloseNewTodo() {
    setAddTodoVisible(false);
  }

  return () => {
    const todos = todoList().map((todo) => (
      <li key={todo.title}>
        <h3>{todo.title}</h3>
        <p>{todo.desc}</p>
      </li>
    ));

    return (
      <div class='todo-app'>
        <h2>🌈 Todo App 🌈</h2>
        <button onClick={handleAddClick}>Add Todo</button>
        <br />
        <ul>{todos}</ul>
        <AddTodo
          visible={addTodoVisible()}
          todo={newTodo()}
          onChange={onNewTodoChange}
          onSubmit={onSubmitNewTodo}
          onClose={onCloseNewTodo}
        />
      </div>
    );
  };
});
