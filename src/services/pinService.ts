import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'rootly_parent_pin';

export const pinService = {
  async set(pin: string): Promise<void> {
    await SecureStore.setItemAsync(PIN_KEY, pin);
  },

  async get(): Promise<string | null> {
    return SecureStore.getItemAsync(PIN_KEY);
  },

  async has(): Promise<boolean> {
    return (await SecureStore.getItemAsync(PIN_KEY)) !== null;
  },

  async verify(input: string): Promise<boolean> {
    const stored = await SecureStore.getItemAsync(PIN_KEY);
    return stored !== null && stored === input;
  },
};
