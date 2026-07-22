// Hand-drawn rose squiggle underline under an emphasized headline phrase.
// Ports the prototype's <Underlined> (primitives.tsx) using react-native-svg.
// Wrap around a <Text>; the wrapping View self-sizes to the text and the SVG
// stretches under it (preserveAspectRatio="none").
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

export function Underlined({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ position: "relative", alignSelf: "flex-start", paddingBottom: 4 }}>
      {children}
      <Svg
        style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
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
