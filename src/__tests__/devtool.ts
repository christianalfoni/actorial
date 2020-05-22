import { actor } from '..';
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
  test('should keep dictionary of actors which contains parent actor and state', () => {
    const instance = actor({
      state: 'foo',
      data: {},
      events: {},
    });
    instance.start();
    expect(devtool.getActors().size).toBe(1);
  });
  test('should keep reference to currently running actor', () => {
    expect.assertions(1);
    const instance = actor({
      state: 'foo',
      data: {},
      events: {},
    });
    instance.on('foo', () => {
      expect(devtool.getCurrentActor()).toBe(instance);
    });
    instance.start();
  });
  test('should trigger event on actor updates', () => {
    expect.assertions(2);
    let count = 0;
    devtool.subscribe((actor) => {
      count++;
      if (count === 1) {
        expect(actor.matches('foo')).toBe(true);
      } else {
        expect(actor.matches('bar')).toBe(true);
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
    instance.start();
    instance.dispatch.update(null);
  });
  test('should keep history of state and data changes', () => {
    expect.assertions(4);
    let count = 0;
    devtool.subscribe((actor, actors, history) => {
      count++;
      if (count === 1) {
        expect(actors.size).toBe(1);
      } else if (count === 2) {
        expect(actors.size).toBe(2);
        // @ts-ignore
        expect(actor._devtoolParent).toEqual({
          id: 0,
          state: 'foo',
        });
      } else {
        expect(history).toEqual([
          {
            id: 0,
            state: 'foo',
            data: {},
          },
          {
            id: 1,
            state: 'baz',
            data: {},
          },
          {
            id: 0,
            state: 'bar',
            data: {},
          },
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
