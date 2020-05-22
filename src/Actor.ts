import { devtool } from './devtool';
import { IConfig, IEvents, IState, ISubscription, TDispatch, TSubscriptionHandler } from './types';

export class Actor<S extends IState, E extends IEvents> {
  dispatch: TDispatch<E>;
  data: S['data'];

  private _state: S['state'];
  private _mode: 'started' | 'stopped' = 'stopped';
  private readonly _devtoolId?: number;
  private readonly _devtoolParent?: {
    id: number;
    state: string;
  };
  private readonly _config: IConfig<S, E>;
  private readonly _subscriptions: {
    [state: string]: ISubscription<Actor<S, E>>[];
  } = {};

  constructor(config: IConfig<S, E>) {
    this._state = config.state;
    this.data = config.data;
    this.dispatch = this.createDispatcher(config.events);
    this._config = config;
  }

  /**
   * Will start the actor after it has been stopped
   */
  start() {
    if (this._mode === 'stopped') {
      this._mode = 'started';
      this._state = this._config.state;
      this.data = this._config.data;

      if (process.env.NODE_ENV !== 'production') {
        devtool.addActor(this);
      }

      this.runSubscribers();
    }
  }

  /**
   * Will stop the actor and call any disposers
   */
  stop() {
    if (this._mode === 'started') {
      this.runDisposers();
      this._mode = 'stopped';
    }
  }

  /**
   * Triggers if the actor is in the state requested and whenever it enters it at a later point.
   * Return a function to trigger when the actor leaves the requested state.
   * @param state
   * @param cb
   */
  on<C extends S['state']>(state: C, arg: TSubscriptionHandler<Actor<S, E>> | Actor<any, any>): void {
    if (!this._subscriptions[state]) {
      this._subscriptions[state] = [];
    }

    let cb: TSubscriptionHandler<Actor<S, E>>;

    if (process.env.NODE_ENV === 'production') {
      cb =
        arg instanceof Actor
          ? () => {
              arg.start();
              return () => {
                arg.stop();
              };
            }
          : arg;
    } else {
      cb =
        arg instanceof Actor
          ? () => {
              devtool.setActor(this);
              arg.start();
              devtool.setActor(null);
              return () => {
                arg.stop();
              };
            }
          : (...args) => {
              devtool.setActor(this);
              const result = arg(...args);
              devtool.setActor(null);
              return result;
            };
    }

    const subscription: ISubscription<Actor<S, E>> = {
      disposer: undefined,
      handler: cb,
    };
    this._subscriptions[state].push(subscription);
  }

  /**
   * Triggers the callback whenever the actor transitions to a new state.
   * Return a function to trigger whenever a certain state is transitioned away from.
   * @param cb
   */
  subscribe(cb: TSubscriptionHandler<Actor<S, E>>): () => void {
    if (!this._subscriptions['']) {
      this._subscriptions[''] = [];
    }
    const subscription: ISubscription<Actor<S, E>> = {
      disposer: undefined,
      handler: cb,
    };
    this._subscriptions[''].push(subscription);

    return () => {
      if (subscription.disposer) {
        subscription.disposer();
      }
      this._subscriptions[''].splice(this._subscriptions[''].indexOf(subscription), 1);
    };
  }

  /**
   * Will return true or false based on the actor being in the requested state
   * @param state
   */
  matches<C extends S['state']>(state: C): this is S extends { state: C } ? Actor<S, E> : never {
    return state === this._state;
  }

  private createDispatcher(events: any): TDispatch<E> {
    const dispatch = {} as any;
    Object.keys(events).forEach((state) => {
      Object.keys(events[state]).forEach((event) => {
        if (!dispatch[event]) {
          dispatch[event] = this.createEventHandler(event, events[state][event]);
        }
      });
    });
    return dispatch;
  }

  private createEventHandler(event: string, cb: (payload: any) => any) {
    return (payload: any) => {
      if (!this._config.events[this._state][event] || this._mode === 'stopped') {
        return;
      }

      if (process.env.NODE_ENV !== 'production') {
        devtool.setActor(this);
      }

      const result = cb(this.data)(payload);

      this.data = result[0];

      this.runDisposers();

      if (result.length === 2) {
        this._state = result[1];
      }

      this.runSubscribers();
    };
  }
  private runSubscribers() {
    if (this._subscriptions['']) {
      this._subscriptions[''].forEach((subscription) => {
        subscription.disposer = subscription.handler(this);
      });
    }

    if (this._subscriptions[this._state]) {
      this._subscriptions[this._state].forEach((subscription) => {
        subscription.disposer = subscription.handler(this);
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      devtool.setActor(null);
    }
  }
  private runDisposers() {
    if (this._subscriptions[this._state]) {
      this._subscriptions[this._state].forEach((subscription) => {
        if (subscription.disposer) {
          subscription.disposer();
          subscription.disposer = undefined;
        }
      });
    }

    if (this._subscriptions['']) {
      this._subscriptions[''].forEach((subscription) => {
        if (subscription.disposer) {
          subscription.disposer();
          subscription.disposer = undefined;
        }
      });
    }
  }
}
