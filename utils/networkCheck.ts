// utils/networkCheck.ts — add this small utility
import NetInfo from '@react-native-community/netinfo';

export async function hasNetworkConnectivity(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return !!(state.isConnected && state.isInternetReachable);
  } catch {
    // If NetInfo isn't installed, assume connected and let STT report its own error
    return true;
  }
}