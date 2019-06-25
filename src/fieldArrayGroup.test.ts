import { sleep } from 'ts-jutil/lib/promise';
import { Field } from './field';
import { FieldArrayGroup } from './fieldArrayGroup';

describe('FieldArrayGroup', () => {
  it('text field', async () => {
    const listener = jest.fn();

    const textField = new Field<string, string, string>({
      initialValue: '',
      toInput: (v): string => v,
      fromInput: (v): string => v.trim(),
      required: true,
      isEmpty: (x): boolean => !x,
      validateAsync: async (v): Promise<string | null> => {
        if (v === 'a') {
          return 'bad';
        }
        return null;
      },
    });

    const numberField = new Field<number, string, string>({
      initialValue: 0,
      toInput: (v): string => String(v),
      fromInput: (v): number => parseFloat(v),
      validate: (n): string | null => (n > 100 ? 'big' : null),
    });

    const group = new FieldArrayGroup<string | number, string>({
      items: [textField, numberField],
      validate: (x): string[] => (x.length < 2 ? ['too short'] : null),
      onChangeState: listener,
    });
    group.getState();

    expect(listener).toBeCalledWith(
      {
        length: 2,
        changed: false,
        complete: false,
        disabled: false,
        empty: false,
        error: ['required'],
        focused: false,
        touched: false,
        valid: false,
        validating: false,
        value: ['', 0],
        skip: false,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    textField.setInputValue('john');

    expect(listener).toBeCalledWith(
      {
        length: 2,
        changed: true,
        complete: true,
        disabled: false,
        empty: false,
        error: null,
        focused: false,
        touched: false,
        valid: false,
        validating: true,
        value: ['john', 0],
        skip: false,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    numberField.setInputValue(' 50 ');

    expect(listener).toBeCalledWith(
      {
        length: 2,
        changed: true,
        complete: true,
        disabled: false,
        empty: false,
        error: null,
        focused: false,
        touched: false,
        valid: false,
        validating: true,
        value: ['john', 50],
        skip: false,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    numberField.setInputValue(' 140 ');

    expect(listener).toBeCalledWith(
      {
        length: 2,
        changed: true,
        complete: true,
        disabled: false,
        empty: false,
        error: ['big'],
        focused: false,
        touched: false,
        valid: false,
        validating: true,
        value: ['john', 140],
        skip: false,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    textField.setState({
      focused: true,
      touched: true,
    });

    expect(listener).toBeCalledWith(
      {
        length: 2,
        changed: true,
        complete: true,
        disabled: false,
        empty: false,
        error: ['big'],
        focused: true,
        touched: true,
        valid: false,
        validating: true,
        value: ['john', 140],
        skip: false,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    await sleep(10);

    expect(listener).toBeCalledWith(
      {
        length: 2,
        changed: true,
        complete: true,
        disabled: false,
        empty: false,
        error: ['big'],
        focused: true,
        touched: true,
        valid: false,
        validating: false,
        value: ['john', 140],
        skip: false,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    textField.setInputValue('a');

    expect(listener).toBeCalledWith(
      {
        length: 2,
        changed: true,
        complete: true,
        disabled: false,
        empty: false,
        error: ['big'],
        focused: true,
        touched: true,
        valid: false,
        validating: true,
        value: ['a', 140],
        skip: false,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    await sleep(10);

    expect(listener).toBeCalledWith(
      {
        length: 2,
        changed: true,
        complete: true,
        disabled: false,
        empty: false,
        error: ['bad', 'big'],
        focused: true,
        touched: true,
        valid: false,
        validating: false,
        value: ['a', 140],
        skip: false,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    textField.setState({ skip: true });

    expect(listener).toBeCalledWith(
      {
        length: 1,
        changed: true,
        complete: true,
        disabled: false,
        empty: false,
        error: ['big', 'too short'],
        focused: false,
        touched: false,
        valid: false,
        validating: false,
        value: [140],
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
        length: 1,
        changed: true,
        complete: true,
        disabled: false,
        empty: false,
        error: ['big', 'too short'],
        focused: false,
        touched: false,
        valid: false,
        validating: false,
        value: [140],
        skip: true,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();
  });
});
