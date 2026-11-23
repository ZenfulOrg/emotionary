import { matchesDeletePhrase } from '@/account/deletePhrase';

describe('matchesDeletePhrase', () => {
  it('accepts the phrase with any capitals or extra spaces', () => {
    expect(matchesDeletePhrase('delete my account')).toBe(true);
    expect(matchesDeletePhrase('  Delete My  Account ')).toBe(true);
  });
  it('rejects anything else', () => {
    expect(matchesDeletePhrase('')).toBe(false);
    expect(matchesDeletePhrase('delete')).toBe(false);
    expect(matchesDeletePhrase('delete my acount')).toBe(false);
    expect(matchesDeletePhrase('delete my account now')).toBe(false);
  });
});
