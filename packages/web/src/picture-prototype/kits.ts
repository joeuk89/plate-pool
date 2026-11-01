// PROTOTYPE, throwaway. Hand-written kits in format 1 shape (lengths in mm) and the
// loadings each scenario shows. Answers plate-pool issue #60. Never ships.

export type Unit = "kg" | "lb";
export type Kind = "bar" | "handle" | "stack" | "vest";
export type PictureId =
  | "bar"
  | "ez"
  | "trap"
  | "safety-squat"
  | "swiss"
  | "handle"
  | "stack"
  | "kettlebell"
  | "dip-belt"
  | "landmine"
  | "leg-press"
  | "vest";

export interface PlateSpec {
  weight: number;
  /** mm; a block's height */
  diameter: number;
  /** mm; stack length. A block's width. */
  thickness: number;
  colour?: string;
  shape: "round" | "square" | "hexagonal" | "twelve-sided" | "block";
}

export type HardwareStyle = "spring" | "clamp" | "spinlock" | "screw" | "pin";

export interface HardwareSpec {
  name: string;
  kind: "collar" | "screw" | "pin";
  /** What a hardware `picture` field would say. Variant A draws by style; B and C draw by kind only. */
  style: HardwareStyle;
  /** mm along the position */
  width: number;
}

export interface Position {
  name: string;
  /** innermost first */
  plates: number[];
}

export interface Scenario {
  id: string;
  label: string;
  implementName: string;
  kind: Kind;
  picture: PictureId;
  unit: Unit;
  /** mm; what the plates and hardware share on one position */
  positionLength: number;
  /** mm; plates with a larger diameter are refused, so the drawing scales to it */
  maxPlateDiameter?: number;
  /** the plates the implement accepts, heaviest first */
  plates: PlateSpec[];
  positions: Position[];
  hardware?: HardwareSpec;
  total: string;
  note?: string;
  source: string;
}

const eleikoIpf: PlateSpec[] = [
  { weight: 25, diameter: 450, thickness: 27, colour: "#c9353f", shape: "round" },
  { weight: 20, diameter: 450, thickness: 20, colour: "#2f67cc", shape: "round" },
  { weight: 15, diameter: 400, thickness: 19, colour: "#e8b923", shape: "round" },
  { weight: 10, diameter: 325, thickness: 19, colour: "#1c8a55", shape: "round" },
  { weight: 5, diameter: 228, thickness: 20, colour: "#e9e9e9", shape: "round" },
  { weight: 2.5, diameter: 190, thickness: 15, colour: "#2a2d31", shape: "round" },
  { weight: 1.25, diameter: 160, thickness: 12, colour: "#b9bec4", shape: "round" },
];

const rogueCastLb: PlateSpec[] = [
  { weight: 45, diameter: 444, thickness: 33, shape: "round" },
  { weight: 35, diameter: 356, thickness: 33, shape: "round" },
  { weight: 25, diameter: 277, thickness: 36, shape: "round" },
  { weight: 10, diameter: 226, thickness: 23, shape: "round" },
  { weight: 5, diameter: 197, thickness: 15, shape: "round" },
  { weight: 2.5, diameter: 160, thickness: 13, shape: "round" },
];

const rogueEchoLb: PlateSpec[] = [
  { weight: 45, diameter: 450, thickness: 61, shape: "round" },
  { weight: 25, diameter: 450, thickness: 38, shape: "round" },
  { weight: 10, diameter: 450, thickness: 21, shape: "round" },
];

const rogueColourEchoKg: PlateSpec[] = [
  { weight: 25, diameter: 450, thickness: 70, shape: "round" },
  { weight: 20, diameter: 450, thickness: 55, shape: "round" },
  { weight: 15, diameter: 450, thickness: 47, shape: "round" },
  { weight: 10, diameter: 450, thickness: 34, shape: "round" },
  { weight: 5, diameter: 450, thickness: 24, shape: "round" },
];

const mirafitDeepDish: PlateSpec[] = [
  { weight: 25, diameter: 450, thickness: 45, shape: "twelve-sided" },
  { weight: 20, diameter: 450, thickness: 40, shape: "twelve-sided" },
  { weight: 15, diameter: 360, thickness: 36, shape: "twelve-sided" },
  { weight: 10, diameter: 325, thickness: 32, shape: "twelve-sided" },
  { weight: 5, diameter: 230, thickness: 32, shape: "twelve-sided" },
  { weight: 2.5, diameter: 200, thickness: 23, shape: "twelve-sided" },
  { weight: 1.25, diameter: 160, thickness: 16, shape: "twelve-sided" },
];

const yorkStandardLb: PlateSpec[] = [
  { weight: 25, diameter: 279, thickness: 35, shape: "round" },
  { weight: 10, diameter: 197, thickness: 25, shape: "round" },
  { weight: 5, diameter: 146, thickness: 25, shape: "round" },
  { weight: 2.5, diameter: 117, thickness: 22, shape: "round" },
];

const quickLock: PlateSpec[] = [
  { weight: 22.5, diameter: 170, thickness: 47.6, shape: "square" },
  { weight: 5, diameter: 170, thickness: 12.7, shape: "square" },
  { weight: 2.5, diameter: 170, thickness: 6.35, shape: "square" },
  { weight: 1.25, diameter: 127, thickness: 6.35, shape: "round" },
];

const vestBlock: PlateSpec[] = [{ weight: 1, diameter: 60, thickness: 95, shape: "block" }];
const carrierPlate: PlateSpec[] = [{ weight: 5.75, diameter: 250, thickness: 300, shape: "block" }];

const spring: HardwareSpec = { name: "Spring collar", kind: "collar", style: "spring", width: 25 };
const clamp: HardwareSpec = { name: "Lock-jaw collar", kind: "collar", style: "clamp", width: 32 };
const spinlock: HardwareSpec = { name: "Spin-lock collar", kind: "collar", style: "spinlock", width: 40 };
const longScrew: HardwareSpec = { name: "Long locking screw", kind: "screw", style: "screw", width: 12.7 };
const pin: HardwareSpec = { name: "Locking pin", kind: "pin", style: "pin", width: 8 };

export const scenarios: Scenario[] = [
  {
    id: "olympic-bar",
    label: "Olympic bar, calibrated kg",
    implementName: "Olympic bar",
    kind: "bar",
    picture: "bar",
    unit: "kg",
    positionLength: 415,
    plates: eleikoIpf,
    positions: [{ name: "Each side", plates: [25, 20, 15, 5] }],
    hardware: spring,
    total: "150 kg",
    source: "Eleiko IPF plates, colours in the file",
  },
  {
    id: "ez",
    label: "EZ curl bar, cast iron lb",
    implementName: "EZ curl bar",
    kind: "bar",
    picture: "ez",
    unit: "lb",
    positionLength: 267,
    plates: rogueCastLb,
    positions: [{ name: "Each side", plates: [25, 10, 5, 2.5] }],
    hardware: clamp,
    total: "105 lb",
    source: "Rogue Olympic cast iron, no colours in the file",
  },
  {
    id: "swiss",
    label: "Swiss bar, bumpers lb",
    implementName: "Swiss bar",
    kind: "bar",
    picture: "swiss",
    unit: "lb",
    positionLength: 280,
    plates: rogueEchoLb,
    positions: [{ name: "Each side", plates: [45, 25, 10] }],
    total: "195 lb",
    source: "Rogue Echo bumpers, no hardware",
  },
  {
    id: "trap",
    label: "Trap bar, bumpers kg",
    implementName: "Trap bar",
    kind: "bar",
    picture: "trap",
    unit: "kg",
    positionLength: 254,
    plates: rogueColourEchoKg,
    positions: [{ name: "Each side", plates: [20, 20, 10, 5] }],
    hardware: clamp,
    total: "140 kg",
    source: "Rogue Color Echo bumpers, every plate 450 mm, no colours in the file",
  },
  {
    id: "safety-squat",
    label: "Safety squat bar, deep dish kg",
    implementName: "Safety squat bar",
    kind: "bar",
    picture: "safety-squat",
    unit: "kg",
    positionLength: 406,
    plates: mirafitDeepDish,
    positions: [{ name: "Each side", plates: [25, 20, 10, 5, 2.5, 1.25] }],
    hardware: spring,
    total: "152.5 kg",
    source: "Mirafit black deep dish, twelve-sided",
  },
  {
    id: "standard-bar",
    label: "Standard 1 in bar, spin-lock",
    implementName: "Standard bar",
    kind: "bar",
    picture: "bar",
    unit: "lb",
    positionLength: 178,
    plates: yorkStandardLb,
    positions: [{ name: "Each side", plates: [25, 10, 5, 2.5] }],
    hardware: spinlock,
    total: "100 lb",
    source: "York 1 in contour plates",
  },
  {
    id: "ironmaster-dumbbell",
    label: "Ironmaster dumbbell (owner)",
    implementName: "Dumbbell",
    kind: "handle",
    picture: "handle",
    unit: "lb",
    positionLength: 130,
    plates: quickLock,
    positions: [
      { name: "Left end", plates: [22.5, 22.5, 5, 5, 5, 2.5, 1.25] },
      { name: "Right end", plates: [22.5, 22.5, 5, 5, 5, 2.5, 1.25] },
    ],
    hardware: longScrew,
    total: "137.5 lb",
    source: "The owner's Quick-Lock plates, square",
  },
  {
    id: "olympic-handle",
    label: "Loadable Olympic handle, cast iron lb",
    implementName: "Dumbbell handle",
    kind: "handle",
    picture: "handle",
    unit: "lb",
    positionLength: 150,
    maxPlateDiameter: 280,
    plates: rogueCastLb,
    positions: [
      { name: "Left end", plates: [10, 5, 2.5] },
      { name: "Right end", plates: [10, 5, 2.5] },
    ],
    hardware: spring,
    total: "41 lb",
    source: "A 2 in loadable handle",
  },
  {
    id: "kettlebell",
    label: "Loadable kettlebell, cast iron lb",
    implementName: "Loadable kettlebell",
    kind: "stack",
    picture: "kettlebell",
    unit: "lb",
    positionLength: 190,
    maxPlateDiameter: 280,
    plates: rogueCastLb,
    positions: [{ name: "Stack", plates: [10, 10, 5] }],
    hardware: pin,
    total: "45 lb",
    source: "Titan or Rogue loadable kettlebell with a locking pin",
  },
  {
    id: "dip-belt",
    label: "Dip belt, deep dish kg",
    implementName: "Dip belt",
    kind: "stack",
    picture: "dip-belt",
    unit: "kg",
    positionLength: 600,
    plates: mirafitDeepDish,
    positions: [{ name: "Chain", plates: [20, 10] }],
    total: "30 kg",
    source: "Plates on a chain, no hardware",
  },
  {
    id: "landmine",
    label: "Landmine, calibrated kg",
    implementName: "Landmine",
    kind: "stack",
    picture: "landmine",
    unit: "kg",
    positionLength: 415,
    plates: eleikoIpf,
    positions: [{ name: "Sleeve", plates: [20, 10, 5] }],
    hardware: clamp,
    total: "55 kg",
    note: "The felt load is less than the plates and bar weigh.",
    source: "An Olympic bar in a pivot tube, one sleeve loaded",
  },
  {
    id: "leg-press",
    label: "Leg press, cast iron lb",
    implementName: "Leg press",
    kind: "stack",
    picture: "leg-press",
    unit: "lb",
    positionLength: 280,
    plates: rogueCastLb,
    positions: [{ name: "Peg", plates: [45, 45, 25, 10] }],
    total: "125 lb",
    source: "A plate-loaded carriage, one peg drawn",
  },
  {
    id: "leg-attachment",
    label: "Leg attachment (owner)",
    implementName: "Leg attachment",
    kind: "stack",
    picture: "stack",
    unit: "lb",
    positionLength: 267,
    plates: quickLock,
    positions: [{ name: "Stack", plates: [22.5, 5, 5, 2.5] }],
    total: "35 lb",
    source: "The owner's Ironmaster leg attachment: the stack default",
  },
  {
    id: "vest",
    label: "Weighted vest (owner)",
    implementName: "Weighted vest",
    kind: "vest",
    picture: "vest",
    unit: "kg",
    positionLength: 0,
    plates: vestBlock,
    positions: [
      { name: "Front", plates: [1, 1, 1, 1, 1, 1] },
      { name: "Back", plates: [1, 1, 1, 1, 1, 1, 1] },
    ],
    total: "13 kg",
    source: "The owner's Mirafit vest, 1 kg blocks",
  },
  {
    id: "carrier",
    label: "Plate carrier",
    implementName: "Plate carrier",
    kind: "vest",
    picture: "vest",
    unit: "lb",
    positionLength: 0,
    plates: carrierPlate,
    positions: [
      { name: "Front", plates: [5.75] },
      { name: "Back", plates: [5.75] },
    ],
    total: "11.5 lb",
    source: "Rogue carrier plates, one per pocket",
  },
];

export function plateSpec(scenario: Scenario, weight: number): PlateSpec {
  return scenario.plates.find((plate) => plate.weight === weight) ?? scenario.plates[0]!;
}

// Colours

export type ColourRule = "file" | "standards" | "rank" | "mono";

export const colourRules: { id: ColourRule; label: string; detail: string }[] = [
  { id: "file", label: "File", detail: "The plate's colour field; steel grey when the file has none." },
  { id: "standards", label: "Standards", detail: "The file's colour, else IWF colours for kg weights and the common bumper colours for lb (unverified), else rank." },
  { id: "rank", label: "Rank", detail: "The file's colour, else a fixed palette by weight order within the kit: heaviest red, then blue, yellow, green…" },
  { id: "mono", label: "Mono", detail: "Steel for every plate; the label carries the weight." },
];

export interface PlateColour {
  fill: string;
  ink: string;
}

const dark = "#16191d";
const light = "#ffffff";
const steel: PlateColour = { fill: "#6f7780", ink: light };

const palette: PlateColour[] = [
  { fill: "#c9353f", ink: light },
  { fill: "#2f67cc", ink: light },
  { fill: "#e8b923", ink: dark },
  { fill: "#1c8a55", ink: light },
  { fill: "#e9e9e9", ink: dark },
  { fill: "#7a4fc4", ink: light },
  { fill: "#d8731d", ink: light },
  { fill: "#1f8f8f", ink: light },
  { fill: "#a4521f", ink: light },
  { fill: "#6f7780", ink: light },
];

const iwfKg: Record<string, PlateColour> = {
  "25": palette[0]!,
  "20": palette[1]!,
  "15": palette[2]!,
  "10": palette[3]!,
  "5": palette[4]!,
  "2.5": palette[0]!,
  "2": palette[1]!,
  "1.5": palette[2]!,
  "1": palette[3]!,
  "0.5": palette[4]!,
};

const bumperLb: Record<string, PlateColour> = {
  "45": palette[1]!,
  "35": palette[2]!,
  "25": palette[3]!,
  "15": { fill: "#2a2d31", ink: light },
  "10": palette[4]!,
};

function inkFor(fill: string): string {
  const hex = fill.replace("#", "");
  if (hex.length !== 6) return light;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return (r! * 299 + g! * 587 + b! * 114) / 1000 > 150 ? dark : light;
}

export function colourFor(scenario: Scenario, weight: number, rule: ColourRule): PlateColour {
  if (rule === "mono") return steel;
  const spec = plateSpec(scenario, weight);
  if (spec.colour) return { fill: spec.colour, ink: inkFor(spec.colour) };
  if (rule === "file") return steel;
  if (rule === "standards") {
    const table = scenario.unit === "kg" ? iwfKg : bumperLb;
    const hit = table[String(weight)];
    if (hit) return hit;
  }
  const rank = scenario.plates.findIndex((plate) => plate.weight === weight);
  return palette[Math.max(0, rank) % palette.length]!;
}
