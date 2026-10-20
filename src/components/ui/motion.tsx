// Small shared motion: a subtle press for cards, and a quick fade-in for the main feeds. Both switch off when the phone's "reduce motion" setting is on.
import { useState, type ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Style = StyleProp<ViewStyle>;
type PressScaleProps = Omit<PressableProps, "style"> & {
  /** Same as Pressable's style: a style, or a function of the pressed state */
  style?: Style | ((state: { pressed: boolean }) => Style);
  /** How far it shrinks while held (cards use a subtle 0.98) */
  scaleTo?: number;
};

/** Drop-in for Pressable on cards: gives a little while held and eases back on release. */
export function PressScale({ style, scaleTo = 0.98, onPressIn, onPressOut, ...rest }: PressScaleProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const resolved = typeof style === "function" ? style({ pressed }) : style;
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        setPressed(true);
        if (!reduced) scale.set(withTiming(scaleTo, { duration: 90 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        scale.set(withTiming(1, { duration: 140 }));
        onPressOut?.(e);
      }}
      style={[resolved, anim]}
    />
  );
}

/** A quick fade-in for the first few cards of a feed, slightly staggered. No slide or bounce. */
export function Appear({ index = 0, children, style }: { index?: number; children: ReactNode; style?: Style }) {
  const reduced = useReducedMotion();
  if (reduced || index > 5) return <Animated.View style={style}>{children}</Animated.View>;
  return (
    <Animated.View entering={FadeIn.delay(index * 30).duration(200)} style={style}>
      {children}
    </Animated.View>
  );
}
