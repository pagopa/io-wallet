import { vi, describe, it, expect } from 'vitest';
import { parseFiscalCodes } from './parse-fiscal-codes';

vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

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
