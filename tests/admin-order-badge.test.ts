import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('sidebar listener watches only new orders, caps reads, updates counts and unsubscribes', () => {
  let request: any, deliver: any, reject: any, stopped = false;
  const firestore = {
    collection: (_db: unknown, name: string) => ({ name }),
    where: (field: string, op: string, value: string) => ({ field, op, value }),
    limit: (size: number) => ({ limit: size }),
    query: (collection: unknown, ...constraints: any[]) => ({ collection, constraints }),
    onSnapshot: (q: unknown, callback: unknown, onError: unknown) => {
      request = q; deliver = callback; reject = onError;
      return () => { stopped = true; };
    },
  };
  const module = { exports: {} as any };
  const code = ts.transpileModule(readFileSync(new URL('../src/lib/landing/landingOrderRepository.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: (name: string) => {
    if (name === 'firebase/firestore') return firestore;
    if (name === './landingSchema') return { LANDING_ORDER_COLLECTION: 'landingOrders' };
    return { db: {} };
  } });
  const counts: number[] = [], errors: Error[] = [];
  const unsubscribe = module.exports.subscribeNewLandingOrderCount((count: number) => counts.push(count), (error: Error) => errors.push(error));
  assert.equal(request.collection.name, 'landingOrders');
  assert.equal(request.constraints[0].field, 'status');
  assert.equal(request.constraints[0].value, 'new');
  assert.equal(request.constraints[1].limit, 100);
  deliver({ size: 0 }); deliver({ size: 3 }); deliver({ size: 2 }); deliver({ size: 100 });
  assert.deepEqual(counts, [0, 3, 2, 100]);
  reject(new Error('permission denied'));
  assert.equal(errors[0].message, 'permission denied');
  unsubscribe(); assert.equal(stopped, true);
});
