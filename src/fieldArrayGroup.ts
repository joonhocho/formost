import { setProp } from 'ts-jutil/es5/object';
import { ExcludeKeys, WritableProps } from 'tsdef';
import { IState, StateEmitter, ValidateAsyncFn, ValidateFn } from './state';

export interface IFieldArrayGroupState<
  TChild extends StateEmitter<any>,
  TError = any
> extends IState<Array<TChild['_value']>, Array<TChild['_error'] | TError>> {
  length: number;
}

export type FieldArrayGroupStateHandler<
  TChild extends StateEmitter<any>,
  TError = any
> = (state: IFieldArrayGroupState<TChild, TError>) => void;

export interface IFieldArrayGroupConfig<
  TChild extends StateEmitter<any>,
  TError = any
> {
  items: TChild[];
  validate?: ValidateFn<
    Array<TChild['_value']>,
    TError[],
    FieldArrayGroup<TChild, TError>
  >;
  validateAsync?: ValidateAsyncFn<
    Array<TChild['_value']>,
    TError[],
    FieldArrayGroup<TChild, TError>
  >;
  onChangeState?: FieldArrayGroupStateHandler<TChild, TError>;
  skip?: boolean;
}

export class FieldArrayGroup<
  TChild extends StateEmitter<any>,
  TError = any
> extends StateEmitter<IFieldArrayGroupState<TChild, TError>> {
  public items: TChild[];

  constructor({
    items,
    validate,
    validateAsync,
    onChangeState,
    skip,
  }: IFieldArrayGroupConfig<TChild, TError>) {
    super();

    this.items = items;
    this.validate = validate;
    this.validateAsync = validateAsync;
    this._state = { skip: Boolean(skip) } as any;

    const fieldHandler = (): void => this.refreshState();
    for (let i = 0, len = items.length; i < len; i += 1) {
      items[i].on(fieldHandler);
    }

    if (onChangeState) {
      this.on(onChangeState);
    }

    this.refreshState();
  }

  public refreshState(): void {
    const childState = this.reduceChildStates();

    if (this.validate) {
      const errors = this.validate(childState.value);
      if (errors && errors.length) {
        childState.error = childState.error
          ? [...childState.error, ...errors]
          : errors;
      }
    }

    childState.validating =
      childState.validating ||
      (childState.error == null && Boolean(this.validateAsync));
    childState.valid =
      childState.valid && (childState.error == null && !this.validateAsync);

    this._state = setProp(childState, 'skip', this._state.skip);
    this.emitState();
    this.maybeValidateAsync();
  }

  public reduceChildStates(): WritableProps<
    ExcludeKeys<IFieldArrayGroupState<TChild, TError>, 'skip'>
  > {
    const value: Array<TChild['_value']> = [];
    const error: TError[] = [];
    let changed = false; // ||
    let empty = true; // &&
    let complete = true; // !empty &&
    let validating = false; // ||
    let valid = true; // &&
    let focused = false; // ||
    let touched = false; // ||
    let disabled = true; // &&

    const { items } = this;

    for (let i = 0, len = items.length; i < len; i += 1) {
      const field = items[i];
      const fState = field.getState();
      if (!fState.skip) {
        value.push(fState.value);
        if (fState.error != null) {
          error.push(fState.error);
        }
        if (fState.changed) changed = true;
        if (!fState.empty) empty = false;
        if (!fState.complete) complete = false;
        if (fState.validating) validating = true;
        if (fState.valid === false) valid = false;
        if (fState.focused) focused = true;
        if (fState.touched) touched = true;
        if (!fState.disabled) disabled = false;
      }
    }

    return {
      length: value.length,
      value,
      error: error.length ? error : null,
      changed,
      empty,
      complete,
      validating,
      valid,
      focused,
      touched,
      disabled,
    };
  }
}
