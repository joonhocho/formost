import { State } from './state';

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

export interface IFieldState<TValue, TInputValue, TError> {
  initialValue: TValue;
  inputValue: TInputValue;
  value: TValue;
  changed: boolean;
  required: boolean;
  empty: boolean;
  validating: boolean;
  valid: boolean;
  error: TError | DefaultRequiredError | null;
  focused: boolean;
  touched: boolean;
  disabled: boolean;
}

export type ValidateFn<TValue, TError> = (value: TValue) => TError | null;
export type ValidateAsyncFn<TValue, TError> = (
  value: TValue
) => Promise<TError | null>;
export type EqualFn<TValue> = (valueA: TValue, valueB: TValue) => boolean;
export type EmptyFn<TValue> = (value: TValue) => boolean;
export type ChangeFieldStateHandler<TValue, TInputValue, TError> = (
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
  toInput: (value: TValue) => TInputValue;
  formatInput?: (inputValue: TInputValue) => TInputValue;
  fromInput: (inputValue: TInputValue) => TValue;
  validate?: ValidateFn<TValue, TError>;
  validateAsync?: ValidateAsyncFn<TValue, TError>;
  isEqual?: EqualFn<TValue>;
  isEmpty?: EmptyFn<TValue>;
  onChangeState?: ChangeFieldStateHandler<TValue, TInputValue, TError>;
}

export const defaultIsEqual = <T>(a: T, b: T): boolean => a === b;
export const defaultIsEmpty = <T>(a: T): boolean => a == null;
export const defaultValidate = (): null => null;
export const defaultFormatInput = <T>(x: T): T => x;
export type DefaultRequiredError = 'required';
export const defaultRequiredError: DefaultRequiredError = 'required';

export class Field<TValue, TInputValue, TError> extends State<
  IFieldState<TValue, TInputValue, TError>
> {
  public toInput: (value: TValue) => TInputValue;
  public formatInput: (inputValue: TInputValue) => TInputValue;
  public fromInput: (inputValue: TInputValue) => TValue;
  public requiredError: TError | DefaultRequiredError;
  public validate: ValidateFn<TValue, TError>;
  public validateAsync?: ValidateAsyncFn<TValue, TError>;
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
    this.validate = validate || defaultValidate;
    this.validateAsync = validateAsync;
    this.isEqual = isEqual || defaultIsEqual;
    this.isEmpty = isEmpty || defaultIsEmpty;

    const inputValue = this.formatInput(
      rawInputValue == null ? this.toInput(initialValue) : rawInputValue
    );
    const value = this.fromInput(inputValue);
    const empty = this.isEmpty(value);
    const error = empty && required ? this.requiredError : this.validate(value);

    this._state = {
      initialValue,
      inputValue,
      value,
      changed: !this.isEqual(initialValue, value),
      required: Boolean(required),
      empty,
      validating: error == null && Boolean(validateAsync),
      valid: error == null && !validateAsync,
      error,
      focused: Boolean(focused),
      touched: Boolean(touched),
      disabled: Boolean(disabled),
    };

    if (onChangeState) {
      this.on(onChangeState);
    }

    this.emitState();
    this.maybeValidateAsync(value);
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
        const empty = this.isEmpty(value);
        const error =
          empty && _state.required ? this.requiredError : this.validate(value);
        this._state = {
          ..._state,
          inputValue,
          value,
          changed: !this.isEqual(_state.initialValue, value),
          empty,
          validating: error == null && Boolean(this.validateAsync),
          valid: error == null && !this.validateAsync,
          error,
        };
      }

      this.emitState();
      this.maybeValidateAsync(value);
    }
  }

  public setValue(value: TValue): void {
    const { _state } = this;
    if (!this.isEqual(value, _state.value)) {
      const inputValue = this.formatInput(this.toInput(value));
      const empty = this.isEmpty(value);
      const error =
        empty && _state.required ? this.requiredError : this.validate(value);
      this._state = {
        ..._state,
        inputValue,
        value,
        changed: !this.isEqual(_state.initialValue, value),
        empty,
        validating: error == null && Boolean(this.validateAsync),
        valid: error == null && !this.validateAsync,
        error,
      };

      this.emitState();
      this.maybeValidateAsync(value);
    }
  }

  private async maybeValidateAsync(value: TValue): Promise<TError | null> {
    if (this.validateAsync) {
      const error = await this.validateAsync(value);
      if (value === this._state.value) {
        this.setState({
          validating: false,
          valid: error == null,
          error,
        });
      }
      return error;
    }
    return null;
  }
}
