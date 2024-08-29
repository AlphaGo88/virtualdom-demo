import { defineComponent, useState } from 'vdom';
import Greet from './Greet';
import Counter from './Counter';

export default defineComponent(() => {
  const [name, setName] = useState('Steve');
  const [sex, setSex] = useState('male');
  const [food, setFood] = useState('apple');
  const [agree, setAgree] = useState(true);
  const [desc, setDesc] = useState('');

  function handleInput(event: Event) {
    setName((event.target as HTMLInputElement).value);
  }

  function handleSexChange(event: Event) {
    setSex((event.target as HTMLInputElement).value);
  }

  function handleFoodChange(event: Event) {
    setFood((event.target as HTMLSelectElement).value);
  }

  function handleAgreeChange(event: Event) {
    setAgree((event.target as HTMLInputElement).checked);
  }

  function handleDescChange(event: Event) {
    setDesc((event.target as HTMLTextAreaElement).value);
  }

  return () => (
    <>
      <h3>🌈</h3>
      <input type='text' value={name()} autofocus onInput={handleInput} />
      <Greet key='1' name={name()} />
      <Counter />
      <br />
      <form action=''>
        <div>
          <input
            type='radio'
            id='male'
            name='sex'
            value='male'
            checked={sex() === 'male'}
            onChange={handleSexChange}
          />
          <label htmlFor='male'>male</label>
          <input
            type='radio'
            id='female'
            name='sex'
            value='female'
            checked={sex() === 'female'}
            onChange={handleSexChange}
          />
          <label htmlFor='female'>female</label>
        </div>
        <br />
        <div>
          <select
            id='food'
            name='food'
            value={food()}
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
            checked={agree()}
            onChange={handleAgreeChange}
          />
          <label htmlFor='agree'>agree</label>
        </div>
        <br />
        <div>
          <textarea
            name='desc'
            id='desc'
            value={desc()}
            onChange={handleDescChange}
          />
        </div>
      </form>
    </>
  );
});
