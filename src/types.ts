export interface IState {
  state: string | number;
  data: any;
}

export interface IEvents {
  [key: string]: any;
}

export interface IConfig<S extends IState, E extends IEvents> {
  state: S['state'];
  data: S extends { state: S['state'] } ? S['data'] : never;
  events: TTransitions<S, E>;
}

export type TTransitions<S extends IState, E extends IEvents> = {
  [U in S['state']]: {
    [L in keyof E]?: (
      data: S extends { state: U } ? S['data'] : never,
    ) => (
      payload: E[L],
    ) => [S extends { state: U } ? S['data'] : never] | [S extends { state: U } ? S['data'] : never, S['state']];
  };
};

export type TDispatch<E extends IEvents> = {
  [K in keyof E]: (payload: E[K]) => void;
};

export type TSubscriptionHandler<T> = (actor: T) => void | (() => void);

export interface ISubscription<T> {
  disposer: (() => void) | void;
  handler: TSubscriptionHandler<T>;
}

export type THistory = {
  id: number;
  state: string;
  data: any;
}[];