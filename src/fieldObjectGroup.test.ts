import { sleep } from 'ts-jutil';
import { Field } from './field';
import { FieldObjectGroup } from './fieldObjectGroup';

describe('FieldObjectGroup', () => {
  it('text field', async () => {
    const listener = jest.fn();

    const textField = new Field({
      initialValue: '',
      toInput: (v): string => v,
      fromInput: (v: string): string => v.trim(),
      required: true,
      isEmpty: (x): boolean => !x,
      validateAsync: async (v): Promise<string | null> => {
        if (v === 'a') {
          return 'bad';
        }
        return null;
      },
    });

    const numberField = new Field({
      initialValue: 0,
      toInput: (v): string => String(v),
      fromInput: (v: string): number => parseFloat(v),
      validate: (n): string | null => (n > 100 ? 'big' : null),
    });

    const group = new FieldObjectGroup({
      fields: {
        name: textField,
        age: numberField,
      },
      validate: (x): any => (x.age < 10 ? { age: 'young' } : null),
      onChangeState: listener,
    });

    expect(listener).toBeCalledWith(
      {
        changed: false,
        complete: false,
        disabled: false,
        empty: false,
        error: { age: 'young', name: 'required' },
        focused: false,
        touched: false,
        valid: false,
        validating: false,
        value: { age: 0, name: '' },
        skip: false,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    textField.setInputValue('john');

    expect(listener).toBeCalledWith(
      {
        changed: true,
        complete: true,
        disabled: false,
        empty: false,
        error: { age: 'young' },
        focused: false,
        touched: true,
        valid: false,
        validating: true,
        value: { age: 0, name: 'john' },
        skip: false,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    numberField.setInputValue(' 50 ');

    expect(listener).toBeCalledWith(
      {
        changed: true,
        complete: true,
        disabled: false,
        empty: false,
        error: null,
        focused: false,
        touched: true,
        valid: false,
        validating: true,
        value: { age: 50, name: 'john' },
        skip: false,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    numberField.setInputValue(' 140 ');

    expect(listener).toBeCalledWith(
      {
        changed: true,
        complete: true,
        disabled: false,
        empty: false,
        error: { age: 'big' },
        focused: false,
        touched: true,
        valid: false,
        validating: true,
        value: { age: 140, name: 'john' },
        skip: false,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    textField.setState({
      focused: true,
    });

    expect(listener).toBeCalledWith(
      {
        changed: true,
        complete: true,
        disabled: false,
        empty: false,
        error: { age: 'big' },
        focused: true,
        touched: true,
        valid: false,
        validating: true,
        value: { age: 140, name: 'john' },
        skip: false,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    await sleep(10);

    expect(listener).toBeCalledWith(
      {
        changed: true,
        complete: true,
        disabled: false,
        empty: false,
        error: { age: 'big' },
        focused: true,
        touched: true,
        valid: false,
        validating: false,
        value: { age: 140, name: 'john' },
        skip: false,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    textField.setInputValue('a');

    expect(listener).toBeCalledWith(
      {
        changed: true,
        complete: true,
        disabled: false,
        empty: false,
        error: { age: 'big' },
        focused: true,
        touched: true,
        valid: false,
        validating: true,
        value: { age: 140, name: 'a' },
        skip: false,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    await sleep(10);

    expect(listener).toBeCalledWith(
      {
        changed: true,
        complete: true,
        disabled: false,
        empty: false,
        error: { age: 'big', name: 'bad' },
        focused: true,
        touched: true,
        valid: false,
        validating: false,
        value: { age: 140, name: 'a' },
        skip: false,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    textField.setState({ skip: true });

    expect(listener).toBeCalledWith(
      {
        changed: true,
        complete: true,
        disabled: false,
        empty: false,
        error: { age: 'big' },
        focused: false,
        touched: true,
        valid: false,
        validating: false,
        value: { age: 140 },
        skip: false,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    await sleep(10);

    expect(listener).not.toBeCalled();
    expect(listener.mock.calls.length).toBe(0);
    listener.mockClear();

    group.setState({ skip: true });

    expect(listener).toBeCalledWith(
      {
        changed: true,
        complete: true,
        disabled: false,
        empty: false,
        error: { age: 'big' },
        focused: false,
        touched: true,
        valid: false,
        validating: false,
        value: { age: 140 },
        skip: true,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    await sleep(10);

    expect(listener).not.toBeCalled();
    expect(listener.mock.calls.length).toBe(0);
    listener.mockClear();

    group.reset();

    expect(listener).toBeCalledWith(
      {
        changed: false,
        complete: true,
        disabled: false,
        empty: false,
        error: { age: 'young' },
        focused: false,
        touched: false,
        valid: false,
        validating: false,
        value: { age: 0 },
        skip: true,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);

    await sleep(10);

    expect(listener).toBeCalledWith(
      {
        changed: false,
        complete: true,
        disabled: false,
        empty: false,
        error: { age: 'young' },
        focused: false,
        touched: false,
        valid: false,
        validating: false,
        value: { age: 0 },
        skip: true,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    group.unsubField(numberField);

    numberField.setInputValue(' 140 ');

    expect(listener.mock.calls.length).toBe(0);
    listener.mockClear();

    group.subField(numberField);

    numberField.setInputValue(' 130 ');

    expect(listener).toBeCalledWith(
      {
        changed: true,
        complete: true,
        disabled: false,
        empty: false,
        error: { age: 'big' },
        focused: false,
        touched: true,
        valid: false,
        validating: false,
        value: { age: 130 },
        skip: true,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();
  });
});
