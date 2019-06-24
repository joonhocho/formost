import { forEach, reduce } from 'ts-jutil/es5/object';
import { DefaultRequiredError, Field } from './field';
import { State } from './state';

export interface IFieldObjectGroupState<
  TValueMap,
  TErrorMap extends { [P in keyof TValueMap]?: any }
> {
  value: TValueMap;
  changed: boolean; // ||
  empty: boolean; // &&
  complete: boolean; // !empty &&
  validating: boolean; // ||
  valid: boolean | null; // &&
  error: TErrorMap | null;
  focused: boolean; // ||
  touched: boolean; // ||
  disabled: boolean; // &&
}

export type ChangeFieldObjectGroupStateHandler<
  TValueMap,
  TErrorMap extends { [P in keyof TValueMap]?: any }
> = (state: IFieldObjectGroupState<TValueMap, TErrorMap>) => void;

export type IFieldObjectGroupFields<
  TValueMap,
  TErrorMap extends { [P in keyof TValueMap]?: any }
> = {
  [P in keyof TValueMap]: Field<TValueMap[P], any, TErrorMap[P]>;
};

export type ValidateFieldObjectGroupFn<
  TValueMap,
  TErrorMap extends { [P in keyof TValueMap]?: any }
> = (state: IFieldObjectGroupState<TValueMap, TErrorMap>) => TErrorMap | null;

export type ValidateAsyncFieldObjectGroupFn<
  TValueMap,
  TErrorMap extends { [P in keyof TValueMap]?: any }
> = (
  state: IFieldObjectGroupState<TValueMap, TErrorMap>
) => Promise<TErrorMap | null>;

export interface IFieldObjectGroupConfig<
  TValueMap,
  TErrorMap extends { [P in keyof TValueMap]?: any }
> {
  fields: IFieldObjectGroupFields<TValueMap, TErrorMap>;
  validate?: ValidateFieldObjectGroupFn<TValueMap, TErrorMap>;
  validateAsync?: ValidateAsyncFieldObjectGroupFn<TValueMap, TErrorMap>;
  onChangeState?: ChangeFieldObjectGroupStateHandler<TValueMap, TErrorMap>;
}

export class FieldObjectGroup<
  TValueMap extends object,
  TError,
  TErrorMap = { [P in keyof TValueMap]?: TError | DefaultRequiredError }
> extends State<IFieldObjectGroupState<TValueMap, TErrorMap>> {
  public fields: IFieldObjectGroupFields<TValueMap, TErrorMap>;

  public validate?: ValidateFieldObjectGroupFn<TValueMap, TErrorMap>;
  public validateAsync?: ValidateAsyncFieldObjectGroupFn<TValueMap, TErrorMap>;

  constructor({
    fields,
    validate,
    validateAsync,
    onChangeState,
  }: IFieldObjectGroupConfig<TValueMap, TErrorMap>) {
    super();

    this.fields = fields;
    this.validate = validate;
    this.validateAsync = validateAsync;

    const fieldHandler = (): void => this.refreshState();
    forEach(fields, (field) => field.on(fieldHandler));

    if (onChangeState) {
      this.on(onChangeState);
    }

    this.refreshState();
  }

  public refreshState(): void {
    const state = this.getDerivedState();

    if (this.validate) {
      const errors = this.validate(state);
      if (errors) {
        state.error = { ...errors, ...state.error };
      }
    }

    state.validating =
      state.validating || (state.error == null && Boolean(this.validateAsync));
    state.valid = state.valid && (state.error == null && !this.validateAsync);

    this._state = state;
    this.emitState();
    this.maybeValidateAsync();
  }

  public getDerivedState(): IFieldObjectGroupState<TValueMap, TErrorMap> {
    const state = reduce(
      this.fields,
      (acc, field, name) => {
        const {
          value,
          changed,
          empty,
          validating,
          valid,
          error,
          focused,
          touched,
          disabled,
        } = field.getState();

        acc.value[name] = value;
        if (error != null) {
          (acc.error as any)[name] = error;
        }
        if (changed) acc.changed = true;
        if (!empty) acc.empty = false;
        if (empty) acc.complete = false;
        if (validating) acc.validating = true;
        if (valid === false) acc.valid = false;
        if (focused) acc.focused = true;
        if (touched) acc.touched = true;
        if (!disabled) acc.disabled = false;
        return acc;
      },
      {
        value: {},
        error: {},
        changed: false, // ||
        empty: true, // &&
        complete: true, // !empty &&
        validating: false, // ||
        valid: true, // &&
        focused: false, // ||
        touched: false, // ||
        disabled: true, // &&
      } as IFieldObjectGroupState<TValueMap, TErrorMap>
    );
    if (!Object.keys(state.error!).length) {
      state.error = null;
    }
    return state;
  }

  private async maybeValidateAsync(): Promise<TErrorMap | null> {
    if (this.validateAsync) {
      const { value } = this._state;
      const error = await this.validateAsync(this._state);
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
