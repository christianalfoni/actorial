import { Actor } from './Actor';
import { Devtool, devtool as internalDevtool } from './devtool';
import { IConfig, IEvents, IState } from './types';
export * from './spawn';

export * from './types';

export const devtool = internalDevtool.setDevtool(new Devtool());

export function actor<S extends IState, E extends IEvents, P extends any = void>(
  config: P extends void ? IConfig<S, E> : (payload: P) => IConfig<S, E>,
): (payload: P) => Actor<S, E> {
  return (payload: P) => new Actor(typeof config === 'function' ? (config as any)(payload) : config);
}
