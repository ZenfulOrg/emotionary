import { placeholderText, splitLead } from '@/content/locked-text';

describe('splitLead', () => {
  it('shows about a third of the words, at least three', () => {
    const { lead, rest } = splitLead('a great spiritual ache, a longing with nothing to long for');
    expect(lead).toEqual(['a', 'great', 'spiritual', 'ache']);
    expect(rest).toBe('a longing with nothing to long for');
  });

  it('never shows more than six words', () => {
    const words = Array.from({ length: 30 }, (_, i) => `w${i}`).join(' ');
    expect(splitLead(words).lead).toHaveLength(6);
  });

  it('always keeps at least two words hidden', () => {
    const { lead, rest } = splitLead('one two three four five');
    expect(lead).toEqual(['one', 'two', 'three']);
    expect(rest.split(' ')).toHaveLength(2);
  });

  it('hides very short meanings entirely', () => {
    expect(splitLead('quiet joy')).toEqual({ lead: [], rest: 'quiet joy' });
  });

  it('never renders the hidden words themselves', () => {
    const { rest } = splitLead('a great spiritual ache, a longing with nothing to long for');
    expect(placeholderText(rest)).not.toContain('longing');
  });
});
