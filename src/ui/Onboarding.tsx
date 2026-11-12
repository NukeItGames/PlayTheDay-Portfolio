import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useGame } from "../store/GameProvider";
import { basePlayer } from "../game/engine";
import LocationPicker from "./LocationPicker";
import { SelectedLocation } from "../game/types";
import { saveLocation } from "../game/location";
import { Avatar, Button, Chip, CityArt, Icon } from "./components";
import { colors, s } from "./theme";

export const cities = [
  "Austin, Texas",
  "Dallas, Texas",
  "Houston, Texas",
  "San Antonio, Texas",
];
export default function Onboarding() {
  const { run } = useGame(),
    { width } = useWindowDimensions();
  const [step, setStep] = useState(0),
    [username, setUsername] = useState(""),
    [city, setCity] = useState(cities[0]),
    [face, setFace] = useState("happy"),
    [color, setColor] = useState("blue"),
    [busy, setBusy] = useState(false),
    [picking, setPicking] = useState(false),
    [location, setLocation] = useState<SelectedLocation>();
  const player = basePlayer(username, city, face, color);
  return (
    <SafeAreaView style={s.screen}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: width > 700 ? 50 : 24,
          justifyContent: "center",
          alignItems: "center",
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ maxWidth: step ? 540 : 940, width: "100%", gap: 32 }}>
          <View style={[s.row, { justifyContent: "center" }]}>
            <View
              style={{
                backgroundColor: "#7854e8",
                padding: 9,
                borderRadius: 12,
              }}
            >
              <Icon name="game-controller" color="#fff" size={22} />
            </View>
            <Text style={[s.h2, { fontSize: 25 }]}>
              PlayTheDay<Text style={{ color: colors.purple }}>.</Text>
            </Text>
          </View>
          {!step ? (
            <LinearGradient
              colors={["#211b3d", "#141724"]}
              style={[s.card, { padding: width > 700 ? 38 : 24, gap: 28 }]}
            >
              <View
                style={{
                  flexDirection: width > 800 ? "row" : "column",
                  alignItems: "center",
                  gap: 32,
                }}
              >
                <View
                  style={{
                    flex: width > 800 ? 1 : undefined,
                    width: "100%",
                    gap: 22,
                  }}
                >
                  <Text style={s.eyebrow}>
                    YOUR NEXT CHAPTER STARTS OUTSIDE
                  </Text>
                  <Text
                    style={[
                      s.h1,
                      {
                        fontSize: width > 800 ? 53 : 39,
                        lineHeight: width > 800 ? 59 : 46,
                      },
                    ]}
                  >
                    Real world.{"\n"}
                    <Text style={{ color: colors.purple }}>
                      Endless adventure.
                    </Text>
                  </Text>
                  <Text style={[s.text, { color: "#ccc7df" }]}>
                    Turn real life into a game.
                  </Text>
                  <Text style={s.muted}>
                    Discover your city. Take on little adventures. Build a
                    character — and a collection of days worth remembering.
                  </Text>
                  <Button
                    title="Start Adventure"
                    icon="arrow-forward"
                    onPress={() => setStep(1)}
                  />
                </View>
                <View
                  style={{
                    flex: width > 800 ? 1 : undefined,
                    width: "100%",
                    maxWidth: 420,
                  }}
                >
                  <CityArt />
                </View>
              </View>
              <View style={s.divider} />
              <View style={[s.wrap, { justifyContent: "space-around" }]}>
                {[
                  ["compass-outline", "Find your next adventure"],
                  ["sparkles-outline", "Earn XP. Unlock your style."],
                  ["shield-checkmark-outline", "No account. Just you."],
                ].map(([icon, label]) => (
                  <View key={label} style={[s.row, { gap: 8 }]}>
                    <Icon
                      name={icon as "compass-outline"}
                      size={18}
                      color={colors.purple}
                    />
                    <Text style={s.small}>{label}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          ) : (
            <View style={s.card}>
              <Text style={s.eyebrow}>CREATE YOUR CHARACTER</Text>
              <Text style={s.h1}>Every legend starts{"\n"}somewhere.</Text>
              <View style={{ alignItems: "center" }}>
                <Avatar player={player} size={104} />
              </View>
              <Text style={s.h3}>What should we call you?</Text>
              <TextInput
                accessibilityLabel="Username"
                placeholder="Your adventurer name"
                placeholderTextColor={colors.muted}
                maxLength={24}
                value={username}
                onChangeText={setUsername}
                style={s.input}
                autoCapitalize="none"
              />
              <Text style={s.small}>YOUR LOOK</Text>
              <View style={s.wrap}>
                <Chip
                  title="Daydreamer"
                  selected={face === "happy"}
                  onPress={() => setFace("happy")}
                />
                <Chip
                  title="Night owl"
                  selected={face === "cool"}
                  onPress={() => setFace("cool")}
                />
                <Chip
                  title="Electric blue"
                  selected={color === "blue"}
                  onPress={() => setColor("blue")}
                />
                <Chip
                  title="Fresh mint"
                  selected={color === "mint"}
                  onPress={() => setColor("mint")}
                />
              </View>
              <Text style={s.small}>STARTING CITY</Text>
              <View style={s.wrap}>
                {cities.map((c) => (
                  <Chip
                    key={c}
                    title={c.split(",")[0]}
                    selected={city === c}
                    onPress={() => {
                      setCity(c);
                      setLocation(undefined);
                    }}
                  />
                ))}
              </View>
              <Text style={s.small}>
                Live event coverage starts in Austin. City-based quests work in
                other cities too.
              </Text>
              <Button
                title={location ? location.name : "Choose Location (optional)"}
                secondary
                icon="map-outline"
                onPress={() => setPicking(true)}
              />
              {picking && (
                <LocationPicker
                  initial={location}
                  city={city}
                  onClose={() => setPicking(false)}
                  onConfirm={async (selected) => {
                    setLocation(selected);
                    if (selected.city) setCity(selected.city);
                    return true;
                  }}
                />
              )}
              <Button
                title={busy ? "Creating character…" : "Let’s play the day"}
                disabled={!username.trim() || busy}
                icon="arrow-forward"
                onPress={async () => {
                  setBusy(true);
                  await run((state) =>
                    state.player
                      ? state
                      : location
                        ? saveLocation({ ...state, player }, location)
                        : { ...state, player },
                  );
                  setBusy(false);
                }}
              />
              <Text style={[s.small, { textAlign: "center" }]}>
                Your character and adventures stay on this device.{"\n"}No
                sign-up. No purchases. No pressure.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
