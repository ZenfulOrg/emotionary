import { wordTitleSize } from '@/components/word-title-size';

describe('wordTitleSize', () => {
  test('keeps short words at the intended hero size', () => {
    expect(wordTitleSize('Acedia')).toBe(84);
  });

  test('shrinks long words deterministically without relying on native auto-fit', () => {
    expect(wordTitleSize('Torschlusspanik')).toBe(44);
    expect(wordTitleSize('Waldeinsamkeit')).toBe(52);
  });
});

describe('wordTitleSize width cap', () => {
  it('shrinks a word that would overflow the available width', () => {
    expect(wordTitleSize('Torschlusspanik', 280)).toBeLessThan(44);
    expect(wordTitleSize('Duende', 327)).toBe(84);
  });
});
