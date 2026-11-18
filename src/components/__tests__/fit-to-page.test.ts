import { fitScale } from '@/components/FitToPage';

/**
 * 1.8.0 beta: the Today page's bottom ("10 free words below") and the
 * paywall's Buy button were cut off on phones with large display or font
 * sizes. Pages that don't fit are scaled down to fit, never clipped.
 */
describe('fitScale', () => {
  test('a page that fits is left alone', () => {
    expect(fitScale(800, 640)).toBe(1);
    expect(fitScale(800, 800)).toBe(1);
    expect(fitScale(800, 801)).toBe(1); // a rounding pixel is not worth shrinking
  });

  test('a page taller than its space shrinks to exactly fit', () => {
    // Measured on an Android 16 emulator at a large display size.
    expect(fitScale(596, 785) * 785).toBeCloseTo(596);
    expect(fitScale(596, 785)).toBeLessThan(1);
  });

  test('nothing is scaled before the page is measured', () => {
    expect(fitScale(0, 900)).toBe(1);
  });
});
