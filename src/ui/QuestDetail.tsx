import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TextInput,
  Image,
  Linking,
  Pressable,
} from "react-native";
import { Quest } from "../game/types";
import LocationPicker from "./LocationPicker";
import { questWithLocation, saveLocation } from "../game/location";
import { acceptQuest, completeQuest, mapsUrl, statusOf } from "../game/engine";
import { checkIn, pickPhoto, removePhoto } from "../services/evidence";
import { useGame } from "../store/GameProvider";
import { Button, categoryColors, categoryIcons, Icon } from "./components";
import { colors, s } from "./theme";

export async function openLink(url: string, notify: (message: string) => void) {
  try {
    await Linking.openURL(url);
  } catch {
    notify(
      "Could not open the link. Check that a browser or Maps app is available.",
    );
  }
}
export default function QuestDetail({
  quest: originalQuest,
  onClose,
}: {
  quest: Quest;
  onClose: () => void;
}) {
  const { state, run, notify, origin, now } = useGame();
  const completed = state.journal.find((j) => j.id === originalQuest.id);
  const quest = questWithLocation(
    completed?.quest || state.accepted[originalQuest.id] || originalQuest,
    state,
  );
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false),
    [photo, setPhoto] = useState<string>(),
    [place, setPlace] = useState(""),
    [gps, setGps] = useState(false),
    [error, setError] = useState("");
  const temporary = useRef<string | undefined>(undefined),
    retained = useRef(false);
  useEffect(
    () => () => {
      if (!retained.current)
        void removePhoto(temporary.current).catch(() => {});
    },
    [],
  );
  const status = statusOf(state, quest.id);
  async function perform(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function attach(camera: boolean) {
    const uri = await pickPhoto(camera);
    if (uri) {
      await removePhoto(temporary.current);
      temporary.current = uri;
      setPhoto(uri);
      setGps(false);
    }
  }
  const future = quest.start && Date.parse(quest.start) > now.getTime();
  return (
    <Modal
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      {picking && (
        <LocationPicker
          initial={state.questLocations?.[quest.id]}
          center={origin}
          city={quest.city}
          query={quest.search || ""}
          onClose={() => setPicking(false)}
          onConfirm={(location) =>
            run((s) => saveLocation(s, location, quest.id))
          }
        />
      )}
      <View
        style={{
          flex: 1,
          backgroundColor: "#050710dd",
          justifyContent: "center",
          alignItems: "center",
          padding: 18,
        }}
      >
        <View
          style={[
            s.card,
            {
              width: "100%",
              maxWidth: 620,
              maxHeight: "94%",
              padding: 0,
              overflow: "hidden",
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={{ padding: 24, gap: 18 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.between}>
              <View style={s.row}>
                <Icon
                  name={categoryIcons[quest.category]}
                  color={categoryColors[quest.category]}
                />
                <Text style={s.eyebrow}>{quest.category.toUpperCase()}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close quest"
                disabled={busy}
                onPress={onClose}
                style={{ padding: 8 }}
              >
                <Icon name="close" />
              </Pressable>
            </View>
            <Text style={s.h1}>{quest.title}</Text>
            <View style={s.wrap}>
              <Text style={[s.pill, { color: colors.amber }]}>
                +{quest.xp} XP
              </Text>
              <Text style={[s.pill, s.small]}>{quest.difficulty}</Text>
              <Text style={[s.pill, s.small]}>
                {quest.minutes
                  ? `${quest.minutes} minutes`
                  : "Duration unknown"}
              </Text>
              <Text style={[s.pill, s.small]}>
                {quest.cost === 0
                  ? "Free"
                  : quest.cost === null
                    ? "Price not provided"
                    : `$${quest.cost}`}
              </Text>
            </View>
            <Text style={s.text}>{quest.description}</Text>
            {quest.start && (
              <View
                style={[s.card, { backgroundColor: colors.bg, padding: 16 }]}
              >
                <Text style={s.h3}>On the calendar</Text>
                <Text style={s.muted}>
                  {new Date(quest.start).toLocaleString([], {
                    dateStyle: "full",
                    timeStyle: "short",
                  })}
                  {quest.end
                    ? `\nUntil ${new Date(quest.end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZoneName: "short" })}`
                    : "\nEnd time not provided"}
                </Text>
                <Text style={s.small}>
                  Times shown in your device’s timezone. Confirm audience,
                  registration, availability and cancellations with the
                  organizer.
                </Text>
              </View>
            )}
            {quest.location && <Text style={s.muted}>📍 {quest.location}</Text>}
            <View style={s.wrap}>
              {(quest.search || quest.location || quest.coordinates) && (
                <Button
                  secondary
                  title={
                    quest.location || quest.coordinates
                      ? "Get Directions"
                      : "Choose a place"
                  }
                  icon="map-outline"
                  onPress={() =>
                    quest.location || quest.coordinates
                      ? openLink(mapsUrl(quest, origin), notify)
                      : setPicking(true)
                  }
                />
              )}
              {state.questLocations?.[quest.id] && status !== "completed" && (
                <Button
                  secondary
                  title="Change destination"
                  onPress={() => setPicking(true)}
                />
              )}
              {quest.sourceUrl && (
                <Button
                  secondary
                  title={quest.kind === "event" ? "View Event" : "View place"}
                  icon="open-outline"
                  onPress={() => openLink(quest.sourceUrl!, notify)}
                />
              )}
            </View>
            {status === "completed" ? (
              <View style={[s.card, { borderColor: "#33584e" }]}>
                <Text style={[s.h3, { color: colors.green }]}>
                  Adventure complete
                </Text>
                <Text style={s.muted}>
                  {completed?.verification} · +{completed?.xp} XP{"\n"}Saved to
                  your Adventure Journal.
                </Text>
              </View>
            ) : status === "available" ? (
              <Button
                title="Accept Quest"
                disabled={busy}
                icon="add-circle-outline"
                onPress={() =>
                  perform(async () => {
                    const ok = await run((s) => acceptQuest(s, quest));
                    if (ok) notify("Quest accepted. Your adventure is ready.");
                  })
                }
              />
            ) : (
              <>
                <View style={s.divider} />
                <Text style={s.h2}>Make it a memory</Text>
                <Text style={s.muted}>
                  Complete this after your activity. Choose optional evidence,
                  or simply tell us you did it.
                </Text>
                {!quest.location && (
                  <>
                    <Text style={s.small}>PLACE VISITED (OPTIONAL)</Text>
                    <TextInput
                      accessibilityLabel="Place visited"
                      placeholder="e.g. Zilker Park"
                      placeholderTextColor={colors.muted}
                      value={place}
                      onChangeText={setPlace}
                      maxLength={100}
                      style={s.input}
                    />
                  </>
                )}
                <View style={s.wrap}>
                  <Button
                    title="Choose photo"
                    secondary
                    icon="image-outline"
                    disabled={busy}
                    onPress={() => perform(() => attach(false))}
                  />
                  <Button
                    title="Take photo"
                    secondary
                    icon="camera-outline"
                    disabled={busy}
                    onPress={() => perform(() => attach(true))}
                  />
                </View>
                {photo && (
                  <>
                    <Image
                      accessibilityLabel="Your adventure photo"
                      source={{ uri: photo }}
                      style={{ width: "100%", height: 180, borderRadius: 14 }}
                    />
                    <Button
                      title="Remove attached photo"
                      secondary
                      onPress={() =>
                        perform(async () => {
                          await removePhoto(photo);
                          temporary.current = undefined;
                          setPhoto(undefined);
                        })
                      }
                    />
                  </>
                )}
                {quest.coordinates &&
                  quest.completionMethods.includes(
                    "GPS proximity-confirmed",
                  ) && (
                    <>
                      <Button
                        title={
                          gps
                            ? "Proximity confirmed"
                            : "GPS check-in · within 150 m"
                        }
                        secondary
                        icon="locate-outline"
                        disabled={busy || gps}
                        onPress={() =>
                          perform(async () => {
                            await checkIn(quest.coordinates!);
                            setGps(true);
                          })
                        }
                      />
                      <Text style={s.small}>
                        Checks location once. Requires accuracy within 100 m and
                        the full accuracy radius inside 150 m. Confirms
                        proximity, not participation. Coordinates are not saved.
                      </Text>
                    </>
                  )}
                <Text style={s.small}>
                  Completion:{" "}
                  {gps
                    ? "GPS proximity-confirmed"
                    : photo
                      ? "Photo-submitted (not independently verified)"
                      : "Self-reported"}
                  . Photos stay on this device and can be removed from your
                  journal.
                </Text>
                {!!future && (
                  <Text style={{ color: colors.amber }}>
                    You can complete this quest once the event starts.
                  </Text>
                )}
                <Button
                  title={busy ? "Saving…" : `Complete Quest · +${quest.xp} XP`}
                  icon="checkmark-circle-outline"
                  disabled={busy || !!future}
                  onPress={() =>
                    perform(async () => {
                      const ok = await run((s) =>
                        completeQuest(
                          s,
                          quest.id,
                          gps
                            ? "GPS proximity-confirmed"
                            : photo
                              ? "Photo-submitted"
                              : "Self-reported",
                          { photo, place, gpsConfirmed: gps },
                        ),
                      );
                      if (ok) {
                        retained.current = true;
                        onClose();
                      }
                    })
                  }
                />
              </>
            )}
            {!!error && (
              <Text
                accessibilityRole="alert"
                style={{ color: "#ffb4bd", lineHeight: 22 }}
              >
                {error}
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
