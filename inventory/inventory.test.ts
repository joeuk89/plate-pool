import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const inventoryText = readFileSync(new URL("./inventory.json", import.meta.url), "utf8");
const inventory = JSON.parse(inventoryText);

function byId(list: { id: string }[], id: string) {
  const item = list.find((entry) => entry.id === id);
  expect(item, `no entry with id "${id}"`).toBeDefined();
  return item as any;
}

const month =
  "(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(t(ember)?)?|oct(ober)?|nov(ember)?|dec(ember)?)";

const personalData: [string, RegExp][] = [
  ["prices", /[£$€]\s?\d|\b(price|cost|paid)\b/i],
  [
    "dates",
    new RegExp(
      String.raw`\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}/\d{1,2}/\d{2,4}\b|\b(19|20)\d{2}\b|\b${month}\.?\s+\d|\b\d{1,2}(st|nd|rd|th)?\s+${month}\b`,
      "i",
    ),
  ],
  ["order numbers", /\border\s*(no\b|number|#|id\b|ref)|\binvoice\b|\bsku\b/i],
  ["addresses and phone numbers", /\b(street|road|avenue|postcode)\b|\+?\d[\d\s]{8,}\d/i],
];

describe("equipment only (spec section 5)", () => {
  it.each(personalData)("holds no %s", (_, pattern) => {
    expect(inventoryText).not.toMatch(pattern);
  });

  it.each([
    ["dates", "Bought 1 January"],
    ["dates", "Arrived in May 2000"],
    ["dates", "Delivered 1/1/00"],
    ["order numbers", "Order no. 12345"],
    ["prices", "Paid £1"],
  ])("detects %s in %j", (kind, text) => {
    const pattern = personalData.find(([name]) => name === kind)?.[1];
    expect(text).toMatch(pattern!);
  });

  it.each([
    "The screw may stick out at the top",
    "Marked in both pounds and kilograms",
    "Order on a position: heaviest plate innermost",
    "Separate from the handle",
  ])("lets ordinary equipment notes through: %j", (text) => {
    for (const [, pattern] of personalData) expect(text).not.toMatch(pattern);
  });
});

describe("plates (spec table 4.1)", () => {
  it.each([
    ["ql-22.5", "22.5 lb", 5, 22.5, 1.875, "square"],
    ["ql-5", "5 lb", 24, 5, 0.5, "square"],
    ["ql-2.5", "2.5 lb", 4, 2.5, 0.25, "square"],
    ["ql-micro", "Micro", 4, 1.25, 0.25, "round"],
  ])("%s is a Quick-Lock plate with a verified weight and an unverified stack length", (id, name, count, weight, stackLength, shape) => {
    expect(byId(inventory.plates, id)).toEqual({
      id,
      name,
      type: "quick-lock",
      count,
      weight: { listed: weight, status: "verified" },
      stackLengthIn: { listed: stackLength, status: "unverified" },
      shape,
    });
  });

  it("holds 30 vest blocks of 1 kg, with the weight verified and the count unverified", () => {
    expect(byId(inventory.plates, "vest-block")).toEqual({
      id: "vest-block",
      name: "Vest block",
      type: "vest-block",
      count: 30,
      countStatus: "unverified",
      weight: { listed: 1, status: "verified" },
      shape: "block",
    });
  });

  it("holds Quick-Lock plates totalling 247.5 lb", () => {
    const quickLock = inventory.plates.filter((plate: any) => plate.type === "quick-lock");
    const total = quickLock.reduce((sum: number, plate: any) => sum + plate.count * plate.weight.listed, 0);
    expect(total).toBe(247.5);
  });

  it("names the plate types as data, with Quick-Lock in pounds and the vest block in kilograms", () => {
    expect(inventory.plateTypes).toEqual([
      { id: "quick-lock", name: "Ironmaster Quick-Lock", unit: "lb" },
      { id: "vest-block", name: "Mirafit vest block", unit: "kg" },
    ]);
  });
});

describe("locking hardware (spec table 4.2)", () => {
  it("holds 4 standard locking screws of 2.5 lb, verified, holding 3.25 in of plates", () => {
    expect(byId(inventory.hardware, "screw-standard")).toEqual({
      id: "screw-standard",
      name: "Standard locking screw",
      kind: "screw",
      count: 4,
      unit: "lb",
      weight: { listed: 2.5, status: "verified" },
      capacityIn: 3.25,
    });
  });

  it("holds 5 long locking screws counted as 2.5 lb, holding 5.125 in and locking on at least 3.0 in", () => {
    expect(byId(inventory.hardware, "screw-long")).toEqual({
      id: "screw-long",
      name: "Long locking screw",
      kind: "screw",
      count: 5,
      unit: "lb",
      weight: { listed: 2.5, status: "verified", note: "Real weight is about 3 lb" },
      capacityIn: 5.125,
      minStackIn: { listed: 3, status: "unverified", note: "On a dumbbell end" },
    });
  });

  it("holds 2 Ironmaster spin-lock collars the owner counts as 1 lb each", () => {
    expect(byId(inventory.hardware, "collar-spinlock")).toEqual({
      id: "collar-spinlock",
      name: "Ironmaster spin-lock collar",
      kind: "collar",
      count: 2,
      unit: "lb",
      weight: {
        listed: 0,
        measured: 1,
        status: "owner",
        note: "Weighed at 433 g (0.95 lb) on a kitchen scale and counted as 1 lb. Ironmaster publishes no collar weight.",
      },
    });
  });

  it("holds 4 Mirafit clamp collars that count as 0 lb, 1.26 in wide", () => {
    expect(byId(inventory.hardware, "collar-clamp")).toEqual({
      id: "collar-clamp",
      name: 'Mirafit 1" clamp collar',
      kind: "collar",
      count: 4,
      unit: "lb",
      weight: { listed: 0, status: "owner", note: "Nylon. Weighs next to nothing, so it counts as 0." },
      widthIn: 1.26,
    });
  });

  it("holds nothing beyond the four rows of table 4.2", () => {
    expect(inventory.hardware.map((item: any) => item.id).sort()).toEqual([
      "collar-clamp",
      "collar-spinlock",
      "screw-long",
      "screw-standard",
    ]);
  });
});

describe("implements (spec table 4.3)", () => {
  it("holds the straight bar: 18 lb confirmed by the owner, collars extra, 2 sides of 11.5 in, 210 lb of plates", () => {
    expect(byId(inventory.implements, "barbell")).toEqual({
      id: "barbell",
      name: "Straight bar",
      count: 1,
      unit: "lb",
      base: {
        listed: 18,
        status: "owner",
        note: "Ironmaster states about 18 lb. The owner weighed it at 17.7 lb with its collars off and counts it as 18 lb. Collars are added.",
      },
      positions: ["left", "right"],
      symmetric: true,
      accepts: ["quick-lock"],
      hardware: {
        options: ["collar-clamp", "collar-spinlock", "none"],
        default: "collar-clamp",
        perPosition: 1,
      },
      maxPlateWeight: 210,
      positionLengthIn: { listed: 11.5, status: "verified", note: "For plates and the collar" },
    });
  });

  it("holds 2 dumbbells: 5 lb handle, 2 ends, one screw per end, up to 120 lb", () => {
    expect(byId(inventory.implements, "dumbbell")).toEqual({
      id: "dumbbell",
      name: "Dumbbell",
      count: 2,
      unit: "lb",
      base: { listed: 5, status: "verified", note: "Handle only. Two screws make it 10 lb." },
      positions: ["end-a", "end-b"],
      symmetric: false,
      accepts: ["quick-lock"],
      hardware: { options: ["screw-standard", "screw-long", "none"], perPosition: 1 },
      maxTotal: 120,
    });
  });

  it("holds the kettlebell: 22.5 lb handle, 1 stack, one screw, up to 80 lb", () => {
    expect(byId(inventory.implements, "kettlebell")).toEqual({
      id: "kettlebell",
      name: "Kettlebell",
      count: 1,
      unit: "lb",
      base: { listed: 22.5, status: "verified", note: "Handle only. One screw makes it 25 lb." },
      positions: ["stack"],
      accepts: ["quick-lock"],
      hardware: { options: ["screw-standard", "screw-long", "none"], perPosition: 1 },
      maxTotal: 80,
    });
  });

  it("holds the leg attachment: plate weight only, 1 stack, no locking hardware, 100 lb of plates", () => {
    expect(byId(inventory.implements, "leg")).toEqual({
      id: "leg",
      name: "Leg attachment",
      count: 1,
      unit: "lb",
      base: {
        listed: 0,
        status: "verified",
        note: "Plate weight only. The lever's weight is not published and is not counted.",
      },
      positions: ["stack"],
      accepts: ["quick-lock"],
      maxPlateWeight: 100,
    });
  });

  it("holds the weighted vest: 0 kg unverified, front and back, vest blocks, 30 blocks", () => {
    expect(byId(inventory.implements, "vest")).toEqual({
      id: "vest",
      name: "Weighted vest",
      count: 1,
      unit: "kg",
      base: { listed: 0, status: "unverified", note: "The empty vest's weight is not published." },
      positions: ["front", "back"],
      symmetric: false,
      accepts: ["vest-block"],
      maxPlateWeight: 30,
    });
  });

  it("holds nothing beyond the five rows of table 4.3", () => {
    expect(inventory.implements.map((implement: any) => implement.id)).toEqual([
      "barbell",
      "dumbbell",
      "kettlebell",
      "leg",
      "vest",
    ]);
  });
});
