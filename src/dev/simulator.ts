import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * True only in the iOS Simulator or an Android emulator. Real phones
 * (including every App Store and Play Store install) report `isDevice`,
 * so anything gated on this never reaches customers.
 */
export const isSimulator = Platform.OS !== 'web' && Device.isDevice === false;
