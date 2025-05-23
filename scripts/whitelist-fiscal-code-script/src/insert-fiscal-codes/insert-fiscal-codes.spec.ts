import { CosmosClient } from '@azure/cosmos';
import { describe, expect, it, vi } from 'vitest';

import { insertFiscalCodes } from './insert-fiscal-codes';

process.env.SLEEP_TIME_BETWEEN_REQUESTS_MS = '0';

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

describe('Insert Fiscal Codes', () => {
  it('should upsert one fiscal code', async () => {
    const fiscalCodes = ['TEST0000001'];

    const cosmosClientMock = {
      database: vi.fn().mockReturnValue({
        container: vi.fn().mockReturnValue({
          items: {
            upsert: vi.fn(),
          },
        }),
      }),
    };

    await insertFiscalCodes(
      cosmosClientMock as unknown as CosmosClient,
      fiscalCodes,
    );

    expect(cosmosClientMock.database).toHaveBeenCalledTimes(1);
    expect(cosmosClientMock.database().container).toHaveBeenCalledTimes(1);
    expect(
      cosmosClientMock.database().container().items.upsert,
    ).toHaveBeenCalledTimes(1);
    expect(
      cosmosClientMock.database().container().items.upsert,
    ).toHaveBeenCalledWith({
      createdAt: expect.any(Date),
      id: 'TEST0000001',
    });
  });

  it('should upsert two fiscal codes', async () => {
    const fiscalCodes = ['TEST0000001', 'TEST0000002'];

    const cosmosClientMock = {
      database: vi.fn().mockReturnValue({
        container: vi.fn().mockReturnValue({
          items: {
            upsert: vi.fn(),
          },
        }),
      }),
    };

    await insertFiscalCodes(
      cosmosClientMock as unknown as CosmosClient,
      fiscalCodes,
    );

    expect(cosmosClientMock.database).toHaveBeenCalledTimes(1);
    expect(cosmosClientMock.database().container).toHaveBeenCalledTimes(1);
    expect(
      cosmosClientMock.database().container().items.upsert,
    ).toHaveBeenCalledTimes(2);

    expect(
      cosmosClientMock.database().container().items.upsert,
    ).toHaveBeenCalledWith({
      createdAt: expect.any(Date),
      id: 'TEST0000001',
    });
    expect(
      cosmosClientMock.database().container().items.upsert,
    ).toHaveBeenCalledWith({
      createdAt: expect.any(Date),
      id: 'TEST0000002',
    });
  });

  it('should upsert ten fiscal codes', async () => {
    const fiscalCodes = [
      'TEST0000001',
      'TEST0000002',
      'TEST0000003',
      'TEST0000004',
      'TEST0000005',
      'TEST0000006',
      'TEST0000007',
      'TEST0000008',
      'TEST0000009',
      'TEST0000010',
    ];

    const cosmosClientMock = {
      database: vi.fn().mockReturnValue({
        container: vi.fn().mockReturnValue({
          items: {
            upsert: vi.fn(),
          },
        }),
      }),
    };

    await insertFiscalCodes(
      cosmosClientMock as unknown as CosmosClient,
      fiscalCodes,
    );

    expect(cosmosClientMock.database).toHaveBeenCalledTimes(1);
    expect(cosmosClientMock.database().container).toHaveBeenCalledTimes(1);
    expect(
      cosmosClientMock.database().container().items.upsert,
    ).toHaveBeenCalledTimes(10);

    expect(
      cosmosClientMock.database().container().items.upsert,
    ).toHaveBeenCalledWith({
      createdAt: expect.any(Date),
      id: 'TEST0000001',
    });
    expect(
      cosmosClientMock.database().container().items.upsert,
    ).toHaveBeenCalledWith({
      createdAt: expect.any(Date),
      id: 'TEST0000010',
    });
  });

  it('should happen an error, cosmosClient.database() throws an error', async () => {
    const fiscalCodes = ['TEST0000001'];

    const cosmosClientMock = {
      database: vi.fn().mockRejectedValue({}),
    };

    await insertFiscalCodes(
      cosmosClientMock as unknown as CosmosClient,
      fiscalCodes,
    );

    expect(cosmosClientMock.database).toHaveBeenCalledTimes(1);
  });

  it('should happen an error, cosmosClient.database().container() throws an error', async () => {
    const fiscalCodes = ['TEST0000001'];

    const cosmosClientMock = {
      database: vi.fn().mockReturnValue({
        container: vi.fn().mockImplementation(() => {
          throw new Error('container error');
        }),
      }),
    };

    await insertFiscalCodes(
      cosmosClientMock as unknown as CosmosClient,
      fiscalCodes,
    );

    expect(cosmosClientMock.database().container).toHaveBeenCalledTimes(1);
  });

  it('should happen an error, cosmosClient.database().container().upsert() throws an error', async () => {
    const fiscalCodes = ['TEST0000001'];

    const cosmosClientMock = {
      database: vi.fn().mockReturnValue({
        container: vi.fn().mockReturnValue({
          items: {
            upsert: vi.fn().mockRejectedValue({}),
          },
        }),
      }),
    };

    await insertFiscalCodes(
      cosmosClientMock as unknown as CosmosClient,
      fiscalCodes,
    );

    expect(cosmosClientMock.database().container).toHaveBeenCalledTimes(1);
    expect(
      cosmosClientMock.database().container().items.upsert,
    ).toHaveBeenCalledTimes(1);
  });
});
