/* global jest */
// Native storage isn't available under Jest; components that track events
// reach it through the user store and the install id.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
