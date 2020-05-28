import { Actor } from './Actor';

export interface IState {
  state: string | number;
  data: any;
}

export interface IEvents {
  [key: string]: any;
}

export interface ISpawn {
  <T extends (payload: void) => Actor<any, any>>(
    actor: T,
    payload?: null,
    on?: T extends (payload: any) => Actor<infer S, any>
      ?
          | {
              [K in S['state']]?: (data: S extends { state: K } ? S['data'] : never) => void;
            }
          | ((current: S, old: S) => void)
      : never,
  ): () => void;
  <T extends (payload: any) => Actor<any, any>>(
    actor: T,
    payload: T extends (payload: infer P) => any ? P : never,
    on?: T extends (payload: any) => Actor<infer S, any>
      ?
          | {
              [K in S['state']]?: (data: S extends { state: K } ? S['data'] : never) => void;
            }
          | ((current: S, old: S) => void)
      : never,
  ): () => void;
}

export interface IConfig<S extends IState, E extends IEvents> {
  state: S['state'];
  data: S extends { state: S['state'] } ? S['data'] : never;
  events: TTransitions<S, E>;
  on?: {
    [O in S['state']]?: TStateSubscriptionHandler<S, E>;
  };
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

export type TSubscriptionHandler<S extends IState, E extends IEvents> = (
  state: S['state'],
  data: S['data'],
  dispatch: TDispatch<E>,
) => void | (() => void);

export type TStateSubscriptionHandler<S extends IState, E extends IEvents> = (
  data: S['data'],
  dispatch: TDispatch<E>,
  spawn: ISpawn,
) => void | (() => void);

export interface ISubscription<T extends TSubscriptionHandler<any, any> | TStateSubscriptionHandler<any, any>> {
  disposer: (() => void) | void;
  handler: T;
}

export type THistoryRecord =
  | {
      type: 'add_actor';
      data: {
        id: string;
        state: string;
        data: any;
        mode: string;
        events: {
          [state: string]: string[];
        };
      };
    }
  | {
      type: 'update_actor';
      data: {
        id: string;
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
        id: string;
        subscriptionIds: string[];
        state: string | number;
        event: string;
        payload: any;
      };
    }
  | {
      type: 'subscription';
      data: {
        id: string;
        subscriptionId: string;
        state: string | number;
        name: string;
      };
    };

export type THistory = THistoryRecord[];
