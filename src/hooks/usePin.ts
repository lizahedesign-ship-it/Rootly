import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'rootly_parent_pin';

export function usePin() {
  async function savePin(pin: string): Promise<void> {
    await SecureStore.setItemAsync(PIN_KEY, pin);
  }

  async function hasPin(): Promise<boolean> {
    const stored = await SecureStore.getItemAsync(PIN_KEY);
    return stored !== null && stored.length === 4;
  }

  async function verifyPin(pin: string): Promise<boolean> {
    const stored = await SecureStore.getItemAsync(PIN_KEY);
    return stored === pin;
  }

  return { savePin, hasPin, verifyPin };
}
