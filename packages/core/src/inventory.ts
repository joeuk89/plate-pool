export type Unit = "lb" | "kg";

export type Status = "verified" | "owner" | "unverified";

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
}

export interface Plate {
  id: string;
  name: string;
  type: string;
  count: number;
  countStatus?: Status;
  weight: Value;
  stackLengthIn?: Value;
  shape: "square" | "round" | "block";
}

export interface Hardware {
  id: string;
  name: string;
  kind: "screw" | "collar";
  count: number;
  unit: Unit;
  weight: Value;
  capacityIn?: number;
  minStackIn?: Value;
  widthIn?: number;
}

export interface ImplementHardware {
  options: string[];
  default?: string;
  perPosition: number;
}

export interface Implement {
  id: string;
  name: string;
  count: number;
  unit: Unit;
  base: Value;
  positions: string[];
  symmetric?: boolean;
  accepts: string[];
  hardware?: ImplementHardware;
  maxPlateWeight?: number;
  maxTotal?: number;
  positionLengthIn?: Value;
}

export interface Inventory {
  plateTypes: PlateType[];
  plates: Plate[];
  hardware: Hardware[];
  implements: Implement[];
}
