import { Actor } from './Actor';
import { THistory, TDispatch, TSubscriptionHandler, THistoryRecord } from './types';

export class Devtool {
  private id = 0;
  private subscriptionId = 0;
  private currentActorIds: number[] = [];
  private subscriber: ((event: THistoryRecord) => void) | null = null;
  private buffer: THistory = [];
  addActor(actor: Actor<any, any>) {
    // @ts-ignore
    actor._devtoolId = this.id++;
    // @ts-ignore
    actor._devtoolParent = this.currentActorIds.length
      ? {
          // @ts-ignore
          id: this.actors.get(this.currentActorIds[this.currentActorIds.length - 1])._devtoolId,
          // @ts-ignore
          state: this.actors.get(this.currentActorIds[this.currentActorIds.length - 1]).state,
        }
      : undefined;
    this.emitUpdate({
      type: 'add_actor',
      data: {
        // @ts-ignore
        id: actor._devtoolId,
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
  setCurrentActor(actor: Actor<any, any>) {
    // Related to starting an actor we might already be running when running
    // "on" handlers
    // @ts-ignore
    if (this.currentActorIds[this.currentActorIds.length - 1] === actor._devtoolId!) {
      return;
    }
    // @ts-ignore
    this.currentActorIds.push(actor._devtoolId);
  }
  popCurrentActor() {
    this.currentActorIds.pop();
  }
  getCurrentActorIds() {
    return this.currentActorIds;
  }
  addDispatch(data: { id: number; subscriptionId?: number; state: string | number; event: string; payload: any }) {
    this.emitUpdate({
      type: 'dispatch',
      data,
    });
  }
  addSubscription(data: { id: number; state: string | number; ref: string | number }) {
    const subscriptionId = this.subscriptionId++;

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
  setCurrentActor(actor: Actor<any, any>) {
    currentDevtool.setCurrentActor(actor);
  },
  popCurrentActor() {
    currentDevtool.popCurrentActor();
  },
  getCurrentActorIds() {
    return currentDevtool.getCurrentActorIds();
  },
  subscribe(cb: (event: THistoryRecord) => void) {
    return currentDevtool.subscribe(cb);
  },
  createWrappedDispatcher(subscriptionId?: number) {
    return (id: number, state: string, event: string, dispatch: (payload: any) => void) => {
      return (payload: any) => {
        currentDevtool.addDispatch({
          id,
          subscriptionId,
          state,
          event,
          payload,
        });
        dispatch(payload);
      };
    };
  },
  addSubscription(
    id: number,
    state: string | number,
    subscriber: TSubscriptionHandler<Actor<any, any>> | Actor<any, any>,
  ) {
    if (subscriber instanceof Actor) {
      return currentDevtool.addSubscription({
        id,
        state,
        // @ts-ignore
        ref: subscriber._devtoolId!,
      });
    }

    return currentDevtool.addSubscription({
      id,
      state,
      ref: subscriber.name,
    });
  },
  getEventsBuffer() {
    return currentDevtool.getEventsBuffer();
  },
};
