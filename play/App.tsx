import { defineComponent, useStore } from 'vdom';
import Greet from './Greet';
import Counter from './Counter';

export default defineComponent(() => {
  const form = useStore({
    name: 'Steve',
    sex: 'male',
    food: 'apple',
    agree: true,
    desc: '',
  });

  function handleInput(event: Event) {
    form.name = (event.target as HTMLInputElement).value;
  }

  function handleSexChange(event: Event) {
    form.sex = (event.target as HTMLInputElement).value;
  }

  function handleFoodChange(event: Event) {
    form.food = (event.target as HTMLSelectElement).value;
  }

  function handleAgreeChange(event: Event) {
    form.agree = (event.target as HTMLInputElement).checked;
  }

  function handleDescInput(event: Event) {
    form.desc = (event.target as HTMLTextAreaElement).value;
  }

  return () => (
    <>
      <h3>🌈</h3>
      <input type='text' value={form.name} autofocus onInput={handleInput} />
      <Greet key='1' name={form.name} />
      <Counter />
      <br />
      <form action=''>
        <div>
          <input
            type='radio'
            id='male'
            name='sex'
            value='male'
            checked={form.sex === 'male'}
            onChange={handleSexChange}
          />
          <label htmlFor='male'>male</label>
          <input
            type='radio'
            id='female'
            name='sex'
            value='female'
            checked={form.sex === 'female'}
            onChange={handleSexChange}
          />
          <label htmlFor='female'>female</label>
        </div>
        <br />
        <div>
          <select
            id='food'
            name='food'
            value={form.food}
            onChange={handleFoodChange}
          >
            <option value='apple'>apple</option>
            <option value='banana'>banana</option>
            <option value='orange'>orange</option>
          </select>
          <label htmlFor='food'></label>
        </div>
        <br />
        <div>
          <input
            type='checkbox'
            name='agree'
            id='agree'
            checked={form.agree}
            onChange={handleAgreeChange}
          />
          <label htmlFor='agree'>agree</label>
        </div>
        <br />
        <div>
          <textarea
            name='desc'
            id='desc'
            value={form.desc}
            onInput={handleDescInput}
          />
        </div>
      </form>
    </>
  );
});
