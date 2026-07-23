// Hand-drawn rose squiggle underline under an emphasized headline phrase.
// Ports the prototype's <Underlined> (primitives.tsx) using react-native-svg.
// Wrap around a <Text>; the wrapping View self-sizes to the text and the SVG
// stretches under it (preserveAspectRatio="none").
import { useEffect, useRef, useState } from "react";
import { Animated, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Headline } from "./ui";

export function Underlined({ children }: { children: React.ReactNode }) {
  // No bottom padding — the squiggle is drawn just below the text box (bottom:-2)
  // so the word keeps the same baseline as adjacent (non-underlined) headline text.
  return (
    <View style={{ position: "relative", alignSelf: "flex-start" }}>
      {children}
      <Svg
        style={{ position: "absolute", left: 0, right: 0, bottom: -2 }}
        width="100%"
        height={5}
        viewBox="0 0 100 5"
        preserveAspectRatio="none"
        pointerEvents="none"
      >
        <Path
          d="M2,3.8 C18,1 38,5 58,2.2 C78,0 95,4 98,3.2"
          fill="none"
          stroke="#B83A52"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

// Cycling pet word under the squiggle — ports the prototype's <RollingAnimal>.
const PETS = [
  "dog.", "cat.", "kitten.", "puppy.", "rabbit.",
  "hamster.", "parrot.", "guinea pig.", "ferret.", "gecko.",
];

export function RollingAnimal() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * PETS.length));
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const cycle = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setIndex((i) => {
          let next = i;
          while (next === i) next = Math.floor(Math.random() * PETS.length);
          return next;
        });
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 2200);
    return () => clearInterval(cycle);
  }, [opacity]);

  return (
    <Underlined>
      <Animated.Text style={{ opacity }}>
        <Headline>{PETS[index]}</Headline>
      </Animated.Text>
    </Underlined>
  );
}
