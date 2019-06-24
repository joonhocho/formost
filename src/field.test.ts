import { sleep } from 'ts-jutil/lib/promise';
import { Field } from './field';

describe('Field', () => {
  it('text field', async () => {
    const listener = jest.fn();
    const trimmedTextField = new Field<string, string, string>({
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
        error: 'required',
        focused: false,
        initialValue: '',
        inputValue: '',
        required: true,
        touched: false,
        valid: false,
        validating: false,
        value: '',
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    trimmedTextField.setInputValue(' a ');

    expect(listener).toBeCalledWith(
      {
        changed: true,
        disabled: false,
        empty: false,
        error: 'short',
        focused: false,
        initialValue: '',
        inputValue: 'a ',
        required: true,
        touched: false,
        valid: false,
        validating: false,
        value: 'a',
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    trimmedTextField.setInputValue(' a a a ');

    expect(listener).toBeCalledWith(
      {
        changed: true,
        disabled: false,
        empty: false,
        error: null,
        focused: false,
        initialValue: '',
        inputValue: 'a a a ',
        required: true,
        touched: false,
        valid: null,
        validating: true,
        value: 'a a a',
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    await sleep(50);

    expect(listener).toBeCalledWith(
      {
        changed: true,
        disabled: false,
        empty: false,
        error: 'unavailable',
        focused: false,
        initialValue: '',
        inputValue: 'a a a ',
        required: true,
        touched: false,
        valid: false,
        validating: false,
        value: 'a a a',
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    trimmedTextField.setInputValue(' bbb ');

    expect(listener).toBeCalledWith(
      {
        changed: true,
        disabled: false,
        empty: false,
        error: null,
        focused: false,
        initialValue: '',
        inputValue: 'bbb ',
        required: true,
        touched: false,
        valid: null,
        validating: true,
        value: 'bbb',
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();

    await sleep(50);

    expect(listener).toBeCalledWith(
      {
        changed: true,
        disabled: false,
        empty: false,
        error: null,
        focused: false,
        initialValue: '',
        inputValue: 'bbb ',
        required: true,
        touched: false,
        valid: true,
        validating: false,
        value: 'bbb',
      },
      null
    );
    expect(listener.mock.calls.length).toBe(1);
    listener.mockClear();
  });
});
