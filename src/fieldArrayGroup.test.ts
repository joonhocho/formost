import { sleep } from 'ts-jutil';
import { Field } from './field';
import { FieldArrayGroup } from './fieldArrayGroup';

describe('FieldArrayGroup', (): void => {
  it('text field', async (): Promise<void> => {
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

    const group = new FieldArrayGroup({
      fields: [textField, numberField],
      validate(x): string[] | null {
        return x.length < 2 ? ['too short'] : null;
      },
      onChangeState: listener,
    });

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
        touched: true,
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
        touched: true,
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

    textField.setState({
      focused: true,
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
        touched: true,
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
        touched: true,
        valid: false,
        validating: false,
        value: [140],
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
        error: ['too short'],
        focused: false,
        touched: false,
        valid: false,
        validating: false,
        value: [0],
        skip: true,
        length: 1,
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
        error: ['too short'],
        focused: false,
        touched: false,
        valid: false,
        validating: false,
        value: [0],
        skip: true,
        length: 1,
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
        error: ['big', 'too short'],
        length: 1,
        focused: false,
        touched: true,
        valid: false,
        validating: false,
        value: [130],
        skip: true,
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();
  });
});
