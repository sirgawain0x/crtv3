import { describe, expect, it } from 'vitest';
import { parsePaymentProofHeader } from './verifyUsdcPayment';
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
describe('payment proof input bounds', () => {
  it.each([null, {}, { transactionHash: {}, amount: '1' }, { transactionHash: '0x123', amount: '1' }, { transactionHash: '0x' + 'a'.repeat(64), amount: '-1' }])('rejects malformed proof without any RPC', (value) => {
    expect(parsePaymentProofHeader(encode(value))).toBeNull();
  });
  it('rejects oversized headers', () => expect(parsePaymentProofHeader('a'.repeat(2049))).toBeNull());
  it('accepts a bounded Base transaction proof', () => {
    const proof = { transactionHash: '0x' + 'a'.repeat(64), amount: '10000' };
    expect(parsePaymentProofHeader(encode(proof))).toEqual(proof);
  });
});
