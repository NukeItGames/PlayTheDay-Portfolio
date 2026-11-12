import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Coordinates, SelectedLocation } from "../game/types";
import { cityCenter, coordinateLabel } from "../game/location";
import { currentLocation } from "../services/evidence";
import { reverseLocation, searchLocations } from "../services/geocoding";
import LocationMap from "./LocationMap";
import { Button, Icon } from "./components";
import { colors, s } from "./theme";

export default function LocationPicker({
  initial,
  center,
  city,
  query = "",
  onConfirm,
  onClose,
}: {
  initial?: SelectedLocation;
  center?: Coordinates;
  city: string;
  query?: string;
  onConfirm: (location: SelectedLocation) => Promise<boolean>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(initial);
  const [search, setSearch] = useState(query);
  const [results, setResults] = useState<SelectedLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [mapError, setMapError] = useState("");
  const [mapKey, setMapKey] = useState(0);
  const [start] = useState(initial || center || cityCenter(city));
  const lookup = useRef<AbortController | null>(null);
  const searchRequest = useRef<AbortController | null>(null);
  const revision = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      lookup.current?.abort();
      searchRequest.current?.abort();
    };
  }, []);

  function choose(place: SelectedLocation) {
    revision.current++;
    lookup.current?.abort();
    searchRequest.current?.abort();
    setSearching(false);
    setLocating(false);
    setResolving(false);
    setSelected(place);
    setResults([]);
    setError("");
    Keyboard.dismiss();
  }
  async function choosePoint(point: Coordinates) {
    choose({
      latitude: point.latitude,
      longitude: point.longitude,
      name: "Dropped pin",
    });
    const id = revision.current;
    const controller = new AbortController();
    lookup.current = controller;
    setResolving(true);
    try {
      const place = await reverseLocation(point, controller.signal);
      if (mounted.current && id === revision.current) {
        if (place) setSelected(place);
        else
          setError(
            "No address found. You can still confirm these coordinates.",
          );
      }
    } catch {
      if (mounted.current && id === revision.current)
        setError(
          "Address unavailable. You can still confirm these coordinates.",
        );
    } finally {
      if (mounted.current && id === revision.current) setResolving(false);
    }
  }
  async function find() {
    Keyboard.dismiss();
    searchRequest.current?.abort();
    const controller = new AbortController();
    searchRequest.current = controller;
    setSearching(true);
    setResults([]);
    setError("");
    try {
      const found = await searchLocations(
        search,
        controller.signal,
        selected || start,
      );
      if (!controller.signal.aborted && mounted.current) {
        setResults(found);
        if (!found.length)
          setError(
            "No places found. Try a city or a more specific address, or tap the map.",
          );
      }
    } catch {
      if (!controller.signal.aborted && mounted.current)
        setError(
          "Search unavailable. Check your connection and try again, or tap the map.",
        );
    } finally {
      if (!controller.signal.aborted && mounted.current) setSearching(false);
    }
  }
  async function locate() {
    const id = ++revision.current;
    lookup.current?.abort();
    setResolving(false);
    setLocating(true);
    setError("");
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const point = await Promise.race([
        currentLocation(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () =>
              reject(
                new Error(
                  "Location timed out. Try again or select a place manually.",
                ),
              ),
            20000,
          );
        }),
      ]);
      if (mounted.current && id === revision.current) await choosePoint(point);
    } catch (e) {
      if (mounted.current && id === revision.current)
        setError(
          `${(e as Error).message} You can search or tap the map without GPS.`,
        );
    } finally {
      clearTimeout(timeout);
      if (mounted.current && id === revision.current) setLocating(false);
    }
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        if (!saving) onClose();
      }}
    >
      <SafeAreaView style={s.screen}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={{ padding: 16, gap: 10 }}>
            <View style={s.between}>
              <Text style={s.h2}>Choose location</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel location selection"
                disabled={saving}
                onPress={onClose}
                style={{ padding: 10 }}
              >
                <Icon name="close" />
              </Pressable>
            </View>
            <View style={s.row}>
              <TextInput
                accessibilityLabel="Search city, address, or place"
                placeholder="City, address, or place"
                placeholderTextColor={colors.muted}
                value={search}
                onChangeText={(text) => {
                  searchRequest.current?.abort();
                  setSearching(false);
                  setResults([]);
                  setSearch(text);
                }}
                maxLength={200}
                returnKeyType="search"
                onSubmitEditing={() => {
                  if (search.trim() && !saving) void find();
                }}
                style={[s.input, { flex: 1 }]}
              />
              <Button
                title={searching ? "Searching…" : "Search"}
                disabled={!search.trim() || searching || saving}
                onPress={find}
              />
            </View>
            <Button
              title={locating ? "Finding location…" : "Use My Current Location"}
              secondary
              icon="locate-outline"
              disabled={locating || saving}
              onPress={locate}
            />
            <Text style={s.small}>Search or tap the map. GPS is optional.</Text>
          </View>
          {!!results.length && (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 170, flexGrow: 0 }}
            >
              {results.map((place, i) => (
                <Pressable
                  key={`${place.latitude}:${place.longitude}:${i}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${place.name}`}
                  onPress={() => choose(place)}
                  disabled={saving}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={s.text}>{place.name}</Text>
                  <Text style={s.small} numberOfLines={2}>
                    {place.address}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          <View
            style={{ flex: 1, minHeight: 120 }}
            pointerEvents={saving ? "none" : "auto"}
          >
            <LocationMap
              key={mapKey}
              center={start}
              selected={selected}
              onSelect={choosePoint}
              onError={setMapError}
            />
          </View>
          <View style={{ padding: 16, gap: 8 }}>
            {!!mapError && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry map"
                onPress={() => {
                  setMapError("");
                  setMapKey((n) => n + 1);
                }}
              >
                <Text style={s.small}>{mapError} Tap to retry.</Text>
              </Pressable>
            )}
            <Text style={s.h3}>{selected?.name || "Select a location"}</Text>
            {selected?.address && (
              <Text style={s.small} numberOfLines={2}>
                {selected.address}
              </Text>
            )}
            {selected && (
              <Text style={s.small}>
                {coordinateLabel(selected)}
                {resolving ? " · Finding address…" : ""}
              </Text>
            )}
            {!!error && (
              <Text
                accessibilityRole="alert"
                style={[s.small, { color: colors.amber }]}
              >
                {error}
              </Text>
            )}
            <Button
              title={saving ? "Saving…" : "Confirm Location"}
              disabled={!selected || saving || locating}
              onPress={async () => {
                if (!selected) return;
                revision.current++;
                lookup.current?.abort();
                setResolving(false);
                setSaving(true);
                try {
                  if (await onConfirm(selected)) onClose();
                  else
                    setError("Could not save your location. Please try again.");
                } catch {
                  setError("Could not save your location. Please try again.");
                } finally {
                  if (mounted.current) setSaving(false);
                }
              }}
            />
            <Text style={[s.small, { fontSize: 10 }]}>
              Map & search © OpenStreetMap contributors. Searches and map areas
              are sent to OpenStreetMap; GPS only when requested.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
