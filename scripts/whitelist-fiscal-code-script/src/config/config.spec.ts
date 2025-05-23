import { describe, expect, it, vi } from 'vitest';

import { checkConfig } from './config';

vi.mock('winston', () => ({
  createLogger: vi.fn().mockImplementation(() => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    verbose: vi.fn(),
    warn: vi.fn(),
  })),
  format: {
    combine: vi.fn(),
    printf: vi.fn(),
    simple: vi.fn(),
    timestamp: vi.fn(),
  },
  transports: {
    Console: vi.fn(),
    File: vi.fn(),
  },
}));

vi.mock('dotenv', () => ({
  config: vi.fn(),
}));

process.exit = vi.fn() as unknown as (
  code?: null | number | string | undefined,
) => never;

describe('checkConfig()', () => {
  it('should pass validation when all env vars are valid', () => {
    process.env.DATABASE_CONNECTION_STRING = 'valid-connection-string';
    process.env.DATABASE_NAME = 'test-database-name';
    process.env.DATABASE_CONTAINER_NAME = 'test-database-container-name';
    process.env.SLEEP_TIME_BETWEEN_REQUESTS_MS = '1000';
    process.env.REQUEST_TIMEOUT_MS = '10000';

    checkConfig();
  });

  it('should fail validation when DATABASE_CONNECTION_STRING is missing', () => {
    delete process.env.DATABASE_CONNECTION_STRING;
    process.env.DATABASE_NAME = 'test-database-name';
    process.env.DATABASE_CONTAINER_NAME = 'test-database-container-name';
    process.env.SLEEP_TIME_BETWEEN_REQUESTS_MS = '1000';
    process.env.REQUEST_TIMEOUT_MS = '10000';

    try {
      checkConfig();
    } catch (error) {
      expect((error as Error).message).toContain(
        'DATABASE_CONNECTION_STRING is required',
      );
      return;
    }

    expect(true).toStrictEqual(false);
  });

  it('should fail validation when DATABASE_CONNECTION_STRING is an empty string', () => {
    process.env.DATABASE_CONNECTION_STRING = '';
    process.env.DATABASE_NAME = 'test-database-name';
    process.env.DATABASE_CONTAINER_NAME = 'test-database-container-name';
    process.env.SLEEP_TIME_BETWEEN_REQUESTS_MS = '1000';
    process.env.REQUEST_TIMEOUT_MS = '10000';

    try {
      checkConfig();
    } catch (error) {
      expect((error as Error).message).toContain(
        'DATABASE_CONNECTION_STRING is not allowed to be empty',
      );
      return;
    }

    expect(true).toStrictEqual(false);
  });

  it('should fail validation when SLEEP_TIME_BETWEEN_REQUESTS_MS is of another type', () => {
    process.env.DATABASE_CONNECTION_STRING = 'valid-connection-string';
    process.env.DATABASE_NAME = 'test-database-name';
    process.env.DATABASE_CONTAINER_NAME = 'test-database-container-name';
    process.env.SLEEP_TIME_BETWEEN_REQUESTS_MS = 'wrong-type'; // string, instead of number
    process.env.REQUEST_TIMEOUT_MS = '10000';

    try {
      checkConfig();
    } catch (error) {
      expect((error as Error).message).toContain(
        'SLEEP_TIME_BETWEEN_REQUESTS_MS must be a number',
      );
      return;
    }

    expect(true).toStrictEqual(false);
  });

  it('should fail validation when REQUEST_TIMEOUT_MS is of another type', () => {
    process.env.DATABASE_CONNECTION_STRING = 'valid-connection-string';
    process.env.DATABASE_NAME = 'test-database-name';
    process.env.DATABASE_CONTAINER_NAME = 'test-database-container-name';
    process.env.SLEEP_TIME_BETWEEN_REQUESTS_MS = '1000';
    process.env.REQUEST_TIMEOUT_MS = 'wrong-type'; // string, instead of number

    try {
      checkConfig();
    } catch (error) {
      expect((error as Error).message).toContain(
        'REQUEST_TIMEOUT_MS must be a number',
      );
      return;
    }

    expect(true).toStrictEqual(false);
  });

  it('should fail validation when DATABASE_NAME is an empty string', () => {
    process.env.DATABASE_CONNECTION_STRING = 'valid-connection-string';
    process.env.DATABASE_NAME = ''; // empty string not allowed
    process.env.DATABASE_CONTAINER_NAME = 'test-database-container-name';
    process.env.SLEEP_TIME_BETWEEN_REQUESTS_MS = '1000';
    process.env.REQUEST_TIMEOUT_MS = '10000';

    try {
      checkConfig();
    } catch (error) {
      expect((error as Error).message).toContain(
        'DATABASE_NAME is not allowed to be empty',
      );
      return;
    }

    expect(true).toStrictEqual(false);
  });

  it('should fail validation when DATABASE_CONTAINER_NAME is an empty string', () => {
    process.env.DATABASE_CONNECTION_STRING = 'valid-connection-string';
    process.env.DATABASE_NAME = 'test-database-name';
    process.env.DATABASE_CONTAINER_NAME = ''; // empty string not allowed
    process.env.SLEEP_TIME_BETWEEN_REQUESTS_MS = '1000';
    process.env.REQUEST_TIMEOUT_MS = '10000';

    try {
      checkConfig();
    } catch (error) {
      expect((error as Error).message).toContain(
        'DATABASE_CONTAINER_NAME is not allowed to be empty',
      );
      return;
    }

    expect(true).toStrictEqual(false);
  });
});
