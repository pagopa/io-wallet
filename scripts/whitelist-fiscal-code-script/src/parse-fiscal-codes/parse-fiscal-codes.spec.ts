import { describe, expect, it, vi } from 'vitest';

import { parseFiscalCodes } from './parse-fiscal-codes';

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

describe('parseFiscalCode', () => {
  it('should correctly parse a valid fiscal code', async () => {
    const fiscalCodes = await parseFiscalCodes('./fiscalcodes.csv.example');

    expect(fiscalCodes).toBeDefined();
    expect(fiscalCodes.length).toStrictEqual(5);
    expect(fiscalCodes).toMatchObject([
      'TEST0000001',
      'TEST0000002',
      'TEST0000003',
      'TEST0000004',
      'TEST0000005',
    ]);
  });

  it('should throw an error, wrong fiscalcodes.csv path', async () => {
    try {
      await parseFiscalCodes('../../wrong/path.csv');
    } catch (error) {
      expect(error).toBeDefined();
      return;
    }

    expect(true).toStrictEqual(false);
  });
});
