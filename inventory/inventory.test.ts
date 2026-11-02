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

describe("format 1 (spec 17.3.1)", () => {
  it("states format 1, the kit's name and inches as its length unit", () => {
    expect(inventory).toMatchObject({ $schema: "./inventory.schema.json", format: 1, name: "Home gym", lengthUnit: "in" });
  });
});

describe("plates (inventory/README.md)", () => {
  it.each([
    ["ql-22.5", 5, 22.5, 1.875, "#c9353f", "square"],
    ["ql-5", 24, 5, 0.5, "#2f67cc", "square"],
    ["ql-2.5", 4, 2.5, 0.25, "#1c8a55", "square"],
  ])("%s is a 6.7 in Quick-Lock plate named by weight, with a verified weight and an unverified stack length", (id, count, weight, stackLength, colour, shape) => {
    expect(byId(inventory.plates, id)).toEqual({
      id,
      type: "quick-lock",
      count,
      weight: { listed: weight, status: "verified" },
      stackLength: { listed: stackLength, status: "unverified" },
      diameter: 6.7,
      colour,
      shape,
    });
  });

  it("names the micro plate Micro and draws it 5 in across", () => {
    expect(byId(inventory.plates, "ql-micro")).toEqual({
      id: "ql-micro",
      name: "Micro",
      type: "quick-lock",
      count: 4,
      weight: { listed: 1.25, status: "verified" },
      stackLength: { listed: 0.25, status: "unverified" },
      diameter: 5,
      colour: "#7a4fc4",
      shape: "round",
    });
  });

  it("holds 30 vest blocks of 1 kg, with the weight verified and the count unverified", () => {
    expect(byId(inventory.plates, "vest-block")).toEqual({
      id: "vest-block",
      type: "vest-block",
      count: 30,
      countStatus: "unverified",
      weight: { listed: 1, status: "verified" },
      colour: "#a4521f",
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
      { id: "quick-lock", name: "Ironmaster Quick-Lock", unit: "lb", bore: "quick-lock" },
      { id: "vest-block", name: "Mirafit vest block", unit: "kg", bore: "block" },
    ]);
  });
});

describe("locking hardware (inventory/README.md)", () => {
  it("holds 4 standard locking screws of 2.5 lb, verified, holding 3.25 in of plates", () => {
    expect(byId(inventory.hardware, "screw-standard")).toEqual({
      id: "screw-standard",
      name: "Standard locking screw",
      kind: "screw",
      count: 4,
      unit: "lb",
      weight: { listed: 2.5, status: "verified" },
      capacity: 3.25,
    });
  });

  it("holds 5 long locking screws counted as 2.5 lb, holding 5.125 in, locking on at least 3.0 in, with a note for fallback", () => {
    expect(byId(inventory.hardware, "screw-long")).toEqual({
      id: "screw-long",
      name: "Long locking screw",
      kind: "screw",
      count: 5,
      unit: "lb",
      weight: { listed: 2.5, status: "verified", note: "Real weight is about 3 lb" },
      capacity: 5.125,
      minStack: { listed: 3, status: "unverified", note: "On a dumbbell end" },
      note: "It may stick out at the top, which Ironmaster's manual calls normal.",
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
      width: 1.26,
    });
  });

  it("holds nothing beyond the four rows of the README", () => {
    expect(inventory.hardware.map((item: any) => item.id).sort()).toEqual([
      "collar-clamp",
      "collar-spinlock",
      "screw-long",
      "screw-standard",
    ]);
  });
});

describe("implements (inventory/README.md and spec 17.3.7)", () => {
  it("holds the straight bar: 18 lb confirmed by the owner, collars extra, 2 sides of 11.5 in, 210 lb of plates", () => {
    expect(byId(inventory.implements, "barbell")).toEqual({
      id: "barbell",
      name: "Straight bar",
      kind: "bar",
      count: 1,
      unit: "lb",
      base: {
        listed: 18,
        status: "owner",
        note: "Ironmaster states about 18 lb. The owner weighed it at 17.7 lb with its collars off and counts it as 18 lb. Collars are added.",
      },
      accepts: ["quick-lock"],
      hardware: {
        options: ["collar-clamp", "collar-spinlock", "none"],
        default: "collar-clamp",
        perPosition: 1,
      },
      maxPlateWeight: 210,
      maxPerPosition: { "ql-micro": 1 },
      positionLength: { listed: 11.5, status: "verified", note: "For plates and the collar" },
    });
  });

  it("holds 2 dumbbells: 5 lb handle, one screw per end, up to 120 lb, ends within 2.5 lb or 5 lb with no small plate free", () => {
    expect(byId(inventory.implements, "dumbbell")).toEqual({
      id: "dumbbell",
      name: "Dumbbell",
      kind: "handle",
      count: 2,
      unit: "lb",
      base: { listed: 5, status: "verified", note: "Handle only. Two screws make it 10 lb." },
      accepts: ["quick-lock"],
      hardware: { options: ["screw-standard", "screw-long", "none"], perPosition: 1 },
      maxTotal: 120,
      maxPerPosition: { "ql-micro": 1 },
      unevenAllowance: 2.5,
      unevenAllowanceRelaxed: 5,
    });
  });

  it("holds the kettlebell: 22.5 lb handle, one screw, up to 80 lb, one micro and one 22.5 lb plate at most", () => {
    expect(byId(inventory.implements, "kettlebell")).toEqual({
      id: "kettlebell",
      name: "Kettlebell",
      kind: "stack",
      count: 1,
      unit: "lb",
      base: { listed: 22.5, status: "verified", note: "Handle only. One screw makes it 25 lb." },
      accepts: ["quick-lock"],
      hardware: { options: ["screw-standard", "screw-long", "none"], perPosition: 1 },
      maxTotal: 80,
      maxPerPosition: { "ql-micro": 1, "ql-22.5": 1 },
    });
  });

  it("holds the leg attachment: plate weight only, no locking hardware, 100 lb of plates, with its fixed note", () => {
    expect(byId(inventory.implements, "leg")).toEqual({
      id: "leg",
      name: "Leg attachment",
      kind: "stack",
      count: 1,
      unit: "lb",
      base: {
        listed: 0,
        status: "verified",
        note: "Plate weight only. The lever's weight is not published and is not counted.",
      },
      accepts: ["quick-lock"],
      maxPlateWeight: 100,
      note: "Plate weight only. The lever changes the resistance you feel.",
    });
  });

  it("holds the weighted vest: 0 kg unverified, vest blocks, 30 kg of plates", () => {
    expect(byId(inventory.implements, "vest")).toEqual({
      id: "vest",
      name: "Weighted vest",
      kind: "vest",
      count: 1,
      unit: "kg",
      base: { listed: 0, status: "unverified", note: "The empty vest's weight is not published." },
      accepts: ["vest-block"],
      maxPlateWeight: 30,
    });
  });

  it("holds nothing beyond the five rows of the README", () => {
    expect(inventory.implements.map((implement: any) => implement.id)).toEqual([
      "barbell",
      "dumbbell",
      "kettlebell",
      "leg",
      "vest",
    ]);
  });
});
