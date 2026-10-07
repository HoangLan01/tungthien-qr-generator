import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_BODY_COLOR,
  validateQrOptions,
} from '../src/utils/qrOptions.js';

test('uses scan-friendly V1.1 defaults and accepts documented presets', () => {
  assert.deepEqual(validateQrOptions(), {
    format: 'png',
    size: undefined,
    bodyColor: DEFAULT_BODY_COLOR,
    bgColor: DEFAULT_BACKGROUND_COLOR,
  });
  assert.deepEqual(validateQrOptions({
    format: 'svg', size: 2000, bodyColor: '#0b3d91', bgColor: '#ffffff',
  }), {
    format: 'svg', size: 2000, bodyColor: '#0B3D91', bgColor: '#FFFFFF',
  });
});

test('rejects unsupported size, invalid hex colors, and low contrast options', () => {
  for (const [input, code] of [
    [{ format: 'pdf' }, 'INVALID_FORMAT'],
    [{ size: 750 }, 'INVALID_SIZE'],
    [{ size: '1000' }, 'INVALID_SIZE'],
    [{ bodyColor: 'black' }, 'INVALID_COLOR'],
    [{ bodyColor: '#000000', bgColor: '#000000' }, 'LOW_COLOR_CONTRAST'],
    [{ bodyColor: '#808080', bgColor: '#FFFFFF' }, 'LOW_COLOR_CONTRAST'],
    [{ bodyColor: '#FFFFFF', bgColor: '#000000' }, 'LOW_COLOR_CONTRAST'],
  ]) {
    assert.deepEqual(validateQrOptions(input), { code });
  }
});
