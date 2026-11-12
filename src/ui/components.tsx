import React, { useEffect, useState } from "react";
import {
  Animated,
  Pressable,
  Text,
  View,
  ViewStyle,
  StyleProp,
  AccessibilityInfo,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, s } from "./theme";
import { Category, Player, Quest } from "../game/types";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export const categoryIcons: Record<Category, IconName> = {
  Exploration: "compass-outline",
  Fitness: "footsteps-outline",
  Social: "people-outline",
  Events: "musical-notes-outline",
  Adventure: "planet-outline",
};
export const categoryColors: Record<Category, string> = {
  Exploration: colors.green,
  Fitness: colors.blue,
  Social: colors.amber,
  Events: colors.purple,
  Adventure: "#efa6e2",
};
export function Icon({
  name,
  size = 20,
  color = colors.muted,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
export function Button({
  title,
  onPress,
  icon,
  secondary,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  secondary?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        {
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
          borderWidth: 1,
          borderColor: secondary ? colors.border : "transparent",
        },
        style,
      ]}
    >
      {icon && <Icon name={icon} color={colors.text} size={17} />}
      <Text style={s.buttonText}>{title}</Text>
    </Pressable>
  );
}
export function Chip({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-selected={!!selected}
      onPress={onPress}
      style={[s.chip, selected && s.chipSelected]}
    >
      <Text
        style={{
          color: selected ? "#d9caff" : colors.muted,
          fontSize: 13,
          fontWeight: selected ? "700" : "500",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Progress({
  value,
  color = colors.purple,
  height = 7,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  const [animation] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (active)
        Animated.timing(animation, {
          toValue: Math.max(0, Math.min(1, value)),
          duration: reduce ? 0 : 650,
          useNativeDriver: false,
        }).start();
    });
    return () => {
      active = false;
    };
  }, [animation, value]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={{
        height,
        backgroundColor: "#2b2c43",
        borderRadius: 20,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={{
          height,
          borderRadius: 20,
          width: animation.interpolate({
            inputRange: [0, 1],
            outputRange: ["0%", "100%"],
          }),
          backgroundColor: color,
        }}
      />
    </View>
  );
}
export function Avatar({
  player,
  size = 82,
}: {
  player: Pick<Player, "face" | "color" | "outfit" | "accessory" | "badge">;
  size?: number;
}) {
  const accent =
    player.color === "violet"
      ? "#ae88ff"
      : player.color === "mint"
        ? "#69e3c1"
        : "#70aaff";
  return (
    <View
      accessibilityLabel={`${player.color} ${player.face} avatar, ${player.outfit} outfit`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        backgroundColor: "#232641",
        borderWidth: 2,
        borderColor: accent + "77",
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "flex-end",
      }}
    >
      <View
        style={{
          width: size * 0.8,
          height: size * 0.45,
          borderTopLeftRadius: size * 0.3,
          borderTopRightRadius: size * 0.3,
          backgroundColor: player.outfit === "ranger" ? "#473b74" : accent,
          position: "absolute",
          bottom: -size * 0.13,
        }}
      />
      <View
        style={{
          width: size * 0.56,
          height: size * 0.59,
          borderRadius: size * 0.2,
          backgroundColor: "#e6b59b",
          marginBottom: size * 0.22,
          alignItems: "center",
          justifyContent: "center",
          borderTopWidth: size * 0.13,
          borderTopColor: player.face === "cool" ? "#ddd0ff" : "#393042",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            gap: size * 0.13,
            marginTop: size * 0.03,
          }}
        >
          <View
            style={{
              width: size * 0.055,
              height: size * 0.07,
              backgroundColor: "#272638",
              borderRadius: 3,
            }}
          />
          <View
            style={{
              width: size * 0.055,
              height: size * 0.07,
              backgroundColor: "#272638",
              borderRadius: 3,
            }}
          />
        </View>
        <View
          style={{
            width: size * 0.15,
            height: size * 0.07,
            borderBottomWidth: 2,
            borderBottomColor: "#784c55",
            borderRadius: player.face === "happy" ? 10 : 0,
            marginTop: size * 0.03,
          }}
        />
      </View>
      {player.accessory === "headphones" && (
        <View style={{ position: "absolute", top: size * 0.12 }}>
          <Icon name="headset" size={size * 0.7} color={colors.purple} />
        </View>
      )}
      {player.badge === "explorer" && (
        <View style={{ position: "absolute", bottom: 2, right: 2 }}>
          <Icon name="compass" size={size * 0.23} color={colors.amber} />
        </View>
      )}
    </View>
  );
}
export function CityArt({ compact = false }: { compact?: boolean }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        height: compact ? 160 : 240,
        width: "100%",
        overflow: "hidden",
        borderRadius: 18,
      }}
    >
      <LinearGradient
        colors={["#282148", "#222650", "#30466b"]}
        style={{ flex: 1 }}
      >
        {[12, 30, 49, 64, 81, 91].map((x, i) => (
          <View
            key={x}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: 15 + (i % 3) * 16,
              height: 3,
              width: 3,
              borderRadius: 3,
              backgroundColor: "#cbbcfb",
            }}
          />
        ))}
        <View
          style={{
            position: "absolute",
            right: "21%",
            top: 24,
            width: 45,
            height: 45,
            borderRadius: 40,
            backgroundColor: "#bbb3ed",
          }}
        />
        <View
          style={{
            position: "absolute",
            right: "19%",
            top: 16,
            width: 40,
            height: 40,
            borderRadius: 40,
            backgroundColor: "#27234b",
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: 28,
            width: "100%",
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: 7,
          }}
        >
          {[50, 78, 55, 105, 140, 85, 112, 62, 85].map((height, i) => (
            <View
              key={i}
              style={{
                width: "9%",
                height: compact ? height * 0.7 : height,
                backgroundColor: i % 2 ? "#41436f" : "#34375f",
                borderTopLeftRadius: i === 4 ? 16 : 3,
                borderTopRightRadius: i === 4 ? 16 : 3,
                padding: 7,
                gap: 9,
              }}
            >
              {Array.from({ length: Math.floor(height / 25) }, (_, j) => (
                <View
                  key={j}
                  style={{
                    height: 4,
                    width: j % 2 ? "45%" : "80%",
                    backgroundColor: i % 3 ? "#7b76ad" : "#aba0cf",
                    opacity: 0.6,
                  }}
                />
              ))}
            </View>
          ))}
        </View>
        <View
          style={{
            position: "absolute",
            bottom: 0,
            width: "120%",
            height: 40,
            backgroundColor: "#203c57",
            transform: [{ rotate: "-3deg" }],
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: 8,
            width: "100%",
            height: 2,
            backgroundColor: "#5d7c9c",
            transform: [{ rotate: "-3deg" }],
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 42,
            left: "23%",
            padding: 8,
            backgroundColor: "#a78bfa",
            borderRadius: 12,
            transform: [{ rotate: "-9deg" }],
          }}
        >
          <Icon name="location" color="#251d45" size={23} />
        </View>
      </LinearGradient>
    </View>
  );
}
export function QuestCard({
  quest,
  status,
  onPress,
}: {
  quest: Quest;
  status: string;
  onPress: () => void;
}) {
  const accent = categoryColors[quest.category];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${quest.title}, ${quest.xp} XP, ${status}`}
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        {
          padding: 19,
          gap: 14,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={s.between}>
        <View style={[s.row, { gap: 8 }]}>
          <View
            style={{
              padding: 8,
              borderRadius: 10,
              backgroundColor: accent + "15",
            }}
          >
            <Icon name={categoryIcons[quest.category]} color={accent} />
          </View>
          <Text
            style={{
              color: accent,
              fontSize: 11,
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {quest.category}
          </Text>
        </View>
        <Text style={{ color: colors.amber, fontSize: 13, fontWeight: "800" }}>
          +{quest.xp} XP
        </Text>
      </View>
      <View style={{ gap: 5 }}>
        <Text style={s.h3}>{quest.title}</Text>
        <Text numberOfLines={2} style={s.small}>
          {quest.description}
        </Text>
      </View>
      <View style={s.between}>
        <Text style={s.small}>
          {quest.minutes ? `${quest.minutes} min` : "Duration varies"} ·{" "}
          {quest.cost === 0
            ? "Free"
            : quest.cost === null
              ? "Cost unknown"
              : `$${quest.cost}`}{" "}
          · {quest.difficulty}
        </Text>
        <Icon
          name={
            status === "completed"
              ? "checkmark-circle"
              : status === "accepted"
                ? "bookmark"
                : "arrow-forward"
          }
          color={status === "completed" ? colors.green : colors.purple}
          size={18}
        />
      </View>
      {quest.start && (
        <Text style={{ color: colors.purple, fontSize: 12 }}>
          {new Date(quest.start).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
          })}
        </Text>
      )}
    </Pressable>
  );
}
export function Empty({
  title,
  text,
  icon = "compass-outline",
}: {
  title: string;
  text: string;
  icon?: IconName;
}) {
  return (
    <View style={[s.card, { alignItems: "center", paddingVertical: 32 }]}>
      <Icon name={icon} size={36} color={colors.purple} />
      <Text style={s.h3}>{title}</Text>
      <Text style={[s.muted, { textAlign: "center", maxWidth: 450 }]}>
        {text}
      </Text>
    </View>
  );
}
