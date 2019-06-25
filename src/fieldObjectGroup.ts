import { keys as getKeys, setProp } from 'ts-jutil/es5/object';
import { ExcludeKeys, WritableProps } from 'tsdef';
import { IState, State, ValidateAsyncFn, ValidateFn } from './state';

export interface IFieldObjectGroupState<TValueMap, TErrorMap>
  extends IState<TValueMap, TErrorMap> {}

export type FieldObjectGroupStateHandler<TValueMap, TErrorMap> = (
  state: IFieldObjectGroupState<TValueMap, TErrorMap>
) => void;

export type IFieldObjectGroupFields<
  TValueMap,
  TErrorMap extends { [P in keyof TValueMap]?: any }
> = {
  [P in keyof TValueMap]: State<IState<TValueMap[P], TErrorMap[P]>>;
};

export interface IFieldObjectGroupConfig<TValueMap, TErrorMap> {
  fields: IFieldObjectGroupFields<TValueMap, TErrorMap>;
  validate?: ValidateFn<IFieldObjectGroupState<TValueMap, TErrorMap>>;
  validateAsync?: ValidateAsyncFn<IFieldObjectGroupState<TValueMap, TErrorMap>>;
  onChangeState?: FieldObjectGroupStateHandler<TValueMap, TErrorMap>;
  skip?: boolean;
}

export class FieldObjectGroup<
  TValueMap,
  TErrorMap extends { [P in keyof TValueMap]?: any }
> extends State<IFieldObjectGroupState<TValueMap, TErrorMap>> {
  public fields: IFieldObjectGroupFields<TValueMap, TErrorMap>;
  protected names: Array<keyof TValueMap>;

  constructor({
    fields,
    validate,
    validateAsync,
    onChangeState,
    skip,
  }: IFieldObjectGroupConfig<TValueMap, TErrorMap>) {
    super();

    const names = getKeys(fields);

    this.fields = fields;
    this.names = names;
    this.validate = validate;
    this.validateAsync = validateAsync;

    const fieldHandler = (): void => this.refreshState();
    for (let i = 0, len = names.length; i < len; i += 1) {
      fields[names[i]].on(fieldHandler);
    }

    if (onChangeState) {
      this.on(onChangeState);
    }

    this._state = { skip: Boolean(skip) } as any;
    this.refreshState();
  }

  public refreshState(): void {
    const childState = this.reduceChildStates();

    if (this.validate) {
      const errors = this.validate(childState.value);
      if (errors && getKeys(errors).length) {
        childState.error = { ...childState.error, ...errors };
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
    ExcludeKeys<IFieldObjectGroupState<TValueMap, TErrorMap>, 'skip'>
  > {
    const value = {} as IFieldObjectGroupState<TValueMap, TErrorMap>['value'];
    const error = {} as IFieldObjectGroupState<TValueMap, TErrorMap>['error'];
    let changed = false; // ||
    let empty = true; // &&
    let complete = true; // !empty &&
    let validating = false; // ||
    let valid = true; // &&
    let focused = false; // ||
    let touched = false; // ||
    let disabled = true; // &&

    const { fields, names } = this;

    for (let i = 0, len = names.length; i < len; i += 1) {
      const name = names[i];
      const fState = fields[name].getState();
      if (!fState.skip) {
        value[name] = fState.value;
        if (fState.error != null) {
          (error as any)[name] = fState.error;
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
      value,
      error: getKeys(error).length ? error : null,
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
