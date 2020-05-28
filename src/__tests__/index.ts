import { actor, spawn } from '..';

describe('Actorial', () => {
  test('should instantiate actors', () => {
    interface States {
      state: 'foo';
      data: undefined;
    }

    const actorA = actor<States, {}>({
      state: 'foo',
      data: undefined,
      events: {
        foo: {},
      },
    });
    expect(actorA).toBeDefined();
  });
  test('should instantiate actors with state', () => {
    expect.assertions(1);
    type States =
      | {
          state: 'foo';
          data: undefined;
        }
      | {
          state: 'bar';
          data: undefined;
        };

    const actorA = actor<States, {}>({
      state: 'foo',
      data: undefined,
      events: {
        foo: {},
        bar: {},
      },
    });
    spawn(actorA, null, (current) => {
      expect(current.state === 'foo').toBe(true);
    });
  });

  test('should instantiate actors with data', () => {
    expect.assertions(2);
    interface States {
      state: 'foo';
      data: {
        a: 'a';
      };
    }

    const actorA = actor<States, {}>({
      state: 'foo',
      data: {
        a: 'a',
      },
      events: {
        foo: {},
      },
    });
    spawn(actorA, null, (current) => {
      expect(current.state === 'foo').toBe(true);
      expect(current.data.a).toBe('a');
    });
  });

  test('should instantiate actors with events', () => {
    expect.assertions(2);
    type States =
      | {
          state: 'foo';
          data: {
            foo: string;
          };
        }
      | {
          state: 'bar';
          data: {
            bar: string;
          };
        };

    type Events = {
      changed: string;
    };

    const actorA = actor<States, Events>({
      state: 'foo',
      data: {
        foo: 'bar',
      },
      events: {
        foo: {
          changed: (data) => (update) => [{ ...data, foo: update }],
        },
        bar: {},
      },
    });
    spawn(actorA, null, (current) => {
      expect(current.state === 'foo').toBe(true);
      expect(current.state === 'foo' && current.data.foo).toBe('bar');
    });
  });

  test('should instantiate actors with a dispatcher', () => {
    expect.assertions(1);
    type States = {
      state: 'foo';
      data: {
        foo: string;
      };
    };

    type Events = {
      changed: string;
    };

    const actorA = actor<States, Events>({
      state: 'foo',
      data: {
        foo: 'bar',
      },
      events: {
        foo: {
          changed: (data) => (update) => [{ ...data, foo: update }],
        },
      },
    });
    spawn(actorA, null, {
      foo: (data) => expect(data.foo).toBe('bar'),
    });
  });

  test('should update data on valid event', () => {
    type States = {
      state: 'foo';
      data: {
        foo: string;
      };
    };

    type Events = {
      changed: string;
    };

    const actorA = actor<States, Events>({
      state: 'foo',
      data: {
        foo: 'bar',
      },
      events: {
        foo: {
          changed: (data) => (update) => [{ ...data, foo: update }],
        },
      },
      on: {
        foo: (data, dispatch) => {
          dispatch.changed('bar2');
        },
      },
    });
    spawn(actorA, null, (current) => {
      expect(current.data.foo).toBe('bar2');
    });
  });

  test('should change state with valid dispatch', () => {
    expect.assertions(1);
    type States =
      | {
          state: 'foo';
          data: {
            foo: string;
          };
        }
      | {
          state: 'bar';
          data: {
            foo: string;
          };
        };

    type Events = {
      changed: string;
    };

    const actorA = actor<States, Events>({
      state: 'foo',
      data: {
        foo: 'bar',
      },
      events: {
        foo: {
          changed: (data) => (update) => [{ ...data, foo: update }, 'bar'],
        },
        bar: {},
      },
      on: {
        foo: (data, dispatch) => {
          dispatch.changed('bar2');
        },
      },
    });
    spawn(actorA, null, {
      bar: (data) => expect(data.foo).toBe('bar2'),
    });
  });
  test('should ignore invalid event', () => {
    expect.assertions(1);
    type States =
      | {
          state: 'foo';
          data: {
            foo: string;
          };
        }
      | {
          state: 'bar';
          data: {
            foo: string;
          };
        };

    type Events = {
      changed: void;
    };

    const actorA = actor<States, Events>({
      state: 'foo',
      data: {
        foo: 'bar',
      },
      events: {
        foo: {
          changed: (data) => () => [{ ...data, foo: data.foo + '!' }, 'bar'],
        },
        bar: {},
      },
      on: {
        foo: (data, dispatch) => {
          dispatch.changed();
        },
        bar: (data, dispatch) => {
          dispatch.changed();
        },
      },
    });
    spawn(actorA, null, {
      bar: (data) => expect(data.foo).toBe('bar!'),
    });
  });
  test('should run dispose subscriptions when state change', () => {
    expect.assertions(1);
    type States =
      | {
          state: 'foo';
          data: {};
        }
      | {
          state: 'bar';
          data: {};
        };

    type Events = {
      toFoo: void;
      toBar: void;
    };

    const actorA = actor<States, Events>({
      state: 'foo',
      data: {},
      events: {
        foo: {
          toBar: (data) => () => [data, 'bar'],
        },
        bar: {
          toFoo: (data) => () => [data, 'foo'],
        },
      },
      on: {
        foo: (data, dispatch) => {
          setTimeout(() => dispatch.toBar());
          return () => expect(true).toBe(true);
        },
      },
    });
    return new Promise((resolve) => {
      spawn(actorA, null, {
        bar: resolve,
      });
    });
  });
  test('should be able to dispose an instance', () => {
    expect.assertions(0);
    type States =
      | {
          state: 'foo';
          data: {};
        }
      | {
          state: 'bar';
          data: {};
        };

    type Events = {
      toFoo: void;
      toBar: void;
    };

    let dispose: () => void;
    const actorA = actor<States, Events>({
      state: 'foo',
      data: {},
      events: {
        foo: {
          toBar: (data) => () => [data, 'bar'],
        },
        bar: {
          toFoo: (data) => () => [data, 'foo'],
        },
      },
      on: {
        foo: (data, dispatch) => {
          setTimeout(() => {
            dispose();
            dispatch.toBar();
          });
        },
        bar: () => {
          expect(true).toBe(true);
        },
      },
    });

    dispose = spawn(actorA);
    return new Promise((resolve) => setTimeout(resolve));
  });
});
