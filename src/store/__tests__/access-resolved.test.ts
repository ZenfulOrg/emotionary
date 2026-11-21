import { useUserStore, whenAccessResolved } from '@/store/userStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('whenAccessResolved', () => {
  beforeEach(() => useUserStore.setState({ accessResolved: false, accessLevel: 'free' }));

  it('waits for the purchase check, then sees the real access level', () => {
    const seen: string[] = [];
    whenAccessResolved(() => seen.push(useUserStore.getState().accessLevel));
    expect(seen).toEqual([]);
    useUserStore.setState({ accessLevel: 'full' });
    expect(seen).toEqual([]);
    useUserStore.setState({ accessResolved: true });
    expect(seen).toEqual(['full']);
    useUserStore.setState({ accessLevel: 'free' });
    expect(seen).toEqual(['full']);
  });

  it('runs straight away once access is known', () => {
    useUserStore.setState({ accessResolved: true });
    const run = jest.fn();
    whenAccessResolved(run);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('can be cancelled', () => {
    const run = jest.fn();
    const cancel = whenAccessResolved(run);
    cancel();
    useUserStore.setState({ accessResolved: true });
    expect(run).not.toHaveBeenCalled();
  });
});
