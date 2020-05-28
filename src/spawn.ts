import { Actor } from './Actor';

export function spawn<T extends (payload: void) => Actor<any, any>>(
  actor: T,
  payload?: null,
  on?: T extends (payload: any) => Actor<infer S, any>
    ?
        | {
            [K in S['state']]?: (data: S extends { state: K } ? S['data'] : never) => void;
          }
        | ((current: S, old: S) => void)
    : never,
): () => void;
export function spawn<T extends (payload: any) => Actor<any, any>>(
  actor: T,
  payload: T extends (payload: infer P) => any ? P : never,
  on?: T extends (payload: any) => Actor<infer S, any>
    ?
        | {
            [K in S['state']]?: (data: S extends { state: K } ? S['data'] : never) => void;
          }
        | ((current: S, old: S) => void)
    : never,
): () => void;
export function spawn<T extends (payload: any) => Actor<any, any>>(
  actor: T,
  payload: T extends (payload: infer P) => any ? P : never,
  on?: T extends (payload: any) => Actor<infer S, any>
    ?
        | {
            [K in S['state']]?: (data: S extends { state: K } ? S['data'] : never) => void;
          }
        | ((current: S, old: S) => void)
    : never,
): () => void {
  const instance = actor(payload);

  if (typeof on === 'function') {
    let old = { state: instance.state, data: instance.data };
    instance.subscribe((state, data) => {
      (on as any)({ state, data }, old);
      old = { state, data };
    });
  } else {
    Object.keys((on as any) || {}).forEach((state) => {
      // @ts-ignore
      instance.on(state, (data) => on[state](data));
    });
  }

  instance.start();

  const dispose = () => instance.stop();
  dispose._actorInstance = instance;
  return dispose;
}
