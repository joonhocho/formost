import { sleep } from 'ts-jutil/lib/promise';
import { Field } from './field';

describe('Field', () => {
  it('text field', async () => {
    const listener = jest.fn();
    const field = new Field<string, string, string>({
      initialValue: '',
      toInput: (v): string => v,
      formatInput: (v): string => v.trimLeft(),
      fromInput: (v): string => v.trim(),
      isEmpty: (v): boolean => !v,
      validate: (v): string | null => (v.length < 3 ? 'short' : null),
      validateAsync: async (v): Promise<string | null> => {
        if (v === 'a a a') {
          return 'unavailable';
        }
        return null;
      },
      onChangeState: listener,
      required: true,
    });

    expect(listener).toBeCalledWith(
      {
        changed: false,
        disabled: false,
        empty: true,
        complete: false,
        error: 'required',
        focused: false,
        initialValue: '',
        inputValue: '',
        required: true,
        skip: false,
        touched: false,
        valid: false,
        validating: false,
        value: '',
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    field.setInputValue(' a ');

    expect(listener).toBeCalledWith(
      {
        changed: true,
        disabled: false,
        empty: false,
        complete: true,
        error: 'short',
        focused: false,
        initialValue: '',
        inputValue: 'a ',
        required: true,
        skip: false,
        touched: true,
        valid: false,
        validating: false,
        value: 'a',
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    field.setInputValue(' a a a ');

    expect(listener).toBeCalledWith(
      {
        changed: true,
        disabled: false,
        empty: false,
        complete: true,
        error: null,
        focused: false,
        initialValue: '',
        inputValue: 'a a a ',
        required: true,
        skip: false,
        touched: true,
        valid: false,
        validating: true,
        value: 'a a a',
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    await sleep(10);

    expect(listener).toBeCalledWith(
      {
        changed: true,
        disabled: false,
        empty: false,
        complete: true,
        error: 'unavailable',
        focused: false,
        initialValue: '',
        inputValue: 'a a a ',
        required: true,
        skip: false,
        touched: true,
        valid: false,
        validating: false,
        value: 'a a a',
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    field.setInputValue(' bbb ');

    expect(listener).toBeCalledWith(
      {
        changed: true,
        disabled: false,
        empty: false,
        complete: true,
        error: null,
        focused: false,
        initialValue: '',
        inputValue: 'bbb ',
        required: true,
        skip: false,
        touched: true,
        valid: false,
        validating: true,
        value: 'bbb',
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    await sleep(10);

    expect(listener).toBeCalledWith(
      {
        changed: true,
        disabled: false,
        empty: false,
        complete: true,
        error: null,
        focused: false,
        initialValue: '',
        inputValue: 'bbb ',
        required: true,
        skip: false,
        touched: true,
        valid: true,
        validating: false,
        value: 'bbb',
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    field.setValue('ccc');

    expect(listener).toBeCalledWith(
      {
        changed: true,
        disabled: false,
        empty: false,
        complete: true,
        error: null,
        focused: false,
        initialValue: '',
        inputValue: 'ccc',
        required: true,
        skip: false,
        touched: true,
        valid: false,
        validating: true,
        value: 'ccc',
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    await sleep(10);

    expect(listener).toBeCalledWith(
      {
        changed: true,
        disabled: false,
        empty: false,
        complete: true,
        error: null,
        focused: false,
        initialValue: '',
        inputValue: 'ccc',
        required: true,
        skip: false,
        touched: true,
        valid: true,
        validating: false,
        value: 'ccc',
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    field.focus();

    expect(listener).toBeCalledWith(
      {
        changed: true,
        disabled: false,
        empty: false,
        complete: true,
        error: null,
        focused: true,
        initialValue: '',
        inputValue: 'ccc',
        required: true,
        skip: false,
        touched: true,
        valid: true,
        validating: false,
        value: 'ccc',
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    field.unfocus();

    expect(listener).toBeCalledWith(
      {
        changed: true,
        disabled: false,
        empty: false,
        complete: true,
        error: null,
        focused: false,
        initialValue: '',
        inputValue: 'ccc',
        required: true,
        skip: false,
        touched: true,
        valid: true,
        validating: false,
        value: 'ccc',
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();
  });
});
