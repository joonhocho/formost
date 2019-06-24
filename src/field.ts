import { Emitter } from 'ts-jutil/es5/emitter';
import { shallowEqualObjects } from 'ts-jutil/es5/equal';

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
  valid: boolean | null;
  error: TError | DefaultRequiredError | null;
  focused: boolean;
  touched: boolean;
  disabled: boolean;
}

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
  validate?: (value: TValue) => TError | null;
  validateAsync?: (value: TValue) => Promise<TError | null>;
  isEqual?: (valueA: TValue, valueB: TValue) => boolean;
  isEmpty?: (valueA: TValue) => boolean;
  onChangeState?: (state: IFieldState<TValue, TInputValue, TError>) => void;
}

export const defaultIsEqual = <T>(a: T, b: T): boolean => a === b;
export const defaultIsEmpty = <T>(a: T): boolean => a == null;
export const defaultValidate = (): null => null;
export const defaultFormatInput = <T>(x: T): T => x;
export type DefaultRequiredError = 'required';
export const defaultRequiredError: DefaultRequiredError = 'required';

export class Field<TValue, TInputValue, TError> extends Emitter<
  Readonly<IFieldState<TValue, TInputValue, TError>>
> {
  public toInput: (value: TValue) => TInputValue;
  public formatInput: (inputValue: TInputValue) => TInputValue;
  public fromInput: (inputValue: TInputValue) => TValue;
  public requiredError: TError | DefaultRequiredError;
  public validate: (value: TValue) => TError | null;
  public validateAsync?: (value: TValue) => Promise<TError | null>;
  public isEqual: (valueA: TValue, valueB: TValue) => boolean;
  public isEmpty: (valueA: TValue) => boolean;

  private _state: IFieldState<TValue, TInputValue, TError>;

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
      valid: error == null && (validateAsync ? null : true),
      error,
      focused: Boolean(focused),
      touched: Boolean(touched),
      disabled: Boolean(disabled),
    };

    if (onChangeState) {
      this.on(onChangeState);
    }

    this.emit(this._state);
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
          valid: error == null && (this.validateAsync ? null : true),
          error,
        };
      }

      this.emit(this._state);
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
        valid: error == null && (this.validateAsync ? null : true),
        error,
      };

      this.emit(this._state);
      this.maybeValidateAsync(value);
    }
  }

  public getState(): Readonly<IFieldState<TValue, TInputValue, TError>> {
    return this._state;
  }

  public setState(
    state: Partial<IFieldState<TValue, TInputValue, TError>>
  ): boolean {
    if (
      !shallowEqualObjects(this._state, state, {
        keys: Object.keys(state),
        testKeys: false,
      })
    ) {
      this._state = { ...this._state, ...state };
      this.emit(this._state);
      return true;
    }
    return false;
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
