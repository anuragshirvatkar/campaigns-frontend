// Home's reach panel (theme references/Screenshot 2026-10-21 191018.png): what $1 reaches, then a
// carousel of creator stories with sliding dots.
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import Svg, { Line } from "react-native-svg";
import { Text } from "@/components/ui";
import { compactNumber, fullNumber } from "@/lib/format";
import { colors, dk, fonts, shadow, themed } from "@/theme";
import { H, type Scale } from "./home-top";

const AUTO_MS = 4500;

type Story = { id: string; name: string; photo: number; peopleReached: number };

// Creators' results shown on Home (portraits cropped square around the face from assets/person N.jpg)
const STORIES: Story[] = [
  { id: "ryan", name: "Ryan", photo: require("../../../assets/images/home/story-1.jpg"), peopleReached: 25_000 },
  { id: "maya", name: "Maya", photo: require("../../../assets/images/home/story-2.jpg"), peopleReached: 18_400 },
  { id: "marcus", name: "Marcus", photo: require("../../../assets/images/home/story-3.jpg"), peopleReached: 32_600 },
];

/** Three short strokes fanning out from a corner, the reference's "spark" accent. */
function Spark({ size, color, style }: { size: number; color: string; style?: object }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" style={[{ position: "absolute" }, style]} pointerEvents="none">
      <Line x1="18" y1="4" x2="21" y2="12" stroke={color} strokeWidth={3.5} strokeLinecap="round" />
      <Line x1="5" y1="13" x2="13" y2="18" stroke={color} strokeWidth={3.5} strokeLinecap="round" />
      <Line x1="2" y1="28" x2="10" y2="29" stroke={color} strokeWidth={3.5} strokeLinecap="round" />
    </Svg>
  );
}

export function ReachPanel({ u, perDollar }: { u: Scale; perDollar?: number }) {
  // The platform default ($1 ≈ 27 people) until the server config arrives, so the line never shows a placeholder
  const people = compactNumber(Math.round(perDollar ?? 27));

  return (
    <Animated.View entering={FadeInDown.duration(450).delay(100)} style={{ marginTop: u(25) }}>
      {/* One row, as in the reference: $1 and what it reaches on the left, the stories on the right */}
      <View style={[styles.card, styles.row, { borderRadius: u(28), padding: u(16), gap: u(12) }]}>
        {/* Bottom padding = the dots row under the stories, so both halves centre on the same line */}
        <View style={[styles.row, { width: "50%", gap: u(10), paddingBottom: u(22) }]}>
          <View style={{ width: u(74), height: u(74) }}>
            <View style={[styles.dollar, { width: u(74), height: u(74), borderRadius: u(37) }]}>
              <Text maxFontSizeMultiplier={1} style={[styles.dollarText, { fontSize: u(32) }]}>
                $1
              </Text>
            </View>
            <Spark size={u(30)} color={H.accent} style={{ left: u(-14), top: u(-12) }} />
          </View>
          <View style={[styles.divider, { height: u(80) }]} />
          {/* One line each, shrinking to fit rather than wrapping (as in the reference) */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text maxFontSizeMultiplier={1} numberOfLines={1} adjustsFontSizeToFit style={[styles.reach, { fontSize: u(19), lineHeight: u(26) }]}>
              reaches about
            </Text>
            <Text maxFontSizeMultiplier={1} numberOfLines={1} adjustsFontSizeToFit style={[styles.reachStrong, { fontSize: u(23), lineHeight: u(30) }]}>
              {people} people outside
            </Text>
            <Text maxFontSizeMultiplier={1} numberOfLines={1} adjustsFontSizeToFit style={[styles.reach, { fontSize: u(19), lineHeight: u(26) }]}>
              your network.
            </Text>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <Stories u={u} stories={STORIES} />
        </View>
      </View>
    </Animated.View>
  );
}

/** One result per page; turns on its own every few seconds, and by swiping. */
function Stories({ u, stories }: { u: Scale; stories: Story[] }) {
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!width || paused || stories.length < 2) return;
    const t = setTimeout(() => {
      const next = (index + 1) % stories.length;
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
      setIndex(next);
    }, AUTO_MS);
    return () => clearTimeout(t);
  }, [index, width, paused, stories.length]);

  return (
    <View style={{ gap: u(12) }}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={() => setPaused(true)}
          onMomentumScrollEnd={(e) => {
            setIndex(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width)));
            setPaused(false);
          }}
        >
          {stories.map((s) => (
            <View key={s.id} style={{ width }}>
              <StoryCard u={u} story={s} />
            </View>
          ))}
        </ScrollView>
      </View>
      {stories.length > 1 && (
        <View style={[styles.dots, { gap: u(7) }]} accessibilityLabel={`Story ${index + 1} of ${stories.length}`}>
          {stories.map((s, i) => (
            <Animated.View
              key={s.id}
              layout={LinearTransition.duration(250)}
              style={[styles.dot, { height: u(10), borderRadius: u(5), width: i === index ? u(28) : u(10) }, i === index && styles.dotOn]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function StoryCard({ u, story: s }: { u: Scale; story: Story }) {
  const size = u(60);
  return (
    <View
      accessible
      accessibilityLabel={`${s.name} reached ${fullNumber(s.peopleReached)} people`}
      style={[styles.story, { borderRadius: u(20), paddingVertical: u(12), paddingHorizontal: u(12), gap: u(10) }]}
    >
      <View style={{ width: size, height: size }}>
        <Image source={s.photo} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />
      </View>
      <View style={{ flex: 1 }}>
        <Text maxFontSizeMultiplier={1} numberOfLines={1} style={[styles.storyName, { fontSize: u(17) }]}>
          {s.name} <Text maxFontSizeMultiplier={1} style={[styles.storyMuted, { fontSize: u(17) }]}>reached</Text>
        </Text>
        <Text maxFontSizeMultiplier={1} numberOfLines={1} adjustsFontSizeToFit style={[styles.storyNumber, { fontSize: u(32), lineHeight: u(40) }]}>
          {fullNumber(s.peopleReached)}
        </Text>
        <Text maxFontSizeMultiplier={1} numberOfLines={1} style={[styles.storyMuted, { fontSize: u(16) }]}>
          people
        </Text>
      </View>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    card: { backgroundColor: colors.card, borderWidth: 1, borderColor: H.border, ...shadow.card },
    row: { flexDirection: "row", alignItems: "center" },
    dollar: { backgroundColor: dk("#ECE9FF", "#2A2655"), alignItems: "center", justifyContent: "center" },
    dollarText: { fontFamily: fonts.bold, color: H.accent, includeFontPadding: false },
    divider: { width: 1.5, backgroundColor: H.outline },
    reach: { fontFamily: fonts.regular, color: H.body, includeFontPadding: false },
    reachStrong: { fontFamily: fonts.bold, color: H.ink },
    story: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: H.border },
    storyName: { fontFamily: fonts.semibold, color: H.ink, includeFontPadding: false },
    storyMuted: { fontFamily: fonts.regular, color: H.body, includeFontPadding: false },
    storyNumber: { fontFamily: fonts.bold, color: H.accent, includeFontPadding: false },
    dots: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center" },
    dot: { backgroundColor: H.track },
    dotOn: { backgroundColor: H.accent },
  }),
);
