import { actor } from '..';

describe('Actorial', () => {
  test('should instantiate actors', () => {
    interface States {
      state: 'foo';
      data: undefined;
    }

    const instance = actor<States, {}>({
      state: 'foo',
      data: undefined,
      events: {
        foo: {},
      },
    });
    expect(instance).toBeDefined();
  });
  test('should instantiate actors with state', () => {
    type States =
      | {
          state: 'foo';
          data: undefined;
        }
      | {
          state: 'bar';
          data: undefined;
        };

    const instance = actor<States, {}>({
      state: 'foo',
      data: undefined,
      events: {
        foo: {},
        bar: {},
      },
    });
    expect(instance.state === 'foo').toBe(true);
  });
  test('should instantiate actors with data', () => {
    interface States {
      state: 'foo';
      data: {
        a: 'a';
      };
    }

    const instance = actor<States, {}>({
      state: 'foo',
      data: {
        a: 'a',
      },
      events: {
        foo: {},
      },
    });
    expect(instance.state === 'foo').toBe(true);
    expect(instance.data.a).toBe('a');
  });
  test('should instantiate actors with events', () => {
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

    const instance = actor<States, Events>({
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
    expect(instance.state === 'foo').toBe(true);
    expect(instance.state === 'foo' && instance.data.foo).toBe('bar');
  });
  test('should instantiate actors with a dispatcher', () => {
    type States = {
      state: 'foo';
      data: {
        foo: string;
      };
    };

    type Events = {
      changed: string;
    };

    const instance = actor<States, Events>({
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
    expect(instance.dispatch.changed).toBeDefined();
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

    const instance = actor<States, Events>({
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
    instance.start();
    instance.dispatch.changed('bar2');
    expect(instance.data.foo).toBe('bar2');
  });
  test('should change state with valid dispatch', () => {
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

    const instance = actor<States, Events>({
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
    });
    instance.start();
    instance.dispatch.changed('bar2');
    expect(instance.state === 'bar').toBe(true);
    expect(instance.state === 'bar' && instance.data.foo).toBe('bar2');
  });
  test('should ignore invalid event', () => {
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

    const instance = actor<States, Events>({
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
    });
    instance.start();
    instance.dispatch.changed();
    expect(instance.state === 'bar' && instance.data.foo).toBe('bar!');
    instance.dispatch.changed();
    expect(instance.state === 'bar' && instance.data.foo).toBe('bar!');
  });
  test('should trigger subscriptions on state change', () => {
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

    const instance = actor<States, Events>({
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
    });

    expect.assertions(3);
    let count = 0;
    instance.subscribe((actor) => {
      count++;
      if (count === 1) {
        expect(actor.state === 'foo').toBe(true);
      } else if (count === 2) {
        expect(actor.state === 'bar').toBe(true);
      } else {
        expect(actor.state === 'foo').toBe(true);
      }
    });
    instance.start();
    instance.dispatch.toBar();
    instance.dispatch.toFoo();
  });
  test('should trigger specific subscriptions on state change', () => {
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

    const instance = actor<States, Events>({
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
    });

    expect.assertions(3);
    // Triggers when state matches
    instance.on('foo', (actor) => {
      expect(actor.state === 'foo').toBe(true);
    });
    instance.on('bar', (actor) => {
      expect(actor.state === 'bar').toBe(true);
    });
    instance.start();
    instance.dispatch.toBar();
    instance.dispatch.toFoo();
  });
  test('should run dispose subscriptions when state change', () => {
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

    const instance = actor<States, Events>({
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
    });

    expect.assertions(3);
    let subscriptionCount = 0;
    instance.subscribe((actor) => {
      return () => {
        subscriptionCount++;
        if (subscriptionCount === 1) {
          expect(actor.state === 'foo').toBe(true);
        } else {
          expect(actor.state === 'bar').toBe(true);
        }
      };
    });
    instance.on('bar', (actor) => {
      return () => {
        expect(actor.state === 'bar').toBe(true);
      };
    });
    instance.start();
    instance.dispatch.toBar();
    instance.dispatch.toFoo();
  });
  test('should be able to dispose a subscription', () => {
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

    const instance = actor<States, Events>({
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
    });

    expect.assertions(2);
    let count = 0;
    const dispose = instance.subscribe((actor) => {
      count++;
      if (count === 1) {
        expect(actor.state === 'foo').toBe(true);
      } else {
        expect(actor.state === 'bar').toBe(true);
      }
    });
    instance.start();
    instance.dispatch.toBar();
    dispose();
    instance.dispatch.toFoo();
  });
});
