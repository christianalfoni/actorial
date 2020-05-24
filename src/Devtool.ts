import { Actor } from './Actor';
import { THistory, TDispatch, TSubscriptionHandler } from './types';

export class Devtool {
  private id = 0;
  private subscriptionId = 0;
  private currentActorIds: number[] = [];
  private readonly actors = new Map<number, Actor<any, any>>();
  private readonly subscriptions: ((
    currentActorIds: number[],
    actors: Map<number, Actor<any, any>>,
    history: THistory,
  ) => void)[] = [];
  private history: THistory = [];
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
    // @ts-ignore
    this.actors.set(actor._devtoolId, actor);

    actor.subscribe((instance) => {
      this.subscriptions.forEach((handler) => handler(this.currentActorIds, this.actors, this.history));
    });

    this.history.push({
      type: 'add_actor',
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
  updateActor(actor: Actor<any, any>) {
    this.history.push({
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
    this.subscriptions.forEach((handler) => handler(this.currentActorIds, this.actors, this.history));
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
  getActors() {
    return this.actors;
  }
  addDispatch(data: { id: number; subscriptionId?: number; state: string | number; event: string; payload: any }) {
    this.history.push({
      type: 'dispatch',
      data,
    });
    this.subscriptions.forEach((handler) => handler(this.currentActorIds, this.actors, this.history));
  }
  addSubscription(data: { id: number; state: string | number; ref: string | number }) {
    const subscriptionId = this.subscriptionId++;

    this.history.push({
      type: 'subscription',
      data: {
        ...data,
        subscriptionId,
      },
    });

    return subscriptionId;
  }
  subscribe(cb: (currentActorIds: number[], actors: Map<number, Actor<any, any>>, history: THistory) => void) {
    this.subscriptions.push(cb);
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
  getActors() {
    return currentDevtool.getActors();
  },
  subscribe(cb: (currentActorsIds: number[], actors: Map<number, Actor<any, any>>, history: THistory) => void) {
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
};
