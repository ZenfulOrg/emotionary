import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

describe('push server shared code', () => {
  it('matches the app (run node scripts/sync-push-shared.mjs after editing)', () => {
    const script = join(__dirname, '../../../scripts/sync-push-shared.mjs');
    expect(() => execFileSync(process.execPath, [script, '--check'], { stdio: 'pipe' })).not.toThrow();
  });
});
