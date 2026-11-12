import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useGame } from "../store/GameProvider";
import { equip, levelInfo, rewards } from "../game/engine";
import { Avatar, Button, Chip, Icon, IconName, Progress } from "./components";
import { cities } from "./Onboarding";
import LocationPicker from "./LocationPicker";
import { saveLocation } from "../game/location";
import { colors, s } from "./theme";

export default function Profile({
  customization = false,
}: {
  customization?: boolean;
}) {
  const { state, run, notify } = useGame(),
    router = useRouter();
  const player = state.player!,
    level = levelInfo(state.xp);
  const [username, setUsername] = useState(player.username),
    [city, setCity] = useState(player.city),
    [busy, setBusy] = useState(false),
    [picking, setPicking] = useState(false);
  return (
    <>
      <View style={s.card}>
        <View style={s.row}>
          <Avatar player={player} size={100} />
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={s.eyebrow}>
              LEVEL {level.level} · {player.title.toUpperCase()}
            </Text>
            <Text style={s.h1}>{player.username}</Text>
            <Text style={s.muted}>{player.city}</Text>
          </View>
        </View>
        <Progress value={level.progress} />
        <Text style={s.small}>
          {level.current} / {level.needed} XP to level {level.level + 1} ·{" "}
          {state.xp.toLocaleString()} lifetime XP
        </Text>
        <View style={s.wrap}>
          <Text style={s.pill}>
            <Text style={s.text}>{state.journal.length} adventures</Text>
          </Text>
          <Text style={s.pill}>
            <Text style={s.text}>
              {rewards.filter((r) => r.level <= level.level).length} rewards
              unlocked
            </Text>
          </Text>
        </View>
        <Button
          secondary
          title="Open Adventure Journal"
          icon="book-outline"
          onPress={() => router.push("/journal")}
        />
      </View>
      {!customization && (
        <View style={s.card}>
          <Text style={s.h2}>Your player details</Text>
          <Text style={s.small}>USERNAME</Text>
          <TextInput
            accessibilityLabel="Edit username"
            value={username}
            onChangeText={setUsername}
            style={s.input}
            maxLength={24}
          />
          <Text style={s.small}>
            {state.selectedLocation?.address ||
              state.selectedLocation?.name ||
              "Choose where to discover activities."}
          </Text>
          <Button
            title="Change Location"
            secondary
            icon="map-outline"
            onPress={() => setPicking(true)}
          />
          {picking && (
            <LocationPicker
              initial={state.selectedLocation}
              city={player.city}
              onClose={() => setPicking(false)}
              onConfirm={async (location) => {
                const ok = await run((s) => saveLocation(s, location));
                if (ok && location.city) setCity(location.city);
                return ok;
              }}
            />
          )}
          <Text style={s.small}>CITY</Text>
          <View style={s.wrap}>
            {cities.map((c) => (
              <Chip
                key={c}
                title={c.split(",")[0]}
                selected={c === city}
                onPress={() => setCity(c)}
              />
            ))}
          </View>
          <Text style={s.small}>
            Austin has real event listings. Daily progress is kept when you
            change city; accepted quests keep their original destination.
          </Text>
          <Button
            title={busy ? "Saving…" : "Save profile"}
            disabled={busy || !username.trim()}
            onPress={async () => {
              setBusy(true);
              const ok = await run((s) => ({
                ...s,
                player: { ...s.player!, username: username.trim(), city },
                selectedLocation:
                  city === s.player!.city ? s.selectedLocation : undefined,
              }));
              if (ok) {
                notify("Profile saved.");
              }
              setBusy(false);
            }}
          />
        </View>
      )}
      <View style={s.card}>
        <Text style={s.eyebrow}>THE CHARACTER IS YOU</Text>
        <Text style={s.h2}>Make it your own</Text>
        <Text style={s.small}>STARTER APPEARANCE</Text>
        <View style={s.wrap}>
          {[
            ["happy", "Daydreamer"],
            ["cool", "Night owl"],
          ].map(([id, name]) => (
            <Chip
              key={id}
              title={name}
              selected={player.face === id}
              onPress={() =>
                run((s) => ({ ...s, player: { ...s.player!, face: id } }))
              }
            />
          ))}
        </View>
        <View style={s.wrap}>
          {[
            ["blue", "Electric blue"],
            ["mint", "Fresh mint"],
          ].map(([id, name]) => (
            <Chip
              key={id}
              title={name}
              selected={player.color === id}
              onPress={() =>
                run((s) => ({ ...s, player: { ...s.player!, color: id } }))
              }
            />
          ))}
          <Chip
            title="Starter outfit"
            selected={player.outfit === "starter"}
            onPress={() =>
              run((s) => ({
                ...s,
                player: { ...s.player!, outfit: "starter" },
              }))
            }
          />
          <Chip
            title="No accessory"
            selected={player.accessory === "none"}
            onPress={() =>
              run((s) => ({
                ...s,
                player: { ...s.player!, accessory: "none" },
              }))
            }
          />
          <Chip
            title="No badge"
            selected={player.badge === "none"}
            onPress={() =>
              run((s) => ({ ...s, player: { ...s.player!, badge: "none" } }))
            }
          />
          <Chip
            title="New adventurer"
            selected={player.title === "New adventurer"}
            onPress={() =>
              run((s) => ({
                ...s,
                player: { ...s.player!, title: "New adventurer" },
              }))
            }
          />
        </View>
      </View>
      <Text style={s.h2}>A style worth earning</Text>
      {rewards.map((reward) => {
        const unlocked = level.level >= reward.level,
          equipped = player[reward.kind] === reward.id;
        return (
          <View
            key={reward.id}
            style={[
              s.card,
              s.between,
              { padding: 18, opacity: unlocked ? 1 : 0.75 },
            ]}
          >
            <View style={[s.row, { flex: 1 }]}>
              <View
                style={{
                  backgroundColor: "#2c2343",
                  padding: 14,
                  borderRadius: 12,
                }}
              >
                <Icon
                  name={reward.icon as IconName}
                  color={unlocked ? colors.purple : colors.muted}
                  size={24}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.h3}>{reward.name}</Text>
                <Text style={s.small}>
                  {reward.kind} · Unlocks at level {reward.level}
                </Text>
              </View>
            </View>
            <Button
              title={
                equipped
                  ? "Equipped"
                  : unlocked
                    ? "Equip"
                    : `Level ${reward.level}`
              }
              secondary
              disabled={!unlocked || equipped}
              icon={!unlocked ? "lock-closed-outline" : undefined}
              onPress={() => run((s) => equip(s, reward.id))}
            />
          </View>
        );
      })}
      <View style={s.card}>
        <Text style={s.h3}>Your adventure, your device</Text>
        <Text style={s.muted}>
          No account or server sync. Confirmed locations, photos and check-in
          labels stay on this device. Map areas and address searches use
          OpenStreetMap. Remove saved evidence from any journal entry. Clearing
          browser or app storage removes your progress.
        </Text>
      </View>
    </>
  );
}
