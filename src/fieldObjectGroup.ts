import { keys as getKeys } from 'ts-jutil/es5/object';
import { ExcludeKeys, WritableProps } from 'tsdef';
import { IState, StateEmitter, ValidateAsyncFn, ValidateFn } from './state';

export interface IStateEmitterMap<TValue extends IState<any> = any> {
  [key: string]: StateEmitter<TValue>;
}

export type TChildValueMap<TChildMap extends IStateEmitterMap> = {
  [P in keyof TChildMap]: TChildMap[P]['_value'];
};

export type TChildErrorMap<TChildMap extends IStateEmitterMap> = {
  [P in keyof TChildMap]: TChildMap[P]['_error'];
};

export interface IFieldObjectGroupState<
  TChildMap extends IStateEmitterMap,
  TErrorMap
>
  extends IState<
    TChildValueMap<TChildMap>,
    Partial<TChildErrorMap<TChildMap>> & Partial<TErrorMap>
  > {}

export type FieldObjectGroupStateHandler<
  TChildMap extends IStateEmitterMap,
  TErrorMap
> = (state: IFieldObjectGroupState<TChildMap, TErrorMap>) => void;

export interface IFieldObjectGroupConfig<
  TChildMap extends IStateEmitterMap,
  TErrorMap
> {
  fields: TChildMap;
  validate?: ValidateFn<
    TChildValueMap<TChildMap>,
    TErrorMap,
    FieldObjectGroup<TChildMap, TErrorMap>
  >;
  validateAsync?: ValidateAsyncFn<
    TChildValueMap<TChildMap>,
    TErrorMap,
    FieldObjectGroup<TChildMap, TErrorMap>
  >;
  onChangeState?: FieldObjectGroupStateHandler<TChildMap, TErrorMap>;
  skip?: boolean;
}

export class FieldObjectGroup<
  TChildMap extends IStateEmitterMap,
  TErrorMap
> extends StateEmitter<IFieldObjectGroupState<TChildMap, TErrorMap>> {
  public fields: TChildMap;
  protected names: Array<keyof TChildMap>;

  constructor({
    fields,
    validate,
    validateAsync,
    onChangeState,
    skip,
  }: IFieldObjectGroupConfig<TChildMap, TErrorMap>) {
    super();

    const names = getKeys(fields);

    this.fields = fields;
    this.names = names;
    this.validate = validate;
    this.validateAsync = validateAsync;

    this.forEach((field) => {
      field.on(this.refreshState);
    });

    if (onChangeState) {
      this.on(onChangeState);
    }

    this._state = { skip: Boolean(skip) } as any;
    this.refreshState();
  }

  public refreshState = (): boolean => {
    const childState = this.reduceChildStates();

    if (this.validate) {
      const errors = this.validate(childState.value);
      if (errors && getKeys(errors).length) {
        childState.error = { ...childState.error, ...errors };
      }
    }

    if (!childState.validating) {
      childState.validating =
        childState.error == null && Boolean(this.validateAsync);
    }

    if (childState.valid) {
      childState.valid = childState.error == null && !this.validateAsync;
    }

    return this.setState(childState);
  };

  public reduceChildStates(): WritableProps<
    ExcludeKeys<IFieldObjectGroupState<TChildMap, TErrorMap>, 'skip'>
  > {
    const value = {} as IFieldObjectGroupState<TChildMap, TErrorMap>['value'];
    const error = {} as IFieldObjectGroupState<TChildMap, TErrorMap>['error'];
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

  public forEach(
    fn: <Key extends keyof TChildMap>(
      field: TChildMap[Key],
      name: Key,
      fields: TChildMap
    ) => void
  ): void {
    const { fields, names } = this;
    for (let i = 0, len = names.length; i < len; i += 1) {
      const name = names[i];
      fn(fields[name], name, fields);
    }
  }

  public subField(field: TChildMap[keyof TChildMap]): void {
    field.on(this.refreshState);
  }

  public unsubField(field: TChildMap[keyof TChildMap]): void {
    field.off(this.refreshState);
  }

  public reset = (): boolean => {
    this.forEach((field) => {
      field.off(this.refreshState);
      field.reset();
      field.on(this.refreshState);
    });
    return this.refreshState();
  };
}
