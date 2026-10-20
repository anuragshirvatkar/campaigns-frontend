// The app logo drawn as vectors: a dot and three widening arcs, so each part can animate on its own.
// Geometry traced from assets/campaigns-logo.png; VIEWBOX is the square the icon and splash PNGs are cut from.
import Svg, { Circle, Path } from "react-native-svg";

export const LOGO_VIEWBOX = { x: 270, y: 55, size: 980 };

export const LOGO_PARTS = [
  { kind: "dot", color: "#6F00FC" },
  { kind: "arc", color: "#7102FD", d: "M612 425 Q776 568 612 712", width: 122 },
  { kind: "arc", color: "#9B53FB", d: "M775 285 Q1055 568 775 850", width: 128 },
  { kind: "arc", color: "#BA8AFA", d: "M935 130 Q1355 568 935 1005", width: 135 },
] as const;

// The outer arc's round cap reaches past the icon square, so parts draw on a padded canvas
const PAD = 60;
const viewBox = `${LOGO_VIEWBOX.x - PAD} ${LOGO_VIEWBOX.y - PAD} ${LOGO_VIEWBOX.size + PAD * 2} ${LOGO_VIEWBOX.size + PAD * 2}`;

/** One part of the logo (0 = dot, 1–3 = arcs), drawn on the full logo canvas so layers line up. */
export function LogoPart({ index, size }: { index: number; size: number }) {
  const p = LOGO_PARTS[index]!;
  const margin = (size * PAD) / LOGO_VIEWBOX.size;
  const full = size + margin * 2;
  return (
    <Svg width={full} height={full} viewBox={viewBox} style={{ position: "absolute", left: -margin, top: -margin }}>
      {p.kind === "dot" ? (
        <Circle cx={420} cy={568} r={113} fill={p.color} />
      ) : (
        <Path d={p.d} stroke={p.color} strokeWidth={p.width} strokeLinecap="round" fill="none" />
      )}
    </Svg>
  );
}
