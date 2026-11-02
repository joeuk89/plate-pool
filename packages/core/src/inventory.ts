export type Unit = "lb" | "kg";

export type LengthUnit = "in" | "mm";

export type Status = "verified" | "owner" | "unverified";

export type Bore = "olympic" | "standard" | "quick-lock" | "block";

export type Shape = "square" | "round" | "hexagonal" | "twelve-sided" | "block";

export type HardwareKind = "screw" | "collar" | "pin";

export type ImplementKind = "bar" | "handle" | "stack" | "vest";

export interface Value {
  listed: number;
  measured?: number;
  status: Status;
  note?: string;
}

export interface PlateType {
  id: string;
  name: string;
  unit: Unit;
  bore: Bore;
}

export interface Plate {
  id: string;
  name?: string;
  type: string;
  count: number;
  countStatus?: Status;
  weight: Value;
  stackLength?: Value;
  diameter?: number;
  colour?: string;
  shape: Shape;
}

export interface Hardware {
  id: string;
  name: string;
  kind: HardwareKind;
  count: number;
  unit: Unit;
  weight: Value;
  capacity?: number;
  minStack?: Value;
  width?: number;
  note?: string;
}

export interface ImplementHardware {
  options: string[];
  default?: string;
  perPosition: number;
}

export interface Implement {
  id: string;
  name: string;
  kind: ImplementKind;
  count: number;
  unit: Unit;
  base: Value;
  accepts: string[];
  hardware?: ImplementHardware;
  positionLength?: Value;
  unevenAllowance?: number;
  unevenAllowanceRelaxed?: number;
  maxPlateDiameter?: number;
  maxPerPosition?: Record<string, number>;
  maxPlateWeight?: number;
  maxTotal?: number;
  note?: string;
  baseIncludesHardware?: boolean;
}

export interface Inventory {
  $schema?: string;
  format: 1;
  name: string;
  lengthUnit: LengthUnit;
  plateTypes: PlateType[];
  plates: Plate[];
  hardware: Hardware[];
  implements: Implement[];
}
