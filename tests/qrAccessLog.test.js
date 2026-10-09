import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import { createQrAccessLogger } from '../src/middleware/qrAccessLog.js';

test('optional QR access logger records only safe operational fields', () => {
  const lines = [];
  const times = [100, 157];
  const logger = createQrAccessLogger({
    enabled: true,
    log: (line) => lines.push(JSON.parse(line)),
    idGenerator: () => 'request-id',
    now: () => times.shift(),
    timestamp: () => '2026-10-07T12:00:00.000Z',
  });
  const response = Object.assign(new EventEmitter(), {
    locals: { errorCode: 'QR_GENERATION_ERROR' },
    statusCode: 504,
    headers: {},
    set(key, value) { this.headers[key] = value; },
  });

  logger({ method: 'POST', body: { url: 'https://private.example/never-log' } }, response, () => {});
  response.emit('finish');

  assert.equal(response.headers['X-Request-Id'], 'request-id');
  assert.deepEqual(lines, [{
    event: 'qr_request',
    timestamp: '2026-10-07T12:00:00.000Z',
    requestId: 'request-id',
    status: 504,
    durationMs: 57,
    errorCode: 'QR_GENERATION_ERROR',
  }]);
  assert.doesNotMatch(JSON.stringify(lines), /private\.example|never-log/);
});

test('access logger is a no-op unless explicitly enabled', () => {
  let called = false;
  const logger = createQrAccessLogger({ log: () => { called = true; } });
  logger({ method: 'POST' }, {}, () => { called = true; });
  assert.equal(called, true);
});
