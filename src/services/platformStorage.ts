import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { StorageAdapter, STORAGE_KEY } from "./storage";

export const platformStorage: StorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
};
if (
  Platform.OS === "web" &&
  typeof navigator !== "undefined" &&
  navigator.locks
) {
  // Serialize updates across tabs, then read the latest snapshot inside the lock.
  platformStorage.withLock = (task) =>
    navigator.locks.request(STORAGE_KEY, task);
}
