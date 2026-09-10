import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Lecture/ecriture defensive dans le stockage persistant du device.
 * Ne doit jamais faire planter l'appelant : une erreur de stockage
 * (quota, mode prive, etc.) degrade silencieusement vers "non persiste".
 */
export async function readPersistedValue(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function writePersistedValue(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // Persistance best-effort : l'etat en memoire reste correct.
  }
}
