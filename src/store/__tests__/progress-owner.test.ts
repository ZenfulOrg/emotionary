import { useUserStore } from '@/store/userStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('progress belongs to one account', () => {
  beforeEach(() => {
    useUserStore.setState({
      progressOwner: null,
      readSlugs: ['meraki', 'hygge'],
      favorites: ['meraki'],
      sharedCount: 2,
      streakState: { lastOpenDate: '2026-11-16', streak: 4 },
    });
  });

  it('the first account keeps what was done before signing in', () => {
    useUserStore.getState().claimProgress('user-a');
    const state = useUserStore.getState();
    expect(state.progressOwner).toBe('user-a');
    expect(state.readSlugs).toEqual(['meraki', 'hygge']);
    expect(state.streakState.streak).toBe(4);
  });

  it('signing back in to the same account keeps its stats', () => {
    useUserStore.getState().claimProgress('user-a');
    useUserStore.getState().claimProgress('user-a');
    expect(useUserStore.getState().readSlugs).toHaveLength(2);
  });

  it('a different account starts fresh', () => {
    useUserStore.getState().claimProgress('user-a');
    useUserStore.getState().claimProgress('user-b');
    const state = useUserStore.getState();
    expect(state.progressOwner).toBe('user-b');
    expect(state.readSlugs).toEqual([]);
    expect(state.favorites).toEqual([]);
    expect(state.sharedCount).toBe(0);
    expect(state.streakState).toEqual({ lastOpenDate: null, streak: 0 });
  });
});
