import { expect, it } from 'vitest';
import { meTokenSupplyToHuman, toFiniteNumber, priceFromTvl } from './units';
it('uses established wei-string and legacy decimal conventions', () => { expect(meTokenSupplyToHuman('8157198948020651867')).toBeCloseTo(8.157198948); expect(meTokenSupplyToHuman('8.157')).toBeCloseTo(8.157); expect(meTokenSupplyToHuman('1')).toBe(1e-18); });
it('preserves fractional trades and rejects non-finite inputs', () => { expect(toFiniteNumber('0.069026')).toBe(0.069026); expect(toFiniteNumber('Infinity')).toBe(0); expect(toFiniteNumber('bad')).toBe(0); });
it('values vault collateral per whole token', () => { expect(priceFromTvl(37.270001, 8.157198948)).toBeCloseTo(4.568970456); });
