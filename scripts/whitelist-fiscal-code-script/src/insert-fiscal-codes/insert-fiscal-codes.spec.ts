import { CosmosClient } from '@azure/cosmos';
import { vi, describe, it, expect } from 'vitest';
import { insertFiscalCodes } from './insert-fiscal-codes';

vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

process.env.SLEEP_TIME_BETWEEN_REQUESTS_MS = '0';

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
      id: 'TEST0000001',
      createdAt: expect.any(Date),
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
      id: 'TEST0000001',
      createdAt: expect.any(Date),
    });
    expect(
      cosmosClientMock.database().container().items.upsert,
    ).toHaveBeenCalledWith({
      id: 'TEST0000002',
      createdAt: expect.any(Date),
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
      id: 'TEST0000001',
      createdAt: expect.any(Date),
    });
    expect(
      cosmosClientMock.database().container().items.upsert,
    ).toHaveBeenCalledWith({
      id: 'TEST0000010',
      createdAt: expect.any(Date),
    });
  });

  it('should throw an error, cosmosClient.database() throws an error', async () => {
    const fiscalCodes = ['TEST0000001'];

    const cosmosClientMock = {
      database: vi.fn().mockRejectedValue({}),
    };

    try {
      await insertFiscalCodes(
        cosmosClientMock as unknown as CosmosClient,
        fiscalCodes,
      );
    } catch (error) {
      expect(error).toBeDefined();
      expect(cosmosClientMock.database).toHaveBeenCalledTimes(1);
      return;
    }

    expect(true).toStrictEqual(false);
  });

  it('should throw an error, cosmosClient.database().container() throws an error', async () => {
    const fiscalCodes = ['TEST0000001'];

    const cosmosClientMock = {
      database: vi.fn().mockReturnValue({
        container: vi.fn().mockImplementation(() => {
          throw new Error('container error');
        }),
      }),
    };

    try {
      await insertFiscalCodes(
        cosmosClientMock as unknown as CosmosClient,
        fiscalCodes,
      );
    } catch (error) {
      expect(error).toBeDefined();
      expect(cosmosClientMock.database).toHaveBeenCalledTimes(1);
      expect(cosmosClientMock.database().container).toHaveBeenCalledTimes(1);
      return;
    }

    expect(true).toStrictEqual(false);
  });

  it('should throw an error, cosmosClient.database().container().upsert() throws an error', async () => {
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

    try {
      await insertFiscalCodes(
        cosmosClientMock as unknown as CosmosClient,
        fiscalCodes,
      );
    } catch (error) {
      expect(error).toBeDefined();
      expect(cosmosClientMock.database).toHaveBeenCalledTimes(1);
      expect(cosmosClientMock.database().container).toHaveBeenCalledTimes(1);
      expect(
        cosmosClientMock.database().container().items.upsert,
      ).toHaveBeenCalledTimes(1);
      return;
    }

    expect(true).toStrictEqual(false);
  });
});
