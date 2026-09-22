import { asEntry, displayWord } from '@/content/presentation';

describe('brand presentation', () => {
  test('sets the word lowercase', () => {
    expect(displayWord('Meraki')).toBe('meraki');
  });

  test('sets definitions lowercase, ending in a period', () => {
    expect(asEntry('The warmth of the sun in winter')).toBe('the warmth of the sun in winter.');
    expect(asEntry('A tender longing.')).toBe('a tender longing.');
  });

  test('leaves acronyms and the pronoun I alone', () => {
    expect(asEntry('ASMR, a tingling calm.')).toBe('ASMR, a tingling calm.');
    expect(asEntry('I am here')).toBe('I am here.');
  });
});
