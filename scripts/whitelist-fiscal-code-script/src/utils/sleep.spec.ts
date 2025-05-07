import { describe, expect, it } from 'vitest';
import { sleep } from './sleep';

describe('sleep', () => {
  it('should sleep for the specified duration (50 ms)', async () => {
    const start = Date.now();
    await sleep(50);
    const end = Date.now();

    const duration = end - start;

    expect(duration).toBeGreaterThanOrEqual(50);
  });

  it('should sleep for the specified duration (100 ms)', async () => {
    const start = Date.now();
    await sleep(100);
    const end = Date.now();

    const duration = end - start;

    expect(duration).toBeGreaterThanOrEqual(100);
  });

  it('should sleep for the specified duration (150 ms)', async () => {
    const start = Date.now();
    await sleep(150);
    const end = Date.now();

    const duration = end - start;

    expect(duration).toBeGreaterThanOrEqual(150);
  });
});
