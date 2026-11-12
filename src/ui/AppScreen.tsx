import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useGame } from "../store/GameProvider";
import {
  claimWeekly,
  isExpired,
  leaderboard,
  levelInfo,
  localDay,
  rewards,
  statusOf,
  weeklyObjectives,
} from "../game/engine";
import { dailyQuests, eventQuest, ordinaryQuests } from "../game/quests";
import { Quest } from "../game/types";
import Onboarding from "./Onboarding";
import QuestDetail from "./QuestDetail";
import Discover from "./Discover";
import Profile from "./Profile";
import Journal from "./Journal";
import {
  Avatar,
  Button,
  Chip,
  CityArt,
  Empty,
  Icon,
  IconName,
  Progress,
  QuestCard,
} from "./components";
import { colors, s } from "./theme";

const navigation: { key: string; title: string; icon: IconName }[] = [
  { key: "home", title: "Home", icon: "grid-outline" },
  { key: "quests", title: "Quests", icon: "flag-outline" },
  { key: "explore", title: "Explore", icon: "compass-outline" },
  { key: "events", title: "Events", icon: "calendar-outline" },
  { key: "leaderboard", title: "Leaderboard", icon: "trophy-outline" },
  { key: "profile", title: "Profile", icon: "person-outline" },
];
function Toast({ text, onClose }: { text: string; onClose: () => void }) {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: text ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [text, opacity]);
  if (!text) return null;
  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 88,
        left: 18,
        right: 18,
        maxWidth: 590,
        alignSelf: "center",
        opacity,
        zIndex: 100,
      }}
    >
      <Pressable
        onPress={onClose}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[
          s.card,
          {
            backgroundColor: "#30244d",
            borderColor: "#8d6de3",
            flexDirection: "row",
            padding: 16,
          },
        ]}
      >
        <Icon name="sparkles" color={colors.amber} />
        <Text style={[s.text, { flex: 1 }]}>{text}</Text>
        <Icon name="close" size={17} />
      </Pressable>
    </Animated.View>
  );
}
export default function AppScreen() {
  const game = useGame(),
    {
      state,
      ready,
      loadError,
      now,
      events,
      notice,
      notify,
      run,
      refreshEvents,
    } = game;
  const { section: route, view } = useLocalSearchParams<{
      section?: string;
      view?: string;
    }>(),
    router = useRouter();
  const screen = route || "home",
    { width } = useWindowDimensions(),
    desktop = width >= 1080;
  const [selected, setSelected] = useState<Quest>(),
    [tab, setTab] = useState(view === "Weekly" ? "Weekly" : "Daily"),
    [category, setCategory] = useState("All"),
    [search, setSearch] = useState(""),
    [refreshing, setRefreshing] = useState(false);
  const navigate = (key: string) =>
    router.push(key === "home" ? "/" : (`/${key}` as "/"));
  if (loadError)
    return (
      <SafeAreaView
        style={[
          s.screen,
          { alignItems: "center", justifyContent: "center", padding: 30 },
        ]}
      >
        <Icon name="shield-outline" color={colors.amber} size={40} />
        <Text style={[s.text, { textAlign: "center", marginTop: 20 }]}>
          {loadError}
        </Text>
      </SafeAreaView>
    );
  if (!ready)
    return (
      <View
        style={[s.screen, { alignItems: "center", justifyContent: "center" }]}
      >
        <ActivityIndicator color={colors.purple} />
        <Text style={[s.muted, { marginTop: 16 }]}>
          Loading your adventure…
        </Text>
      </View>
    );
  if (!state.player)
    return (
      <View style={s.screen}>
        <Onboarding />
        <Toast text={notice} onClose={() => notify("")} />
      </View>
    );
  const player = state.player,
    level = levelInfo(state.xp),
    dailies = dailyQuests(player.city, now),
    ordinary = ordinaryQuests(player.city, state.generation);
  const realEvents = events.events
    .filter(
      (e) =>
        e.city === player.city && Date.parse(e.end ?? e.start) > now.getTime(),
    )
    .map(eventQuest);
  const accepted = Object.values(state.accepted).filter(
    (q) => q.kind !== "daily" || !isExpired(q, now),
  );
  const dailyDone = state.journal.filter(
    (j) => j.quest.kind === "daily" && j.localDay === localDay(now),
  ).length;
  const weekly = weeklyObjectives(state, now),
    unlocked = rewards.filter((r) => r.level <= level.level);
  const titles: Record<string, [string, string]> = {
    home: ["Your everyday, upgraded.", "A new day. A new side quest."],
    quests: [
      "A little challenge. A great story.",
      "Pick your next adventure and make it happen.",
    ],
    explore: [
      "There’s a whole world out there.",
      `Find your next adventure in ${player.city.split(",")[0]}.`,
    ],
    events: [
      "Good things are happening.",
      "Real local events. New experiences. Bonus XP.",
    ],
    leaderboard: [
      "A little friendly competition.",
      "Your progress alongside a few demo adventurers.",
    ],
    profile: [
      "Meet your main character.",
      "Your adventure. Your identity. Your way.",
    ],
    journal: [
      "Days worth remembering.",
      "Your Adventure Journal, one real moment at a time.",
    ],
    customize: [
      "Look the part.",
      "Turn your progress into a style of your own.",
    ],
  };
  function grid(quests: Quest[]) {
    return (
      <View
        style={{
          flexDirection: width > 760 ? "row" : "column",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        {quests.map((q) => (
          <View
            key={q.id}
            style={{ width: width > 760 ? "48.7%" : "100%", flexGrow: 1 }}
          >
            <QuestCard
              quest={q}
              status={statusOf(state, q.id)}
              onPress={() =>
                setSelected(
                  state.accepted[q.id] ||
                    state.journal.find((j) => j.id === q.id)?.quest ||
                    q,
                )
              }
            />
          </View>
        ))}
      </View>
    );
  }
  function weeklyCards() {
    return weekly.map((q) => (
      <View key={q.id} style={s.card}>
        <View style={s.between}>
          <Text style={[s.h3, { flex: 1 }]}>{q.title}</Text>
          <Text style={{ color: colors.amber, fontWeight: "700" }}>
            +{q.xp} XP
          </Text>
        </View>
        <Text style={s.muted}>{q.description}</Text>
        <Progress value={q.current / q.target} color={colors.blue} />
        <View style={s.between}>
          <Text style={s.small}>
            {Math.min(q.current, q.target)} / {q.target}
          </Text>
          <Button
            title={q.claimed ? "Claimed" : "Claim reward"}
            disabled={q.claimed || q.current < q.target}
            secondary
            onPress={() => run((s) => claimWeekly(s, q.id))}
          />
        </View>
      </View>
    ));
  }
  function content() {
    if (screen === "home")
      return (
        <>
          <View
            style={{ flexDirection: width > 800 ? "row" : "column", gap: 20 }}
          >
            <LinearGradient
              colors={["#262040", "#171b2c"]}
              style={[
                s.card,
                {
                  flex: width > 800 ? 1.2 : undefined,
                  borderColor: "#42345e",
                  padding: 25,
                  gap: 22,
                },
              ]}
            >
              <View style={s.between}>
                <Text style={s.eyebrow}>YOUR ADVENTURER</Text>
                <Pressable
                  accessibilityLabel="Customize avatar"
                  accessibilityRole="button"
                  onPress={() => navigate("customize")}
                >
                  <Icon name="create-outline" color={colors.purple} />
                </Pressable>
              </View>
              <View style={s.row}>
                <Avatar player={player} size={83} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={s.h2}>{player.username}</Text>
                  <Text style={s.muted}>{player.title}</Text>
                  <Text
                    style={{
                      color: colors.purple,
                      fontWeight: "700",
                      fontSize: 13,
                    }}
                  >
                    LEVEL {level.level}
                  </Text>
                </View>
              </View>
              <View style={{ gap: 10 }}>
                <View style={s.between}>
                  <Text style={s.small}>The next level is calling</Text>
                  <Text style={[s.small, { color: "#d0c3f2" }]}>
                    {level.current} / {level.needed} XP
                  </Text>
                </View>
                <Progress value={level.progress} height={9} />
              </View>
              <View style={s.between}>
                <View>
                  <Text style={s.h2}>{state.xp.toLocaleString()}</Text>
                  <Text style={s.small}>TOTAL XP</Text>
                </View>
                <View>
                  <Text style={s.h2}>{state.journal.length}</Text>
                  <Text style={s.small}>ADVENTURES</Text>
                </View>
                <View>
                  <Text style={s.h2}>{unlocked.length}</Text>
                  <Text style={s.small}>UNLOCKS</Text>
                </View>
              </View>
            </LinearGradient>
            <View
              style={[
                s.card,
                {
                  flex: width > 800 ? 1 : undefined,
                  padding: 0,
                  overflow: "hidden",
                  gap: 0,
                },
              ]}
            >
              <CityArt compact />
              <View style={{ padding: 20, gap: 10 }}>
                <Text style={s.eyebrow}>THE REAL WORLD IS YOUR MAP</Text>
                <Text style={s.h2}>
                  {player.city.split(",")[0]} is full of possibilities.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigate("explore")}
                  style={s.row}
                >
                  <Text style={{ color: colors.purple, fontWeight: "700" }}>
                    Go find your next adventure
                  </Text>
                  <Icon name="arrow-forward" color={colors.purple} size={16} />
                </Pressable>
              </View>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="What Can I Do Right Now?"
            onPress={() => navigate("explore")}
          >
            <LinearGradient
              colors={["#6342bd", "#3b438d"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 18,
                padding: 24,
                flexDirection: "row",
                alignItems: "center",
                gap: 18,
              }}
            >
              <View
                style={{
                  padding: 12,
                  backgroundColor: "#ffffff17",
                  borderRadius: 14,
                }}
              >
                <Icon name="flash" color="#f6df9b" size={27} />
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={[s.h2, { fontSize: width < 450 ? 19 : 22 }]}>
                  What Can I Do Right Now?
                </Text>
                <Text
                  style={{ color: "#dfd8fa", fontSize: 13, lineHeight: 20 }}
                >
                  Got a little time? We’ve got your next side quest.
                </Text>
              </View>
              <Icon name="arrow-forward" color="#fff" />
            </LinearGradient>
          </Pressable>
          <View style={s.between}>
            <View style={{ gap: 5 }}>
              <Text style={s.h2}>Today’s side quests</Text>
              <Text style={s.small}>
                Five fresh reasons to step outside. Resets at local midnight.
              </Text>
            </View>
            <Text style={{ color: colors.purple, fontWeight: "700" }}>
              {dailyDone} / 5
            </Text>
          </View>
          {grid(dailies)}
          <View style={s.between}>
            <Text style={s.h2}>The bigger adventure</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                router.push({
                  pathname: "/quests",
                  params: { view: "Weekly" },
                });
              }}
            >
              <Text style={{ color: colors.purple }}>Weekly quests →</Text>
            </Pressable>
          </View>
          {weeklyCards().slice(0, 1)}
          <View style={s.card}>
            <View style={s.between}>
              <Text style={s.h2}>
                {unlocked.length
                  ? "Your latest unlock"
                  : "Something to look forward to"}
              </Text>
              <Icon name="gift-outline" color={colors.amber} />
            </View>
            <Text style={s.muted}>
              {unlocked.length
                ? `${unlocked.at(-1)!.name} is ready for your character.`
                : "Reach level 2 to unlock Cosmic violet, your first avatar color."}
            </Text>
            <Button
              secondary
              title="Visit your wardrobe"
              icon="shirt-outline"
              onPress={() => navigate("customize")}
            />
          </View>
        </>
      );
    if (screen === "quests") {
      const list =
        tab === "Daily"
          ? dailies
          : tab === "Accepted"
            ? accepted
            : ordinary.filter((q) => statusOf(state, q.id) === "available");
      return (
        <>
          <View style={s.wrap}>
            {["Daily", "Weekly", "Available", "Accepted"].map((t) => (
              <Chip
                key={t}
                title={t === "Accepted" ? `Accepted (${accepted.length})` : t}
                selected={tab === t}
                onPress={() => setTab(t)}
              />
            ))}
          </View>
          {tab === "Weekly" ? (
            <>
              <Text style={s.muted}>
                Fresh objectives every Monday at local midnight. Claim each
                bonus once; regular quest XP is separate.
              </Text>
              {weeklyCards()}
            </>
          ) : (
            <>
              {tab === "Daily" && (
                <Text style={s.muted}>
                  {dailyDone} of 5 complete today · Fresh quests at your next
                  local midnight.
                </Text>
              )}
              {tab === "Available" && (
                <Button
                  title="Regenerate available quests"
                  secondary
                  icon="refresh-outline"
                  onPress={() =>
                    run((s) => ({ ...s, generation: s.generation + 1 }))
                  }
                />
              )}
              {list.length ? (
                grid(list)
              ) : (
                <Empty
                  title="Your next adventure is waiting"
                  text="Accept a daily quest or browse the available adventures to get started."
                />
              )}
            </>
          )}
        </>
      );
    }
    if (screen === "explore")
      return (
        <>
          <Discover
            quests={[...ordinary, ...dailies, ...realEvents]}
            onQuest={setSelected}
          />
          <View style={s.between}>
            <Text style={s.h2}>Coming up in your city</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigate("events")}
            >
              <Text style={{ color: colors.purple }}>All events →</Text>
            </Pressable>
          </View>
          {realEvents.length ? (
            grid(realEvents.slice(0, 4))
          ) : (
            <Empty
              title="No upcoming cached events"
              text="Your everyday adventures still work. Event coverage currently starts in Austin."
            />
          )}
        </>
      );
    if (screen === "events") {
      const eventTypes = [
        "All",
        ...new Set(events.events.map((e) => e.category)),
      ];
      const list = realEvents.filter(
        (q) =>
          q.title.toLowerCase().includes(search.toLowerCase()) &&
          (category === "All" ||
            events.events.find((e) => `event:${e.id}` === q.id)?.category ===
              category),
      );
      return (
        <>
          <View style={[s.card, { gap: 10 }]}>
            <View style={s.between}>
              <View style={[s.row, { flex: 1 }]}>
                <Icon name="radio-outline" color={colors.green} />
                <Text style={[s.h3, { flex: 1 }]}>
                  Real events. A saved schedule.
                </Text>
              </View>
              <Button
                title={refreshing ? "Refreshing…" : "Refresh"}
                secondary
                icon="refresh-outline"
                disabled={refreshing}
                onPress={async () => {
                  setRefreshing(true);
                  await refreshEvents();
                  setRefreshing(false);
                }}
              />
            </View>
            <Text style={s.small}>
              Austin Public Library · Last refreshed{" "}
              {events.refreshedAt
                ? new Date(events.refreshedAt).toLocaleString()
                : "never"}
              . Listings may change; confirm details at the source before
              leaving.
            </Text>
            {events.error && (
              <Text style={{ color: colors.amber, fontSize: 13 }}>
                {events.error}
              </Text>
            )}
          </View>
          <TextInput
            accessibilityLabel="Search events"
            placeholder="Search events, workshops, music…"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            style={s.input}
          />
          <View style={s.wrap}>
            {eventTypes.map((c) => (
              <Chip
                key={c}
                title={c}
                selected={category === c}
                onPress={() => setCategory(c)}
              />
            ))}
          </View>
          <Text style={s.small}>
            {list.length} upcoming listings · Times shown in your device
            timezone
          </Text>
          {list.length ? (
            grid(list)
          ) : (
            <Empty
              title={
                player.city !== "Austin, Texas"
                  ? "This city is next on our map"
                  : "No events match this view"
              }
              text={
                player.city !== "Austin, Texas"
                  ? "Real event coverage currently starts in Austin. Change your city in Profile, or explore everyday quests here."
                  : "Try another search or refresh the schedule. Offline quests are always available."
              }
              icon="calendar-outline"
            />
          )}
        </>
      );
    }
    if (screen === "leaderboard")
      return (
        <>
          <View style={[s.card, { backgroundColor: "#211d33" }]}>
            <Icon name="trophy-outline" size={32} color={colors.amber} />
            <Text style={s.h2}>Your only real competition? Yesterday.</Text>
            <Text style={s.muted}>
              This is a local demo leaderboard. Competitors below are fictional,
              not online players. Your real XP updates your position
              automatically.
            </Text>
          </View>
          {leaderboard(state).map((entry, i) => (
            <View
              key={entry.id}
              style={[
                s.card,
                s.row,
                {
                  padding: 18,
                  borderColor: entry.demo ? colors.border : "#8062c8",
                  backgroundColor: entry.demo ? colors.panel : "#272039",
                },
              ]}
            >
              <Text
                style={{
                  width: 28,
                  color: i === 0 ? colors.amber : colors.muted,
                  fontSize: 20,
                  fontWeight: "800",
                }}
              >
                {i + 1}
              </Text>
              <Avatar
                player={
                  entry.demo
                    ? {
                        face: i % 2 ? "cool" : "happy",
                        color: i % 2 ? "mint" : "blue",
                        outfit: "starter",
                        accessory: "none",
                        badge: "none",
                      }
                    : player
                }
                size={48}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.h3}>
                  {entry.username}
                  {!entry.demo ? " (you)" : ""}
                </Text>
                <Text style={s.small}>
                  {entry.demo ? "Demo competitor" : "Your adventurer"} · Level{" "}
                  {levelInfo(entry.xp).level}
                </Text>
              </View>
              <Text style={{ color: colors.purple, fontWeight: "800" }}>
                {entry.xp.toLocaleString()} XP
              </Text>
            </View>
          ))}
        </>
      );
    if (screen === "profile" || screen === "customize")
      return <Profile customization={screen === "customize"} />;
    if (screen === "journal") return <Journal />;
    return (
      <Empty
        title="A path yet to be explored"
        text="Choose Home to return to your adventure."
      />
    );
  }
  return (
    <SafeAreaView style={s.screen} edges={["top", "bottom"]}>
      <View style={{ flex: 1, flexDirection: "row" }}>
        {desktop && (
          <View
            style={{
              width: 222,
              borderRightWidth: 1,
              borderRightColor: colors.border,
              backgroundColor: "#10121e",
              padding: 20,
              gap: 30,
            }}
          >
            <View style={[s.row, { gap: 8, paddingVertical: 10 }]}>
              <Icon name="game-controller" color={colors.purple} size={28} />
              <Text style={[s.h2, { fontSize: 22 }]}>
                PlayTheDay<Text style={{ color: colors.purple }}>.</Text>
              </Text>
            </View>
            <View style={{ gap: 7 }}>
              <Text style={[s.eyebrow, { color: "#737a98", marginBottom: 10 }]}>
                YOUR WORLD
              </Text>
              {navigation.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  accessibilityState={{ selected: screen === item.key }}
                  key={item.key}
                  onPress={() => navigate(item.key)}
                  style={{
                    flexDirection: "row",
                    gap: 13,
                    alignItems: "center",
                    padding: 14,
                    borderRadius: 11,
                    backgroundColor:
                      screen === item.key ? "#2d2344" : "transparent",
                  }}
                >
                  <Icon
                    name={item.icon}
                    color={screen === item.key ? "#c4a9ff" : colors.muted}
                  />
                  <Text
                    style={{
                      color: screen === item.key ? "#d6c3ff" : colors.muted,
                      fontWeight: "600",
                      fontSize: 14,
                    }}
                  >
                    {item.title}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={s.divider} />
            <Pressable
              accessibilityRole="button"
              onPress={() => navigate("journal")}
              style={s.row}
            >
              <Icon name="book-outline" />
              <Text style={s.muted}>Adventure Journal</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            <View style={[s.card, { padding: 16, backgroundColor: "#19182b" }]}>
              <Icon name="sparkles-outline" color={colors.amber} />
              <Text style={s.h3}>Small quests.{"\n"}Big memories.</Text>
              <Text style={s.small}>
                Your next favorite day starts with one small step.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigate("profile")}
              style={s.row}
            >
              <Avatar player={player} size={37} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={s.buttonText}>
                  {player.username}
                </Text>
                <Text style={s.small}>Level {level.level} adventurer</Text>
              </View>
            </Pressable>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View
            style={{
              minHeight: 64,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              paddingHorizontal: width < 600 ? 20 : 30,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={[s.row, { gap: 8 }]}>
              <Icon
                name={desktop ? "location-outline" : "game-controller"}
                size={desktop ? 17 : 24}
                color={colors.purple}
              />
              <Text style={desktop ? s.small : s.h3}>
                {desktop ? player.city : "PlayTheDay."}
              </Text>
            </View>
            <View style={s.row}>
              {desktop && (
                <Text style={s.small}>
                  {now.toLocaleDateString([], {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Adventure Journal"
                onPress={() => navigate("journal")}
                style={{ padding: 10 }}
              >
                <Icon name="book-outline" color={colors.purple} />
              </Pressable>
              {!desktop && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Customize avatar"
                  onPress={() => navigate("customize")}
                >
                  <Avatar player={player} size={31} />
                </Pressable>
              )}
            </View>
          </View>
          <ScrollView
            key={screen}
            contentContainerStyle={[s.page, { padding: width < 600 ? 18 : 28 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ gap: 8 }}>
              <Text style={s.eyebrow}>
                {screen === "home"
                  ? `HEY, ${player.username.toUpperCase()} 👋`
                  : screen === "journal"
                    ? "ADVENTURE JOURNAL"
                    : screen.toUpperCase()}
              </Text>
              <Text style={[s.h1, { fontSize: width < 500 ? 29 : 34 }]}>
                {titles[screen]?.[0] || "Off the map"}
              </Text>
              <Text style={s.muted}>{titles[screen]?.[1]}</Text>
            </View>
            {content()}
            <View style={[s.row, { justifyContent: "center", paddingTop: 12 }]}>
              <Icon name="sparkles-outline" size={13} color="#6e668a" />
              <Text style={{ color: "#77748e", fontSize: 11 }}>
                Less scrolling. More stories. Play your day.
              </Text>
            </View>
          </ScrollView>
          {!desktop && (
            <View
              style={{
                flexDirection: "row",
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingVertical: 9,
                backgroundColor: "#111421",
              }}
            >
              {navigation.map((item) => (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  accessibilityState={{ selected: screen === item.key }}
                  onPress={() => navigate(item.key)}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    gap: 5,
                    paddingVertical: 5,
                  }}
                >
                  <Icon
                    name={item.icon}
                    color={screen === item.key ? colors.purple : "#8e94ae"}
                    size={21}
                  />
                  <Text
                    style={{
                      color: screen === item.key ? colors.purple : "#8e94ae",
                      fontSize: width < 380 ? 9 : 10,
                      fontWeight: "600",
                    }}
                  >
                    {item.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
      {selected && (
        <QuestDetail
          key={selected.id}
          quest={selected}
          onClose={() => setSelected(undefined)}
        />
      )}
      <Toast text={notice} onClose={() => notify("")} />
    </SafeAreaView>
  );
}
