import { actor, THistoryRecord } from '..';
import { Devtool, devtool } from '../devtool';

describe('Devtools', () => {
  beforeEach(() => {
    devtool.setDevtool(new Devtool());
  });
  test('should give dev id to actors', () => {
    const instance = actor({
      state: 'foo',
      data: {},
      events: {},
    });
    instance.start();
    // @ts-ignore
    expect(instance._devtoolId).toBe(0);
  });
  /*
  test('should keep dictionary of actors which contains parent actor and state', () => {
    const instance = actor({
      state: 'foo',
      data: {},
      events: {},
    });
    instance.start();
    expect(devtool.getActors().size).toBe(1);
  });
  */
  test('should keep reference to currently running actor', () => {
    expect.assertions(1);
    const instance = actor({
      state: 'foo',
      data: {},
      events: {},
    });
    instance.on('foo', () => {
      expect(devtool.getCurrentActorIds()).toEqual([0]);
    });
    instance.start();
  });
  /*
  test('should trigger event on actor updates', () => {
    expect.assertions(5);
    let count = 0;
    devtool.subscribe(() => {
      [
        // Added
        () => expect(devtool.getActors().get(0)!.state === 'foo').toBe(true),
        // Set current actor
        () => expect(devtool.getActors().get(0)!.state === 'foo').toBe(true),
        // Update actor mode
        () => expect(devtool.getActors().get(0)!.state === 'foo').toBe(true),
        // Dispatch
        () => expect(devtool.getActors().get(0)!.state === 'foo').toBe(true),
        // Update event
        () => expect(devtool.getActors().get(0)!.state === 'bar').toBe(true),
      ][count++]();
    });
    
    const instance = actor({
      state: 'foo',
      data: {},
      events: {
        foo: {
          update: (data) => () => [data, 'bar'],
        },
        bar: {},
      },
    });
    instance.start();
    instance.dispatch.update(null);
  });
  */
  test('should keep history of state and data changes', () => {
    expect.assertions(1);
    let count = 0;
    const history: THistoryRecord[] = [];
    devtool.subscribe((historyRecord) => {
      history.push(historyRecord);
      count++;
      if (count === 9) {
        expect(history).toEqual([
          { type: 'add_actor', data: { id: 0, state: 'foo', data: {}, mode: 'stopped' } },
          { type: 'add_actor', data: { id: 1, state: 'baz', data: {}, mode: 'stopped' } },
          { type: 'subscription', data: { id: 0, state: 'foo', ref: 1, subscriptionId: 0 } },
          { type: 'update_actor', data: { id: 1, state: 'baz', data: {}, mode: 'started' } },
          { type: 'update_actor', data: { id: 0, state: 'foo', data: {}, mode: 'started' } },
          {
            type: 'dispatch',
            data: { id: 0, subscriptionId: undefined, state: 'foo', event: 'update', payload: null },
          },
          { type: 'update_actor', data: { id: 1, state: 'baz', data: {}, mode: 'stopped' } },
        ]);
      }
    });
    const instance = actor({
      state: 'foo',
      data: {},
      events: {
        foo: {
          update: (data) => () => [data, 'bar'],
        },
        bar: {},
      },
    });
    const instance2 = actor({
      state: 'baz',
      data: {},
      events: {},
    });
    instance.on('foo', instance2);
    instance.start();
    instance.dispatch.update(null);
  });
});
