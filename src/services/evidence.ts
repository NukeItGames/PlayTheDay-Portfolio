import { Platform } from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { File, Paths, Directory } from "expo-file-system";
import { Coordinates } from "../game/types";
import { proximity } from "../game/engine";

export async function currentLocation(): Promise<
  Coordinates & { accuracy: number | null }
> {
  if (Platform.OS === "web") {
    if (!navigator.geolocation)
      throw new Error(
        "Location is unavailable in this browser. Use city searches or self-reported completion.",
      );
    return new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }),
        (error) =>
          reject(
            new Error(
              error.code === 1
                ? "Location permission was declined. City searches and self-reported completion still work."
                : "Could not get a fresh location. Try again outdoors or use self-reported completion.",
            ),
          ),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
      ),
    );
  }
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "Location permission was declined. City searches and self-reported completion still work.",
    );
  const result = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return result.coords;
}
export async function checkIn(destination: Coordinates) {
  const current = await currentLocation();
  const result = proximity(current, destination, current.accuracy);
  if (!result.confirmed)
    throw new Error(
      `Check-in not confirmed (${Math.round(result.meters)} m away; accuracy ±${Math.round(current.accuracy ?? 999)} m). Move closer or use self-reported completion.`,
    );
  // Coordinates remain in memory only and are never persisted or sent to a server.
  return true;
}
export async function pickPhoto(camera: boolean): Promise<string | undefined> {
  const permission = camera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "Photo permission was declined. You can still complete your quest without a photo.",
    );
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 0.55,
    base64: Platform.OS === "web",
    allowsEditing: false,
    exif: false,
  };
  const result = camera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return undefined;
  const asset = result.assets[0];
  if (Platform.OS === "web") {
    if (!asset.base64 || asset.base64.length > 1800000)
      throw new Error(
        "Choose a photo under about 1 MB for browser storage. Larger photos work in the native app.",
      );
    return `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`;
  }
  const folder = new Directory(Paths.document, "adventure-evidence");
  folder.create({ idempotent: true, intermediates: true });
  const extension = asset.uri.split(".").pop()?.split("?")[0] || "jpg";
  const destination = new File(
    folder,
    `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`,
  );
  new File(asset.uri).copy(destination);
  return destination.uri;
}
export async function removePhoto(uri?: string) {
  if (uri && Platform.OS !== "web" && uri.startsWith(Paths.document.uri)) {
    const file = new File(uri);
    if (file.exists) file.delete();
  }
}
