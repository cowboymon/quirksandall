// Pulsing placeholder block for content that loads with a visible delay —
// reads as "something is coming" where a blank region reads as "broken".
import { useEffect, useRef } from "react";
import { Animated, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "@quirksandall/shared";

export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const pulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ backgroundColor: colors.secondary, borderRadius: 8, opacity: pulse }, style]} />;
}
