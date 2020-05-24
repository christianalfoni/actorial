import { Actor } from './Actor';
import { Devtool, devtool as internalDevtool } from './devtool';
import { IConfig, IEvents, IState } from './types';

export * from './types';

export const devtool = internalDevtool.setDevtool(new Devtool());

export function actor<S extends IState, E extends IEvents>(config: IConfig<S, E>): S & Actor<S, E> {
  return new Actor(config) as any;
}
