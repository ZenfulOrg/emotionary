import { wordTitleSize } from '@/components/word-title-size';

describe('wordTitleSize', () => {
  test('keeps short words at the intended hero size', () => {
    expect(wordTitleSize('Acedia')).toBe(56);
  });

  test('shrinks long words deterministically without relying on native auto-fit', () => {
    expect(wordTitleSize('Torschlusspanik')).toBe(39);
    expect(wordTitleSize('Waldeinsamkeit')).toBe(45);
  });
});
