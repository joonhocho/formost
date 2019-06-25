import { Emitter } from 'ts-jutil/es5/emitter';
import { shallowEqualObjects } from 'ts-jutil/es5/equal';
import { nil } from 'tsdef';

export interface IState<TValue, TError = any> {
  readonly value: TValue; // current value
  readonly changed: boolean; // value !== initialValue
  readonly empty: boolean; // isEmpty(value)
  readonly complete: boolean; // !isEmpty(value)
  readonly validating: boolean; // is validating async
  readonly valid: boolean; // validated and is valid
  readonly error: TError | null; // validation error or null
  readonly focused: boolean; // focused now
  readonly touched: boolean; // has focused at least once
  readonly disabled: boolean;
  readonly skip: boolean; // treat this field as if it's doesn't exists
}

export type ValidateFn<TValue, TError = any, This = any> = (
  this: This,
  value: TValue
) => TError | nil;

export type ValidateAsyncFn<TValue, TError = any, This = any> = (
  this: This,
  value: TValue
) => Promise<TError | nil>;

export class StateEmitter<TState extends IState<any, any>> extends Emitter<
  TState
> {
  public _value!: TState['value']; // for referencing value type from typescript
  public _error!: TState['error']; // for referencing error type from typescript

  protected validate?: ValidateFn<TState['value'], TState['error']>;
  protected validateAsync?: ValidateAsyncFn<TState['value'], TState['error']>;
  protected _state!: TState;

  public getState(): TState {
    return this._state;
  }

  public setState(state: Partial<TState>): boolean {
    if (
      !shallowEqualObjects(this._state, state, {
        keys: Object.keys(state),
        testKeys: false,
      })
    ) {
      this._state = { ...this._state, ...state };
      this.emitState();
      return true;
    }
    return false;
  }

  public emitState(): void {
    this.emit(this._state);
  }

  protected async maybeValidateAsync(): Promise<TState['error'] | null> {
    if (this.validateAsync && this._state.error == null) {
      const { value } = this._state;
      const error = await this.validateAsync(value);
      // value may have been changed
      if (value === this._state.value) {
        this.setState({
          validating: false,
          valid: error == null,
          error: error == null ? null : error,
        } as any); // weird typescript bug
      }
      return error;
    }
    return null;
  }
}
