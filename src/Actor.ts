import { devtool } from './devtool';
import {
  IConfig,
  IEvents,
  IState,
  ISubscription,
  TDispatch,
  TSubscriptionHandler,
  TStateSubscriptionHandler,
} from './types';
import { spawn } from './spawn';

export class Actor<S extends IState, E extends IEvents> {
  dispatch: TDispatch<E>;
  data: S['data'];
  state: S['state'];

  private _mode: 'started' | 'stopped' | 'starting' = 'stopped';
  private readonly _devtoolId?: string;
  private readonly _devtoolSubscriptionId?: string;
  private readonly _config: IConfig<S, E>;
  private readonly _subscriptions: ISubscription<TSubscriptionHandler<S, E>>[] = [];
  private readonly _stateSubscriptions: {
    [state: string]: ISubscription<TStateSubscriptionHandler<S, E>>[];
  } = {};

  constructor(config: IConfig<S, E>) {
    this.state = config.state;
    this.data = config.data;
    this._config = config;

    if (process.env.NODE_ENV === 'production') {
      this.dispatch = this.createDispatcher(config.events);
    } else {
      devtool.addActor(this);
      this.dispatch = this.createDispatcher(config.events, devtool.createWrappedDispatcher());
    }

    Object.keys(config.on || {}).forEach((state) => {
      this.on(state, (config.on as any)[state as S['state']]);
    });
  }

  /**
   * Will start the actor after it has been stopped
   */
  start() {
    if (this._mode === 'stopped') {
      this._mode = 'starting';
      this.state = this._config.state;
      this.data = this._config.data;
      this.runSubscribers();
      this._mode = 'started';
      if (process.env.NODE_ENV !== 'production') {
        devtool.updateActor(this);
      }
    }
  }

  /**
   * Will stop the actor and call any disposers
   */
  stop() {
    if (this._mode === 'started') {
      this.runDisposers();
      this._mode = 'stopped';
      if (process.env.NODE_ENV !== 'production') {
        devtool.updateActor(this);
      }
    }
  }

  /**
   * Triggers if the actor is in the state requested and whenever it enters it at a later point.
   * Return a function to trigger when the actor leaves the requested state.
   * @param state
   * @param cb
   */
  on(state: S['state'], handler: TStateSubscriptionHandler<S, E>): void {
    if (!this._stateSubscriptions[state]) {
      this._stateSubscriptions[state] = [];
    }

    let cb: TStateSubscriptionHandler<S, E> = handler;

    if (process.env.NODE_ENV !== 'production') {
      const subscriptionId = devtool.addSubscription(this._devtoolId!, state, handler as any);
      const wrappedDispatcher = this.createDispatcher(this._config.events, devtool.createWrappedDispatcher());
      cb = (data) => {
        devtool.setCurrentSubscription(subscriptionId);
        const result = handler(data, wrappedDispatcher, spawn);
        return result;
      };
    }

    const subscription: ISubscription<TStateSubscriptionHandler<S, E>> = {
      disposer: undefined,
      handler: cb,
    };
    this._stateSubscriptions[state].push(subscription);
  }

  /**
   * Triggers the callback whenever the actor transitions to a new state.
   * Return a function to trigger whenever a certain state is transitioned away from.
   * @param cb
   */
  subscribe(cb: TSubscriptionHandler<S, E>): () => void {
    const subscription: ISubscription<TSubscriptionHandler<S, E>> = {
      disposer: undefined,
      handler: cb,
    };
    this._subscriptions.push(subscription);

    return () => {
      if (subscription.disposer) {
        subscription.disposer();
      }
      this._subscriptions.splice(this._subscriptions.indexOf(subscription), 1);
    };
  }

  private createDispatcher(
    events: any,
    devtoolWrapper?: (
      id: string,
      state: string,
      event: string,
      dispatch: (payload: any) => void,
    ) => (payload: any) => void,
  ): TDispatch<E> {
    const dispatch = {} as any;
    Object.keys(events).forEach((state) => {
      Object.keys(events[state]).forEach((event) => {
        if (!dispatch[event]) {
          dispatch[event] = devtoolWrapper
            ? devtoolWrapper(this._devtoolId!, state, event, this.createEventHandler(event, events[state][event]))
            : this.createEventHandler(event, events[state][event]);
        }
      });
    });
    return dispatch;
  }

  private createEventHandler(event: string, cb: (payload: any) => any) {
    return (payload: any) => {
      if (!this._config.events[this.state][event] || this._mode === 'stopped') {
        return;
      }

      const result = cb(this.data)(payload);

      this.data = result[0];

      // We do not run a transition when it is the same
      if (result.length === 1 || (result.length === 2 && this.state === result[1])) {
        if (process.env.NODE_ENV !== 'production') {
          devtool.updateActor(this);
        }
        return;
      }

      this.runDisposers();

      if (result.length === 2) {
        this.state = result[1];
      }

      if (process.env.NODE_ENV !== 'production') {
        devtool.updateActor(this);
      }

      this.runSubscribers();
    };
  }
  private runSubscribers() {
    if (this._stateSubscriptions[this.state]) {
      this._stateSubscriptions[this.state].forEach((subscription) => {
        subscription.disposer = subscription.handler(this.data, this.dispatch, spawn);
      });
    }
    this._subscriptions.forEach((subscription) => {
      subscription.disposer = subscription.handler(this.state, this.data, this.dispatch);
    });
  }
  private runDisposers() {
    if (this._stateSubscriptions[this.state]) {
      devtool.popCurrentSubscription();
      this._stateSubscriptions[this.state].forEach((subscription) => {
        if (subscription.disposer) {
          subscription.disposer();
          subscription.disposer = undefined;
        }
      });
    }

    this._subscriptions.forEach((subscription) => {
      if (subscription.disposer) {
        subscription.disposer();
        subscription.disposer = undefined;
      }
    });
  }
}
