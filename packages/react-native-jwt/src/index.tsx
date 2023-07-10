import Crypto from 'react-native-quick-crypto';

export function createHash(input: string): Promise<string> {
  const hashed = Crypto.createHash('sha256').update(input).digest('hex');

  return Promise.resolve(hashed);
}
