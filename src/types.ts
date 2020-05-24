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

export type THistory = (
  | {
      type: 'add_actor';
      data: {
        id: number;
        state: string;
        data: any;
        mode: string;
      };
    }
  | {
      type: 'update_actor';
      data: {
        id: number;
        state: string;
        data: any;
        mode: string;
      };
    }
  | {
      type: 'current_actor';
      data: number;
    }
  | {
      type: 'dispatch';
      data: {
        id: number;
        subscriptionId?: number;
        state: string | number;
        event: string;
        payload: any;
      };
    }
  | {
      type: 'subscription';
      data: {
        id: number;
        subscriptionId: number;
        state: string | number;
        ref: string | number;
      };
    }
)[];
