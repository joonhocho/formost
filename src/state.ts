import { Emitter } from 'ts-jutil/es5/emitter';
import { shallowEqualObjects } from 'ts-jutil/es5/equal';

export class State<TState> extends Emitter<Readonly<TState>> {
  protected _state!: TState;

  public getState(): Readonly<TState> {
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
}
