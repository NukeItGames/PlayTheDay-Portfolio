import React, { useState } from "react";
import { View, Text } from "react-native";
import { useGame } from "../store/GameProvider";
import { Filters, recommend } from "../game/quests";
import { Quest } from "../game/types";
import { statusOf } from "../game/engine";
import LocationPicker from "./LocationPicker";
import { questWithLocation, saveLocation } from "../game/location";
import { Button, Chip, Empty, Icon, QuestCard } from "./components";
import { s, colors } from "./theme";

export default function Discover({
  quests,
  onQuest,
}: {
  quests: Quest[];
  onQuest: (q: Quest) => void;
}) {
  const { state, now, origin, run } = useGame();
  const [filters, setFilters] = useState<Filters>({
      minutes: 30,
      budget: 0,
      miles: 2,
    }),
    [picking, setPicking] = useState(false);
  const results = recommend(
    quests
      .filter((q) => statusOf(state, q.id) !== "completed")
      .map((q) => questWithLocation(q, state)),
    filters,
    origin,
    now,
  );
  const options: {
    key: keyof Filters;
    title: string;
    values: [string, number][];
  }[] = [
    {
      key: "minutes",
      title: "HOW MUCH TIME?",
      values: [
        ["30 minutes", 30],
        ["1 hour", 60],
        ["2 hours", 120],
        ["Flexible", Infinity],
      ],
    },
    {
      key: "budget",
      title: "YOUR BUDGET",
      values: [
        ["Free", 0],
        ["Under $20", 20],
        ["Any budget", Infinity],
      ],
    },
    {
      key: "miles",
      title: "HOW FAR?",
      values: [
        ["Nearby", 2],
        ["Within 5 miles", 5],
        ["Within 15 miles", 15],
        ["Anywhere in city", Infinity],
      ],
    },
  ];
  return (
    <>
      <View
        style={[s.card, { borderColor: "#514078", backgroundColor: "#1b1830" }]}
      >
        <View style={s.row}>
          <Icon name="flash" color={colors.amber} />
          <Text style={s.eyebrow}>LESS PLANNING. MORE LIVING.</Text>
        </View>
        <Text style={s.h1}>What Can I Do Right Now?</Text>
        <Text style={s.muted}>
          A little free time can turn into a great story.
        </Text>
        {options.map((group) => (
          <View key={group.key} style={{ gap: 10 }}>
            <Text style={s.small}>{group.title}</Text>
            <View style={s.wrap}>
              {group.values.map(([title, value]) => (
                <Chip
                  key={title}
                  title={title}
                  selected={filters[group.key] === value}
                  onPress={() =>
                    setFilters((f) => ({ ...f, [group.key]: value }))
                  }
                />
              ))}
            </View>
          </View>
        ))}
        <Text style={s.small}>
          {origin
            ? `Nearby uses ${origin.address || origin.name}.`
            : `Using ${state.player!.city}. Choose a location to filter known destinations by distance.`}{" "}
          Nearby means 2 miles. Suggested activities have unverified distance
          and opening hours until you choose a destination.
        </Text>
        <Button
          title={origin ? "Change Location" : "Choose Location"}
          secondary
          icon="map-outline"
          onPress={() => setPicking(true)}
        />
        {picking && (
          <LocationPicker
            initial={state.selectedLocation}
            city={state.player!.city}
            onClose={() => setPicking(false)}
            onConfirm={(location) => run((s) => saveLocation(s, location))}
          />
        )}
      </View>
      <View style={s.between}>
        <Text style={s.h2}>Your next move</Text>
        <Text style={s.small}>{results.length} ideas</Text>
      </View>
      <Text style={s.small}>
        Events appear here only when their confirmed schedule says they are in
        progress. Future events are in Events. Travel time is not included.
      </Text>
      {results.length ? (
        results.map((q) => (
          <QuestCard
            key={q.id}
            quest={q}
            status={statusOf(state, q.id)}
            onPress={() => onQuest(q)}
          />
        ))
      ) : (
        <Empty
          title="A little flexibility opens doors"
          text="Try more time, a wider distance, or check the Events tab for upcoming plans."
        />
      )}
    </>
  );
}
