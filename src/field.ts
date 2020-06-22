import {
  EqualFn,
  IState,
  StateEmitter,
  ValidateAsyncFn,
  ValidateFn,
} from './state';

// initialValue = default | server stored value
// changed = initialValue !== currentValue
// valid = isValid(currentValue)
// validating = running async validator
// focused = currently on focus
// touched = has input changed
// error = validation error
// empty = is empty value
// required

// example:
// initialValue = '' // default value
// inputValue = '  sample text ' // unsanitized user input value
// parsedValue = 'sample text' // sanitized

// initialValue = 0 // default value
// inputValue = '  10000 ' // unsanitized user input value
// inputValue' = '10,000' // realtime formatted input value
// parsedValue = 10000 // sanitized, to be validated

// initialValue = {year: 2000, month: 01, day: 01} // stored & valid value
// inputValue = '2000-01-01' or '2000-0' (incomplete) // in the middle of editing
// parsedValue = {year: 2000, ...} (could be incomplete) // to be validated in real time

export type DefaultRequiredError = 'required';
export const defaultRequiredError: DefaultRequiredError = 'required';

export interface IFieldState<TValue, TInputValue, TError = any>
  extends IState<TValue, TError | DefaultRequiredError> {
  initialValue: TValue;
  inputValue: TInputValue;
  required: boolean;
}

export type EmptyFn<TValue> = (value: TValue) => boolean;
export type FieldStateHandler<TValue, TInputValue, TError = any> = (
  state: IFieldState<TValue, TInputValue, TError>
) => void;

export interface IFieldConfig<TValue, TInputValue, TError = any> {
  initialValue: TValue;
  inputValue?: TInputValue;
  required?: boolean;
  requiredError?: TError;
  focused?: boolean;
  touched?: boolean;
  disabled?: boolean;
  skip?: boolean;
  toInput: (value: TValue) => TInputValue;
  formatInput?: (inputValue: TInputValue) => TInputValue;
  fromInput: (inputValue: TInputValue) => TValue;
  validate?: ValidateFn<TValue, TError, Field<TValue, TInputValue, TError>>;
  validateAsync?: ValidateAsyncFn<
    TValue,
    TError,
    Field<TValue, TInputValue, TError>
  >;
  isEqual?: EqualFn<TValue>;
  isEmpty?: EmptyFn<TValue>;
  onChangeState?: FieldStateHandler<TValue, TInputValue, TError>;
}

export const defaultIsEqual = <T>(a: T, b: T): boolean => a === b;
export const defaultIsEmpty = <T>(a: T): boolean =>
  a == null || // nil
  (a as any) === '' || // empty string
  a !== a || // NaN
  (Array.isArray(a) && a.length === 0); // empty array
export const defaultFormatInput = <T>(x: T): T => x;

const nullState = {
  initialValue: undefined,
  inputValue: undefined,
  required: false,
  value: undefined,
  changed: false,
  empty: true,
  complete: false,
  validating: false,
  valid: false,
  error: null,
  focused: false,
  touched: false,
  disabled: false,
  skip: false,
};

export class Field<TValue, TInputValue, TError = any> extends StateEmitter<
  IFieldState<TValue, TInputValue, TError>
> {
  public toInput: (value: TValue) => TInputValue;
  public formatInput: (inputValue: TInputValue) => TInputValue;
  public fromInput: (inputValue: TInputValue) => TValue;
  public requiredError: TError | DefaultRequiredError;
  public isEmpty: EmptyFn<TValue>;

  private initialized = false;

  constructor({
    initialValue,
    inputValue: rawInputValue,
    focused,
    touched,
    required,
    requiredError,
    disabled,
    skip,
    toInput,
    formatInput,
    fromInput,
    validate,
    validateAsync,
    isEqual,
    isEmpty,
    onChangeState,
  }: IFieldConfig<TValue, TInputValue, TError>) {
    super();

    this.toInput = toInput;
    this.formatInput = formatInput || defaultFormatInput;
    this.fromInput = fromInput;
    this.requiredError =
      requiredError == null ? defaultRequiredError : requiredError;
    this.validate = validate;
    this.validateAsync = validateAsync;
    if (isEqual) {
      this.isEqual = isEqual;
    }
    this.isEmpty = isEmpty || defaultIsEmpty;

    if (onChangeState) {
      this.on(onChangeState);
    }

    this._state = nullState as any;

    this.setState({
      required: !!required,
      focused: !!focused,
      touched: !!touched,
      disabled: !!disabled,
      skip: !!skip,
      initialValue,
      inputValue: this.formatInput(
        rawInputValue == null ? this.toInput(initialValue) : rawInputValue
      ),
    });

    this.initialized = true;
  }

  get value(): TValue {
    return this._state.value;
  }

  set value(value: TValue) {
    this.setStateProp('value', value);
  }

  public setValue = (value: TValue): boolean =>
    this.setStateProp('value', value);

  public setInputValue = (inputValue: TInputValue): boolean =>
    this.setStateProp('inputValue', inputValue);

  public focus = (): boolean => this.setStateProp('focused', true);

  public unfocus = (): boolean => this.setStateProp('focused', false);

  public getNextState(
    prevState: IFieldState<TValue, TInputValue, TError> | typeof nullState,
    update: Partial<IFieldState<TValue, TInputValue, TError>>
  ): IFieldState<TValue, TInputValue, TError> {
    const state = { ...prevState, ...update };

    const inputChanged = state.inputValue !== prevState.inputValue;
    if (inputChanged) {
      state.inputValue = this.formatInput(state.inputValue!);
      state.value = this.fromInput(state.inputValue);
    }

    const value = state.value!;
    const valueChanged = value !== prevState.value;
    if (valueChanged) {
      if (!inputChanged) {
        state.inputValue = this.formatInput(this.toInput(value));
      }
      state.empty = this.isEmpty(value);
      state.complete = !state.empty;
    }

    const { initialized } = this;
    if (initialized && state.inputValue !== prevState.inputValue) {
      state.touched = true;
    }

    if (valueChanged || state.initialValue !== prevState.initialValue) {
      state.changed = !this.isEqual(value, state.initialValue!);
    }

    const valueTrulyChanged =
      valueChanged && (!initialized || !this.isEqual(value, prevState.value!));
    if (valueTrulyChanged || state.required !== prevState.required) {
      const error =
        state.empty && state.required
          ? this.requiredError
          : this.validate
          ? this.validate(value)
          : null;

      state.error = error == null ? null : error;
    }

    if (valueTrulyChanged || state.error !== prevState.error) {
      state.valid = state.error == null && !this.validateAsync;
      state.validating = state.error == null && !!this.validateAsync;
    }

    return state as any;
  }

  public reset = (): boolean => {
    this.initialized = false;
    const changed = this.setState({
      value: this._state.initialValue,
      touched: false,
    });
    this.initialized = true;
    return changed;
  };
}
