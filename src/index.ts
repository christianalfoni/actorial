import { Devtool, devtool as internalDevtool } from './devtool';
export * from './types';
import { Actor } from './Actor';
import { IConfig, IEvents, IState } from './types';

export const devtool = internalDevtool.setDevtool(new Devtool());

export function actor<S extends IState, E extends IEvents>(config: IConfig<S, E>) {
  return new Actor(config);
}
