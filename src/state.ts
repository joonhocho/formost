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
  readonly touched: boolean; // has input changed at least once
  readonly disabled: boolean;
  readonly skip: boolean; // treat this field as if it's doesn't exists
}

export type EqualFn<TValue> = (valueA: TValue, valueB: TValue) => boolean;

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
  public _state!: TState;

  protected validate?: ValidateFn<TState['value'], TState['error']>;
  protected validateAsync?: ValidateAsyncFn<TState['value'], TState['error']>;

  public getState(): TState {
    return this._state;
  }

  public getNextState(prevState: TState, state: Partial<TState>): TState {
    return { ...prevState, ...state };
  }

  public setStateProp<K extends keyof TState>(
    key: K,
    value: TState[K]
  ): boolean {
    if (this._state[key] !== value) {
      this.updateState_({ [key]: value } as any);
      return true;
    }
    return false;
  }

  public setState(update: Partial<TState>): boolean {
    if (
      !shallowEqualObjects(this._state, update, {
        keys: Object.keys(update),
        testKeys: false,
      })
    ) {
      this.updateState_(update);
      return true;
    }
    return false;
  }

  public emitState(): void {
    this.emit(this._state);
  }

  public isEqual(valueA: TState['value'], valueB: TState['value']): boolean {
    return valueA === valueB;
  }

  protected async maybeValidateAsync(): Promise<TState['error'] | null> {
    if (this.validateAsync && this._state.error == null) {
      const { value } = this._state;
      const error = await this.validateAsync(value);
      // value may have been changed
      if (this.isEqual(value, this._state.value)) {
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

  private updateState_(update: Partial<TState>): void {
    const { _state } = this;
    this._state = this.getNextState(_state, update);
    if (this._state.validating && !_state.validating) {
      this.maybeValidateAsync();
    }
    this.emitState();
  }
}
