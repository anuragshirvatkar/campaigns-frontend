import { Text as RNText, type TextProps } from "react-native";
import { type, type TypeVariant } from "@/theme";

type Props = TextProps & { variant?: TypeVariant; color?: string; align?: "left" | "center" | "right" };

/** All text in the app goes through this, so fonts and sizes stay on the type scale. */
export function Text({ variant = "body", color, align, style, ...rest }: Props) {
  return (
    <RNText
      // Respect the user's font size, but stop very large settings from breaking layouts
      maxFontSizeMultiplier={1.4}
      style={[type[variant], color ? { color } : null, align ? { textAlign: align } : null, style]}
      {...rest}
    />
  );
}
