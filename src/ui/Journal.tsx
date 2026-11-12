import React, { useState } from "react";
import { View, Text, Pressable, Image, Modal, ScrollView } from "react-native";
import { useGame } from "../store/GameProvider";
import { removePhoto } from "../services/evidence";
import { levelInfo, rewards } from "../game/engine";
import { Button, categoryIcons, Empty, Icon } from "./components";
import { colors, s } from "./theme";

export default function Journal() {
  const { state, run, notify } = useGame();
  const [selected, setSelected] = useState<string>(),
    [busy, setBusy] = useState(false);
  const entry = state.journal.find((j) => j.id === selected),
    places = new Set(
      state.journal.map((j) => j.place?.toLowerCase()).filter(Boolean),
    ).size;
  return (
    <>
      <View style={s.wrap}>
        {[
          [state.journal.length, "adventures"],
          [places, "places explored"],
          [
            rewards.filter((r) => r.level <= levelInfo(state.xp).level).length,
            "achievements",
          ],
        ].map(([value, label]) => (
          <View key={label} style={[s.card, { flex: 1, minWidth: 100 }]}>
            <Text style={[s.h1, { color: colors.purple }]}>{value}</Text>
            <Text style={s.small}>{label}</Text>
          </View>
        ))}
      </View>
      {state.journal.length === 0 ? (
        <Empty
          title="Your story is just beginning"
          text="Complete your first quest to start a collection of days worth remembering."
          icon="book-outline"
        />
      ) : (
        state.journal.map((j) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Read ${j.quest.title}`}
            key={j.id}
            onPress={() => setSelected(j.id)}
            style={[s.card, { flexDirection: "row", alignItems: "center" }]}
          >
            {j.photo ? (
              <Image
                source={{ uri: j.photo }}
                style={{ width: 62, height: 62, borderRadius: 12 }}
              />
            ) : (
              <View
                style={{
                  padding: 16,
                  backgroundColor: colors.raised,
                  borderRadius: 12,
                }}
              >
                <Icon
                  name={categoryIcons[j.quest.category]}
                  color={colors.purple}
                  size={25}
                />
              </View>
            )}
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.h3}>{j.quest.title}</Text>
              <Text style={s.small}>
                {new Date(j.completedAt).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                · {j.verification}
              </Text>
              {j.place && <Text style={s.small}>{j.place}</Text>}
            </View>
            <Text style={{ color: colors.amber, fontWeight: "700" }}>
              +{j.xp}
            </Text>
          </Pressable>
        ))
      )}
      <Modal
        visible={!!entry}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(undefined)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#050710dd",
            padding: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {entry && (
            <View
              style={[
                s.card,
                { maxWidth: 620, maxHeight: "90%", width: "100%" },
              ]}
            >
              <ScrollView contentContainerStyle={{ gap: 18 }}>
                <Text style={s.eyebrow}>A PAGE IN YOUR ADVENTURE</Text>
                <Text style={s.h1}>{entry.quest.title}</Text>
                <Text style={s.muted}>
                  {new Date(entry.completedAt).toLocaleString()} ·{" "}
                  {entry.quest.category}
                </Text>
                <Text style={s.text}>{entry.quest.description}</Text>
                {entry.place && <Text style={s.muted}>📍 {entry.place}</Text>}
                <Text style={{ color: colors.amber }}>
                  +{entry.xp} XP earned
                </Text>
                <Text style={s.small}>
                  {entry.evidenceRemoved
                    ? "Evidence removed. Original completion method: "
                    : "Completion method: "}
                  {entry.verification}
                  {entry.verification === "GPS proximity-confirmed"
                    ? " — proximity only, not proof of participation."
                    : " — not independently verified."}
                </Text>
                {entry.photo && (
                  <Image
                    accessibilityLabel="Saved adventure photo"
                    source={{ uri: entry.photo }}
                    style={{ width: "100%", height: 260, borderRadius: 14 }}
                  />
                )}
                {!entry.evidenceRemoved &&
                  (entry.photo ||
                    entry.verification === "GPS proximity-confirmed") && (
                    <Button
                      title="Remove saved evidence"
                      secondary
                      disabled={busy}
                      onPress={async () => {
                        setBusy(true);
                        const photo = entry.photo;
                        try {
                          await removePhoto(photo);
                          const ok = await run((s) => ({
                            ...s,
                            journal: s.journal.map((j) =>
                              j.id === entry.id
                                ? {
                                    ...j,
                                    photo: undefined,
                                    evidenceRemoved: true,
                                  }
                                : j,
                            ),
                          }));
                          if (ok)
                            notify(
                              "Evidence removed. Your XP and adventure history are kept.",
                            );
                        } catch {
                          notify(
                            "Could not remove the photo. Please try again.",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    />
                  )}
                <Button
                  title="Close journal entry"
                  onPress={() => setSelected(undefined)}
                />
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}
