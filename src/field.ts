import { IState, State, ValidateAsyncFn, ValidateFn } from './state';

// initialValue = default | server stored value
// changed = initialValue !== currentValue
// valid = isValid(currentValue)
// validating = running async validator
// focused = currently on focus
// touched = has focused
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

export interface IFieldState<TValue, TInputValue, TError>
  extends IState<TValue, TError | DefaultRequiredError> {
  initialValue: TValue;
  inputValue: TInputValue;
  required: boolean;
}

export type EqualFn<TValue> = (valueA: TValue, valueB: TValue) => boolean;
export type EmptyFn<TValue> = (value: TValue) => boolean;
export type FieldStateHandler<TValue, TInputValue, TError> = (
  state: IFieldState<TValue, TInputValue, TError>
) => void;

export interface IFieldConfig<TValue, TInputValue, TError> {
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
  validate?: ValidateFn<IFieldState<TValue, TInputValue, TError>>;
  validateAsync?: ValidateAsyncFn<IFieldState<TValue, TInputValue, TError>>;
  isEqual?: EqualFn<TValue>;
  isEmpty?: EmptyFn<TValue>;
  onChangeState?: FieldStateHandler<TValue, TInputValue, TError>;
}

export const defaultIsEqual = <T>(a: T, b: T): boolean => a === b;
export const defaultIsEmpty = <T>(a: T): boolean => a == null;
export const defaultFormatInput = <T>(x: T): T => x;

export class Field<TValue, TInputValue, TError> extends State<
  IFieldState<TValue, TInputValue, TError>
> {
  public toInput: (value: TValue) => TInputValue;
  public formatInput: (inputValue: TInputValue) => TInputValue;
  public fromInput: (inputValue: TInputValue) => TValue;
  public requiredError: TError | DefaultRequiredError;
  public isEqual: EqualFn<TValue>;
  public isEmpty: EmptyFn<TValue>;

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
    this.isEqual = isEqual || defaultIsEqual;
    this.isEmpty = isEmpty || defaultIsEmpty;

    const inputValue = this.formatInput(
      rawInputValue == null ? this.toInput(initialValue) : rawInputValue
    );
    const value = this.fromInput(inputValue);
    const req = Boolean(required);

    this._state = {
      required: req,
      focused: Boolean(focused),
      touched: Boolean(touched),
      disabled: Boolean(disabled),
      skip: Boolean(skip),
      initialValue,
      inputValue,
      ...this.getPartialStateFromValue({
        initialValue,
        value,
        required: req,
      }),
    };

    if (onChangeState) {
      this.on(onChangeState);
    }

    this.emitState();
    this.maybeValidateAsync();
  }

  public setInputValue(rawInputValue: TInputValue): void {
    const inputValue = this.formatInput(rawInputValue);
    const { _state } = this;
    if (inputValue !== _state.inputValue) {
      const value = this.fromInput(inputValue);
      if (this.isEqual(value, _state.value)) {
        this._state = {
          ..._state,
          inputValue,
        };
      } else {
        this._state = {
          ..._state,
          inputValue,
          ...this.getPartialStateFromValue({
            initialValue: _state.initialValue,
            value,
            required: _state.required,
          }),
        };
        this.maybeValidateAsync();
      }

      this.emitState();
    }
  }

  public setValue(value: TValue): void {
    const { _state } = this;
    if (!this.isEqual(value, _state.value)) {
      this._state = {
        ..._state,
        inputValue: this.formatInput(this.toInput(value)),
        ...this.getPartialStateFromValue({
          initialValue: _state.initialValue,
          value,
          required: _state.required,
        }),
      };

      this.emitState();
      this.maybeValidateAsync();
    }
  }

  protected getPartialStateFromValue({
    initialValue,
    value,
    required,
  }: {
    initialValue: TValue;
    value: TValue;
    required: boolean;
  }): Pick<
    IFieldState<TValue, TInputValue, TError>,
    | 'value'
    | 'changed'
    | 'empty'
    | 'complete'
    | 'validating'
    | 'valid'
    | 'error'
  > {
    const empty = this.isEmpty(value);
    const error =
      empty && required
        ? this.requiredError
        : this.validate
        ? this.validate(value)
        : null;
    return {
      value,
      changed: !this.isEqual(initialValue, value),
      empty,
      complete: !empty,
      validating: error == null && Boolean(this.validateAsync),
      valid: error == null && !this.validateAsync,
      error,
    };
  }
}
