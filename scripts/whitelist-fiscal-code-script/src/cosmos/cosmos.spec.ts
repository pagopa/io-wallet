import { vi, describe, expect, it } from 'vitest';
import { getCosmosClient } from './cosmos';
import { CosmosClient } from '@azure/cosmos';

vi.mock('winston', () => {
  return {
    createLogger: vi.fn().mockImplementation(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn(),
    })),
    format: {
      combine: vi.fn(),
      timestamp: vi.fn(),
      simple: vi.fn(),
      printf: vi.fn(),
    },
    transports: {
      Console: vi.fn(),
      File: vi.fn(),
    },
  };
});

vi.mock('@azure/cosmos', () => ({
  CosmosClient: vi.fn().mockImplementation(() => ({})),
}));

describe('Cosmos Module', () => {
  it('should return a cosmos client', () => {
    process.env.DATABASE_CONNECTION_STRING = 'valid-connection-string';

    const cosmosClient = getCosmosClient();

    expect(cosmosClient).toBeDefined();
  });

  it('should throw an error', () => {
    vi.mocked(CosmosClient).mockImplementation(() => {
      throw new Error('failed to create cosmos client');
    });

    process.env.DATABASE_CONNECTION_STRING = 'valid-connection-string';

    try {
      getCosmosClient();
    } catch (error) {
      expect(error).toBeDefined();
      return;
    }

    expect(true).toStrictEqual(false);
  });
});
