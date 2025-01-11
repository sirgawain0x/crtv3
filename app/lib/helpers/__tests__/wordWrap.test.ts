import { wordWrap } from '../helpers';

describe('wordWrap', () => {
  let txt = '';
  beforeEach(() => {
    txt = 'The function wrap a sentence at particular length of characters';
  });
  afterEach(() => (txt = ''));

  it('should throw error if text length is shorter', () => {
    expect(() => wordWrap(txt, 102)).toThrow(
      `String lenght of ${txt.length} is shorter than wrapAfter of 102`,
    );
  });

  it('should return a substring of text', () => {
    const res = wordWrap(txt, 12);
    expect(res).toBe('The function...');
  });
});
