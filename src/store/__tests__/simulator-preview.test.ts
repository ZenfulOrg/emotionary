jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('simulator Pro preview', () => {
  afterEach(() => jest.resetModules());

  function load(isDevice: boolean) {
    jest.doMock('expo-device', () => ({ isDevice }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@/store/userStore') as typeof import('@/store/userStore')).useUserStore;
  }

  it('unlocks the app in a simulator', () => {
    const store = load(false);
    store.getState().setSimulatorProPreview(true);
    expect(store.getState().accessLevel).toBe('full');
    store.getState().setStoreAccess(false);
    expect(store.getState().accessLevel).toBe('full');
    store.getState().setSimulatorProPreview(false);
    expect(store.getState().accessLevel).toBe('free');
  });

  it('does nothing on a real phone', () => {
    const store = load(true);
    store.getState().setSimulatorProPreview(true);
    expect(store.getState().accessLevel).toBe('free');
    store.getState().setStoreAccess(true);
    expect(store.getState().accessLevel).toBe('full');
  });
});
