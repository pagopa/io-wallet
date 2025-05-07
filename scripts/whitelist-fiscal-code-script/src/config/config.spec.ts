import { describe, it, expect, vi } from 'vitest';
import { checkConfig } from './config';

vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

vi.mock('dotenv', () => ({
  config: vi.fn(),
}));

process.exit = vi.fn() as unknown as (
  code?: string | number | null | undefined,
) => never;
console.error = vi.fn();

describe('checkConfig()', () => {
  it('should pass validation when all env vars are valid', () => {
    process.env.DATABASE_CONNECTION_STRING = 'valid-connection-string';
    process.env.SLEEP_TIME_BETWEEN_REQUESTS_MS = '1000';
    process.env.REQUEST_TIMEOUT_MS = '10000';

    checkConfig();
  });

  it('should fail validation when DATABASE_CONNECTION_STRING is missing', () => {
    delete process.env.DATABASE_CONNECTION_STRING;
    process.env.SLEEP_TIME_BETWEEN_REQUESTS_MS = '1000';
    process.env.REQUEST_TIMEOUT_MS = '10000';

    try {
      checkConfig();
    } catch (error) {
      expect(error.message).toContain('DATABASE_CONNECTION_STRING is required');
      return;
    }

    expect(true).toStrictEqual(false);
  });

  it('should fail validation when DATABASE_CONNECTION_STRING is an empty string', () => {
    process.env.DATABASE_CONNECTION_STRING = '';
    process.env.SLEEP_TIME_BETWEEN_REQUESTS_MS = '1000';
    process.env.REQUEST_TIMEOUT_MS = '10000';

    try {
      checkConfig();
    } catch (error) {
      expect(error.message).toContain(
        'DATABASE_CONNECTION_STRING is not allowed to be empty',
      );
      return;
    }

    expect(true).toStrictEqual(false);
  });

  it('should fail validation when SLEEP_TIME_BETWEEN_REQUESTS_MS is of another type', () => {
    process.env.DATABASE_CONNECTION_STRING = 'valid-connection-string';
    process.env.SLEEP_TIME_BETWEEN_REQUESTS_MS = 'wrong-type'; // string, instead of number
    process.env.REQUEST_TIMEOUT_MS = '10000';

    try {
      checkConfig();
    } catch (error) {
      expect(error.message).toContain(
        'SLEEP_TIME_BETWEEN_REQUESTS_MS must be a number',
      );
      return;
    }

    expect(true).toStrictEqual(false);
  });

  it('should fail validation when REQUEST_TIMEOUT_MS is of another type', () => {
    process.env.DATABASE_CONNECTION_STRING = 'valid-connection-string';
    process.env.SLEEP_TIME_BETWEEN_REQUESTS_MS = '1000';
    process.env.REQUEST_TIMEOUT_MS = 'wrong-type'; // string, instead of number

    try {
      checkConfig();
    } catch (error) {
      expect(error.message).toContain('REQUEST_TIMEOUT_MS must be a number');
      return;
    }

    expect(true).toStrictEqual(false);
  });
});
