import { Actor } from './Actor';
import { THistory } from './types';

export class Devtool {
  private id = 0;
  private currentActor: Actor<any, any> | null = null;
  private readonly actors = new Map<string, Actor<any, any>>();
  private readonly subscriptions: ((
    actor: Actor<any, any>,
    actors: Map<string, Actor<any, any>>,
    history: THistory,
  ) => void)[] = [];
  private history: THistory = [];
  addActor(actor: Actor<any, any>) {
    // @ts-ignore
    actor._devtoolId = this.id++;
    // @ts-ignore
    actor._devtoolParentId = this.currentActor ? this.currentActor._devtoolId! : undefined;
    // @ts-ignore
    this.actors.set(actor._devtoolId, actor);
    actor.subscribe((instance) => {
      this.history.push({
        // @ts-ignore
        id: instance._devtoolId,
        // @ts-ignore
        state: instance._state,
        data: instance.data,
      });
      this.subscriptions.forEach((handler) => handler(actor, this.actors, this.history));
    });
    // this.subscriptions.forEach((handler) => handler(actor, this.actors, this.history));
  }
  setActor(actor: Actor<any, any> | null) {
    this.currentActor = actor;
  }
  getCurrentActor() {
    return this.currentActor;
  }
  getActors() {
    return Array.from(this.actors);
  }
  subscribe(cb: (actor: Actor<any, any>, actors: Map<string, Actor<any, any>>, history: THistory) => void) {
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
  setActor(actor: Actor<any, any> | null) {
    currentDevtool.setActor(actor);
  },
  getCurrentActor() {
    return currentDevtool.getCurrentActor();
  },
  getActors() {
    return currentDevtool.getActors();
  },
  subscribe(cb: (actor: Actor<any, any>, actors: Map<string, Actor<any, any>>, history: THistory) => void) {
    return currentDevtool.subscribe(cb);
  },
};
