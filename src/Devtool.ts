import { Actor } from './Actor';
import { THistory, TDispatch, TSubscriptionHandler, THistoryRecord, ISpawn } from './types';
import { spawn } from './spawn';

export class Devtool {
  private id = 0;
  private subscriptionId = 0;
  private currentSubscriptions: string[] = [];
  private subscriber: ((event: THistoryRecord) => void) | null = null;
  private buffer: THistory = [];
  addActor(actor: Actor<any, any>) {
    // @ts-ignore
    actor._devtoolId = String(this.id++);
    // @ts-ignore
    actor._devtoolSubscriptionId = this.currentSubscriptions.length
      ? this.currentSubscriptions[this.currentSubscriptions.length - 1]
      : undefined;
    this.emitUpdate({
      type: 'add_actor',
      data: {
        // @ts-ignore
        id: actor._devtoolId,
        // @ts-ignore
        subscriptionId: actor._devtoolSubscriptionId,
        state: actor.state,
        data: actor.data,
        // @ts-ignore
        mode: actor._mode,
        // @ts-ignore
        events: Object.keys(actor._config.events).reduce<{ [state: string]: string[] }>((aggr, state) => {
          // @ts-ignore
          aggr[state] = Object.keys(actor._config.events[state]);

          return aggr;
        }, {}),
      },
    });
  }
  updateActor(actor: Actor<any, any>) {
    this.emitUpdate({
      type: 'update_actor',
      data: {
        // @ts-ignore
        id: actor._devtoolId,
        state: actor.state,
        data: actor.data,
        // @ts-ignore
        mode: actor._mode,
      },
    });
  }
  setCurrentSubscription(id: string) {
    // Related to starting an actor we might already be running when running
    // "on" handlers
    // @ts-ignore
    if (this.currentSubscriptions[this.currentSubscriptions.length - 1] === id) {
      return;
    }
    this.currentSubscriptions.push(id);
  }
  popCurrentSubscription() {
    this.currentSubscriptions.pop();
  }
  getCurrentSubscriptions() {
    return this.currentSubscriptions;
  }
  addDispatch(data: { id: string; state: string | number; event: string; payload: any }) {
    this.emitUpdate({
      type: 'dispatch',
      data: {
        ...data,
        subscriptionIds: this.currentSubscriptions.slice(),
      },
    });
  }
  addSubscription(data: { id: string; state: string | number; name: string }) {
    const subscriptionId = String(this.subscriptionId++);

    this.emitUpdate({
      type: 'subscription',
      data: {
        ...data,
        subscriptionId,
      },
    });

    return subscriptionId;
  }
  subscribe(cb: (event: THistoryRecord) => void) {
    this.subscriber = cb;
  }
  getEventsBuffer() {
    return this.buffer;
  }
  private emitUpdate(event: THistoryRecord) {
    if (this.subscriber) {
      this.subscriber(event);
    } else {
      this.buffer.push(event);
    }
  }
}

let currentDevtool: Devtool;
export const devtool = {
  setDevtool(devtool: Devtool) {
    return (currentDevtool = devtool);
  },
  addActor(actor: Actor<any, any>) {
    currentDevtool.addActor(actor);
  },
  updateActor(actor: Actor<any, any>) {
    currentDevtool.updateActor(actor);
  },
  setCurrentSubscription(id: string) {
    currentDevtool.setCurrentSubscription(id);
  },
  popCurrentSubscription() {
    currentDevtool.popCurrentSubscription();
  },
  subscribe(cb: (event: THistoryRecord) => void) {
    return currentDevtool.subscribe(cb);
  },
  createWrappedDispatcher() {
    return (id: string, state: string, event: string, dispatch: (payload: any) => void) => {
      return (payload: any) => {
        currentDevtool.addDispatch({
          id,
          state,
          event,
          payload,
        });
        dispatch(payload);
      };
    };
  },
  addSubscription(id: string, state: string | number, subscriber: TSubscriptionHandler<any, any>) {
    return currentDevtool.addSubscription({
      id,
      state,
      name: subscriber.name,
    });
  },
  getEventsBuffer() {
    return currentDevtool.getEventsBuffer();
  },
};
