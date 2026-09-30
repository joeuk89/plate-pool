# Equipment specs for the plate calculator

Researched 2026-09-29. Primary unit is lb, with kg in brackets.

## How to read this file

Each fact carries a status:

- **VERIFIED** — stated on a manufacturer or distributor page, or in a manufacturer manual.
- **SECONDARY** — stated in a review or a customer comment.
- **DERIVED** — calculated here from VERIFIED figures. The arithmetic is shown. No source states the number itself.
- **UNKNOWN** — no source found.
- **OWNER** — confirmed by the owner on their own equipment.

Ironmaster designs every Quick-Lock weight in lb. The kg figures on UK pages are rounded conversions. The manufacturer says the plates are "marked in both pounds (LBS) and kilograms (KGS)" and that "weights listed are design estimates. Actual weights may vary slightly depending on casting density" ([US-45], [M-QLDB]). The Mirafit vest is kg-denominated.

The manufacturer counts every locking screw as 2.5 lb for weight maths, including the long screw that weighs about 3 lb ([US-LONG]). The app must choose between nominal weights and true weights. See [Open questions](#4-open-questions).

## 1. Summary table

| # | Product | Pieces (qty × weight) | Empty weight | Min–max | Increment | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Quick-Lock Dumbbell Set 45 lb | 2 × handle 5 lb; 4 × standard screw 2.5 lb; 12 × 5 lb plate; 4 × 2.5 lb plate | Handle 5 lb (2.27 kg); handle + 2 screws 10 lb (4.54 kg) | 5–45 lb (2.27–20.4 kg) per dumbbell | 2.5 lb (1.13 kg) | VERIFIED |
| 2 | 75 lb Upgrade Kit (SKU 1017) | 12 × 5 lb plate. No screws | n/a | Raises each dumbbell to 75 lb (34.0 kg) | 5 lb plates only | VERIFIED |
| 3 | Add-On Kit 120 lb (SKU 120) | 4 × 22.5 lb plate; 4 × long screw (about 3 lb true, 2.5 lb nominal) | n/a | Raises each dumbbell to 120 lb (54.4 kg) | n/a | VERIFIED; true screw weight approximate |
| 4 | Straight Barbell Bar (SKU 1043) | 1 × bar "about 18 lb"; 2 × spin-lock collar, weight UNKNOWN | About 18 lb (8.16 kg). Whether that includes the collars is UNKNOWN | 18–228 lb (8.16–103.4 kg) | 5 lb with a 2.5 lb plate each side; 2.5 lb with a micro plate each side (fit is OWNER) | VERIFIED, with conflicting bar weights |
| 5 | Kettlebell Handle 22.5 (SKU 1050) | 1 × handle 22.5 lb. No screw, no plates | 22.5 lb (10.2 kg) bare; 25 lb (11.3 kg) with one screw | 22.5–57.5 lb standard screw; to 80 lb (36.3 kg) long screw | 2.5 lb (1.13 kg) | VERIFIED |
| 6 | Kettlebell Weight Kit 80 lb (SKU 1068) | 1 × 22.5 lb plate; 1 × long screw | n/a | Raises kettlebell to 80 lb (36.3 kg) | n/a | VERIFIED |
| 7 | Micro Plate Kit (SKU 1202) | 4 × 1.25 lb (0.57 kg) round plate | n/a | Adds 1.25 lb per plate | 1.25 lb (0.57 kg) | VERIFIED; fit on the Straight Bar and dumbbells is OWNER |
| 8 | Leg Attachment PRO (SKU 1024) | Accepts Quick-Lock, standard 1" and Olympic plates | Lever weight UNKNOWN | Rated 200 lb (90.7 kg); Quick-Lock plates up to 100 lb (45.4 kg) | n/a | VERIFIED |
| 9 | Mirafit Adjustable Weighted Vest 30 kg | 1 kg cast iron blocks, "up to thirty" | Empty vest weight UNKNOWN | Up to 30 kg (66.1 lb) | 1 kg (2.2 lb) | VERIFIED for block size; block count from a Mirafit blog |
| 10 | Mirafit M130 Adjustable Squat & Bench Press Rack | Holds no plates of its own. 2 barbell rests, 2 spotter bars, 2 storage poles | n/a | Max load UNKNOWN for the M130. Total width 78–123 cm (30.7–48.4") | 10 width settings | VERIFIED for width; load rating not published |
| 11 | Mirafit 1" Standard Weight Bar Clamp Collars, orange, 2 pairs | 4 × nylon clamp collar, weight UNKNOWN | n/a | Max load not stated | n/a | Width 3.2 cm (1.26") is SECONDARY, from Mirafit's image on Amazon UK; weight not published |

## 2. Product detail

### 2.1 Quick-Lock Dumbbell Set 45 lb (20 kg), no rack

**Contents**

- 2 handles, 4 standard locking screws, 12 × 5 lb plates, 4 × 2.5 lb plates. VERIFIED ([US-45], [M-QLDB], [UK-45], [WB-45-2019]).
- The 2019 UK listing, live when the owner bought, lists the same contents. VERIFIED ([WB-45-2019]).

**Weights**

- Handle: 5 lb (2.27 kg). Standard locking screw: 2.5 lb (1.13 kg). Base per dumbbell: 10 lb (4.54 kg). VERIFIED ([US-45], [M-QLDB], [WB-45-2019]).
- Conflict: the UK handle-set page says "3.5 kg handle + 1 kg screws (4.5 kg / 10 lb total)" and, in its FAQ, "Without plates each dumbbell weighs 2 kg" ([UK-HANDLE]). The total agrees with the manufacturer. The split does not. The UK 57.5 lb kettlebell kit page says the standard screw "weighs 1 kg" ([UK-KB57]); the UK screw page says 2.5 lb (1.1 kg) ([UK-STD]). Treat the manufacturer manual as correct.

**Range and increment**

- 5–45 lb per dumbbell in 2.5 lb steps. VERIFIED ([US-45]).
- The 5 lb minimum is the bare handle with no screws. With both screws and no plates the dumbbell weighs 10 lb. VERIFIED ([M-QLDB]).
- The UK page states the range as "2–20 kg (4.4–45 lbs)" ([UK-45]). This is a rounded conversion.

**Standard screw capacity**

- Maximum per end: six 5 lb plates plus one 2.5 lb plate, 7 plates, 32.5 lb (14.7 kg). That gives 75 lb per dumbbell. VERIFIED ([M-QLDB], [M-MICRO], [US-STD]).

**Loading rules**

- Stack all plates the same way, with the "Ironmaster" name facing out. VERIFIED ([M-QLDB]).
- "Use any combination of 5 lb and 2.5 lb plates on each end." No rule on plate order for these two sizes. VERIFIED ([M-QLDB]).
- Asymmetric loading is official. The manual says: "To make a small 2½ lb incremental weight change, simply add one 2½ lb plate to one end of the handle and position your hand slightly closer to the heavier end." It adds: "It is not recommended to use more than one plate offset." VERIFIED ([M-QLDB]).
- Weight formula: plates on one end × 2 + 10 lb. VERIFIED ([M-QLDB]).

**Dimensions**

- Plates: 6.7" square (17.0 cm). VERIFIED ([US-45], [US-75KIT]).
- Conflict: UK and EU pages give 6.5" or 16.5 cm ([WB-45-2019], [EU-PLATES]). The current UK page says "6.7" × 6.7" (16.5 cm x 16.5 cm)", which contradicts itself ([UK-75KIT]).
- Dumbbell length: 9" at 20 lb, 11.5" at 45 lb, 14.5" at 75 lb. VERIFIED ([US-45], [US-75SET]).
- Grip diameter 1.25" (3.2 cm). Inside grip width 6.5" (16.5 cm). VERIFIED ([US-45]).
- Locking screw: 4" diameter disc, 1" diameter partly threaded shaft. VERIFIED ([M-QLDB]).
- Locking screw head 0.5" deep with a 3.75" post. SECONDARY ([GG]).

**Plate thickness**

No manufacturer page states plate thickness. Two figures exist:

| Plate | Stacking pitch (DERIVED) | Single plate thickness (SECONDARY, [GG]) |
| --- | --- | --- |
| 5 lb | 0.5" (12.7 mm) | 0.6" |
| 2.5 lb | 0.25" (6.4 mm) | 0.4" |
| 22.5 lb | 1.875" (47.6 mm) | not given |

Stacking pitch is the length a plate adds to a stack. Plates nest into each other, so a lone plate measures thicker than its pitch. Use pitch to draw stacks.

Arithmetic, using manufacturer lengths and a 6.5" grip:

- 20 lb dumbbell: one 5 lb plate per end. (9 − 6.5) ÷ 2 = 1.25" per end.
- 45 lb dumbbell: three 5 lb + one 2.5 lb per end. (11.5 − 6.5) ÷ 2 = 2.5" per end.
- 75 lb dumbbell: six 5 lb + one 2.5 lb per end. (14.5 − 6.5) ÷ 2 = 4.0" per end.
- 75 lb minus 45 lb: three 5 lb plates add 1.5". So a 5 lb plate adds 0.5".
- 45 lb minus 20 lb: two 5 lb + one 2.5 lb add 1.25". So a 2.5 lb plate adds 0.25".
- Fixed part per end, backing plate plus screw head: 1.25 − 0.5 = 0.75".
- 120 lb dumbbell: 18.25" long ([US-120]). (18.25 − 6.5) ÷ 2 = 5.875" per end. Minus 0.75" fixed and 3.25" of small plates leaves 1.875" for the 22.5 lb plate.
- The 120 lb length is disputed. The archived UK page says 19" (48.5 cm) ([WB-120-2025]). That would make the 22.5 lb plate 2.25".

### 2.2 75 lb (34 kg) Quick-Lock Dumbbell Upgrade Kit (SKU 1017)

- Contents: 12 × 5 lb plates, 60 lb (27.2 kg) total. No screws, no handles. VERIFIED ([US-75KIT], [UK-75KIT], [WB-75KIT]).
- Adds 30 lb to each dumbbell. VERIFIED ([US-75KIT]).
- The 45 lb set's screws are the same part as the 75 lb set's screws. VERIFIED ([US-75KIT], [UK-75KIT]).
- After this kit the owner has the same plates as a 75 lb set: 24 × 5 lb and 4 × 2.5 lb. VERIFIED ([US-75KIT], [M-QLDB]).
- Range with standard screws: 5–75 lb per dumbbell in 2.5 lb steps. "65 lbs of plates can be loaded on each handle." VERIFIED ([US-75SET]).

### 2.3 Quick-Lock Add-On Kit 120 lb (54.4 kg) (SKU 120)

**Contents**

- 4 × 22.5 lb (10.2 kg) plates and 4 × long locking screws. VERIFIED ([US-120], [M-ADDON], [UK-120], [WB-120-2025]).

**Long locking screw**

- Weight: "about 3 lbs but we recommend considering it 2.5 lbs to make dumbbell weight calculations easier." VERIFIED ([US-LONG]).
- The UK pages give 1.5 kg (3.3 lb), counted as 2.5 lb. VERIFIED ([UK-LONG], [WB-LONG]).
- A customer reports the long screws are "nearly half a pound heavier than the standard locking screws". SECONDARY ([WB-KB-2024]).
- Capacity per screw: 1 × 22.5 lb + 6 × 5 lb + 1 × 2.5 lb = 55 lb (24.9 kg). VERIFIED ([UK-LONG], [WB-LONG]).
- Capacity without a 22.5 lb plate is disputed. See [2.5](#25-quick-lock-adjustable-kettlebell-handle-225-sku-1050).

**Range**

- Each dumbbell reaches 120 lb: 2 × 55 lb of plates + 10 lb nominal base. VERIFIED ([US-120], [M-ADDON]).
- Weight range for the long screws: "70-120lbs" ([US-120]). The manual says they hold plates "between the 75 lb and 120 lb size" ([M-ADDON]). Both VERIFIED. They disagree on the lower bound.
- True weight at a nominal 120 lb is about 121 lb, because each long screw weighs about 0.5 lb over nominal. DERIVED.
- A customer weighed a nominal 86 lb dumbbell at 38.9 kg (85.76 lb). SECONDARY ([WB-KB-2024]).

**Loading rules**

- "You can stack the weights in any order you like." VERIFIED ([M-ADDON]).
- Putting the 22.5 lb plates on first is "recommended", not required. VERIFIED ([US-120]).
- Worked examples from the manual: 100 lb = two 22.5 lb + eight 5 lb + two 2.5 lb per dumbbell. 115 lb = two 22.5 lb + twelve 5 lb per dumbbell. VERIFIED ([M-ADDON]).

**Other**

- The handles were "originally designed to hold up to 120 lbs only". VERIFIED ([US-165]).
- Ironmaster also sells this kit with eighteen 5 lb plates in place of the four 22.5 lb plates, on request. VERIFIED ([US-120]). This document assumes the standard contents.

### 2.4 Straight Barbell Bar (SKU 1043)

**Dimensions**

- Total length 66" (167.5 cm). VERIFIED ([US-BAR], [UK-BAR], [WB-BAR-2024]).
- Loadable ends 11.5" (29 cm) each. VERIFIED ([US-BAR], [WB-BAR-2024]).
- Inside grip area 42.5" (108 cm). VERIFIED ([US-BAR], [UK-BAR]).
- Bar diameter 1" (2.5 cm), knurled. VERIFIED ([US-BAR], [UK-BAR]).
- Backing plates welded to the bar stop the square plates rotating. VERIFIED ([WB-BAR-2024], [M-EZ]).

**Locking hardware**

- 2 spin-lock collars. These are threaded collars, not Quick-Lock screws. VERIFIED ([US-BAR], [UK-BAR], [EU-BAR]).
- Collar weight: 433 g (0.95 lb) each, weighed by the owner on a kitchen scale. The app counts 1 lb. OWNER. Ironmaster's US, UK and EU pages state no collar weight; the EZ Curl Bar page says only that the collars "are weighted to easily screw on and off".
- Collar thickness: UNKNOWN.

**Bar weight**

| Figure | Status | Source |
| --- | --- | --- |
| "about 18 lbs" (8 kg) | VERIFIED | [US-BAR], [UK-BAR], [EU-BAR] |
| "21 lb bar" | VERIFIED, older | 2016 catalogue, [CAT-2016] |
| 17 lb, weighed by a customer | SECONDARY | [WB-BAR-2024] |
| 17.7 lb, collars off, weighed by the owner | OWNER | The owner's scale |

No source says whether any figure includes the two collars. The owner weighed the bar at 17.7 lb with its collars off, so Ironmaster's "about 18 lb" is the bare bar. The app counts 18 lb. OWNER.

**Capacity**

- "Will hold up to 210 lbs of Ironmaster QLDB weight plates." VERIFIED ([US-BAR], [UK-BAR]).
- "Bar weight is about 18 lbs so the total maximum weight is 228 lbs." VERIFIED ([US-BAR], [UK-BAR]).
- UK figures: 95 kg of plates, 103 kg or 103.5 kg total. VERIFIED ([UK-BAR], [WB-BAR-2024]).

**Where 228 lb comes from**

228 = 18 + 210. Ironmaster states this sum directly ([US-BAR]). The owner's note is the manufacturer's rated maximum, not a limit of the owner's plates.

No source explains the 210 lb. Two plate combinations give exactly 210. Both are DERIVED guesses:

1. 42 × 5 lb plates, 21 per end. Stack length 21 × 0.5" = 10.5", which leaves 1" of the 11.5" end for the collar.
2. Every 5 lb and 22.5 lb plate from a 75 lb set plus a 120 lb add-on kit: 24 × 5 + 4 × 22.5 = 120 + 90 = 210. Per end: 12 × 5 lb + 2 × 22.5 lb = 105 lb. Stack length 6" + 3.75" = 9.75".

The figure may be a strength rating. The EZ Curl Bar manual gives 7" ends and 150 lb of plates, 75 lb per end ([M-EZ]). Fifteen 5 lb plates would need 7.5", more than the end length. So at least that bar's figure is not "all 5 lb plates".

**What the owner can load**

- The owner's plates total more than 210 lb, so the bar's rating is the limit. DERIVED.
- Heaviest symmetric load at or under 210 lb: 2 × 22.5 lb + 12 × 5 lb per end = 105 lb per end. Total 18 + 210 = 228 lb (103.4 kg). DERIVED.
- Whether that 9.75" stack fits with the collar fully threaded on is UNKNOWN. The only published rule is: "Do not load more plates than will fit with the collars fully threaded on" ([M-EZ], written for the EZ Curl Bar, which uses the same collar design).

**Plate compatibility**

- 5 lb, 2.5 lb and 22.5 lb plates all fit the Straight Bar. VERIFIED ([US-P225], [US-P5], [US-P25], [UK-P225]).
- Micro plates fit the owner's Straight Bar. OWNER. Ironmaster US says they do not fit. See [2.7](#27-micro-plate-kit-sku-1202).

**Plates per end**

Ironmaster publishes no count. DERIVED from an 11.5" end and the stacking pitches above, ignoring the collar:

| Plate | Pitch | Most that fit in 11.5" |
| --- | --- | --- |
| 5 lb | 0.5" | 23 |
| 2.5 lb | 0.25" | 46 |
| 22.5 lb | 1.875" | 6 |

Subtract the collar thickness once the owner measures it.

**Increment**

- No source states an increment for the bar. With one 2.5 lb plate on each end the step is 5 lb. The dumbbell manual allows one plate of offset on a dumbbell ([M-QLDB]); no source extends that to the bar. UNKNOWN.

### 2.5 Quick-Lock Adjustable Kettlebell Handle 22.5 (SKU 1050)

**Contents**

- One handle only. No screw, no plates. VERIFIED ([US-KB], [UK-KB], [M-KB]).

**Weights**

- Empty handle: 22.5 lb (10.2 kg). VERIFIED ([US-KB], [M-KB], [UK-KB]).
- With one locking screw and no plates: 25 lb (11.3 kg). VERIFIED ([M-KB]).
- Two customers weighed their handles at 10.2 kg. SECONDARY ([WB-KB-2024]).

**Range and increment**

| Screw | Plates it holds | Kettlebell range | Status |
| --- | --- | --- | --- |
| None | 0 | 22.5 lb (10.2 kg) | VERIFIED ([US-KB]) |
| Standard | Up to 32.5 lb: 6 × 5 lb + 1 × 2.5 lb | 25–57.5 lb (11.3–26.1 kg) | VERIFIED ([M-KB], [US-KB]) |
| Long | Up to 55 lb | To 80 lb (36.3 kg) | VERIFIED ([M-KB], [US-KB]) |

- Increment 2.5 lb (1.13 kg). VERIFIED ([US-KB], [UK-KB]).
- Weight formula: plates + 25 lb. VERIFIED ([M-KB]).
- The owner's note "max 80 lb / 36 kg with the long locking pin" is correct. VERIFIED ([M-KB], [US-KB], [UK-KB]).
- Ironmaster publishes no loading table. It publishes the formula and the two limits above.

**Lower bound with the long screw**

- "57.5-80 lbs" ([US-KB]). "60-80 lbs" ([US-KB80]). Both VERIFIED. They disagree.
- A customer used the long screw at 47.5 lb. The spare thread sticks out towards the handle and "the excess threads disappear at the 62.5 lbs load". SECONDARY ([UK-KB80]).
- The manual says: "It is normal for the locking screws to protrude out the top of the kettlebell base if few plates are used." VERIFIED ([M-KB]).

**Plate compatibility**

- "Use any combination of 5 lb and 2.5 lb plates or the 22.5 lb plate." The 22.5 lb plate fits the kettlebell. VERIFIED ([M-KB]).
- Micro plates fit the kettlebell. VERIFIED ([US-MICRO], [UK-MICRO]).

**Reaching 80 lb without a 22.5 lb plate**

- Ironmaster US says the long screw with 5 lb and 2.5 lb plates reaches 80 lb, and "the larger 22.5 lb weight plate is not required". VERIFIED ([US-LONG], [UK-LONG]).
- The archived UK page gives the alternative load as "10 x 5 lbs plate and 1 x 2.5 lbs plate", which is 52.5 lb, not 55 lb. That makes a 77.5 lb kettlebell. VERIFIED ([WB-LONG]).
- The two statements conflict. By stacking pitch, 22.5 + 6 × 5 + 2.5 lb is 5.125" long; 10 × 5 + 2.5 lb is 5.25"; 11 × 5 lb is 5.5". DERIVED. Whether 5.5" fits is UNKNOWN.

**Dimensions**

- Empty handle 8.75" wide × 7.75" tall. 11.5" tall at 57.5 lb. 13.75" tall at 80 lb. VERIFIED ([US-KB], [UK-KB]).
- Grip diameter: 1.375" ([US-KB]). The 2016 catalogue says 1.15" × 9" wide ([CAT-2016]). Both VERIFIED. They disagree.

### 2.6 Weight Kit 80 lb (36 kg) for Quick-Lock Kettlebell (SKU 1068)

- Contents: 1 × 22.5 lb (10.2 kg) plate and 1 × long locking screw. VERIFIED ([US-KB80], [UK-KB80], [WB-KB80-2024]).
- The screw is the same part as in the 120 lb add-on kit. VERIFIED ([US-KB80], [UK-LONG]).
- Kit weight "25 lbs (11 kg) including longer locking screw". This uses the 2.5 lb nominal screw weight. VERIFIED ([WB-KB80-2024]).
- The kit alone does not reach 80 lb. The kettlebell also needs 6 × 5 lb + 1 × 2.5 lb, which Ironmaster sells as the 57.5 lb kit. VERIFIED ([US-KB80]).
- The owner has no 57.5 lb kit, so those plates come from the dumbbell plates.
- 80 lb = 22.5 handle + 2.5 screw + 22.5 + 30 + 2.5. VERIFIED ([M-KB]).

### 2.7 Micro Plate Kit (SKU 1202)

**Contents**

- 4 × 1.25 lb (0.57 kg) round disc plates. VERIFIED ([US-MICRO], [UK-MICRO], [M-MICRO]).
- Cast iron, powder coated. Each disc fits inside the border of a 2.5 lb square plate. VERIFIED ([US-MICRO]).
- Diameter and thickness: UNKNOWN. A customer calls them "thinner than I expected". SECONDARY ([WB-MICRO-2026]).

**Loading rules**

- "Always install the MICRO PLATE on the outside. NEVER install a MICRO PLATE on inside of another QUICK-LOCK DUMBBELL plate." VERIFIED ([M-MICRO]).
- A micro plate takes the place of one plate. With a standard screw and all 7 plates on an end, "you MUST REMOVE ONE PLATE". VERIFIED ([M-MICRO], [US-MICRO]).
- Most on a standard screw with a micro plate: six 5 lb plates, then the micro plate. VERIFIED ([M-MICRO]).
- One micro plate on one end only is allowed. Six 5 lb plates per end is 70 lb; with two micro plates 72.5 lb; with one 71.25 lb. VERIFIED ([M-MICRO]).
- With a long screw, the same one-plate reduction applies by the product page's general note ([US-MICRO]). Which plate to remove is not stated. UNKNOWN.

**Manual error**

- The manual says a handle with one micro plate and no other plates weighs "11.125 lbs". 10 + 1.25 = 11.25 lb. The manual's other figures (12.5, 71.25, 72.5) follow 1.25 lb per plate. VERIFIED as printed ([M-MICRO]).

**Compatibility**

| Implement | Ironmaster US | Ironmaster UK (current) | Customers | Owner's equipment |
| --- | --- | --- | --- | --- |
| Dumbbells | Yes ([US-MICRO]) | Yes ([UK-MICRO]) | Yes | Yes. OWNER |
| Kettlebell | Yes ([US-MICRO]) | Yes ([UK-MICRO]) | — | Not reported |
| Straight Bar, EZ Curl Bar | No: "Will not fit the EZ Curl and Straight Bars since the center hole is a smaller diameter" ([US-MICRO]) | Yes ([UK-MICRO]) | No: "their holes are too small for the straight bar and EZ curl bar" ([WB-MICRO-2026]) | Straight Bar: yes. OWNER. The owner has no EZ Curl Bar |

The micro plates fit the owner's Straight Bar and dumbbells. OWNER. The owner bought them in July 2026 from the UK site, which says they fit the bars. The manufacturer and one customer say they do not, so older micro plates or bars may differ. Why the sources disagree is UNKNOWN.

### 2.8 Leg Attachment PRO (SKU 1024)

**Plates accepted**

- Quick-Lock plates, on the standard plate holder. VERIFIED ([US-LEG], [UK-LEG]).
- Standard plates with a 1" hole, on the same chrome plate holder. VERIFIED ([US-LEG]).
- Olympic plates, using the included Olympic sleeve adapter, 12.5" (320 mm) long. VERIFIED ([US-LEG], [M-LEG]).
- Quick-Lock plates made before 2011 may not fit. VERIFIED ([US-LEG], [UK-LEG]). The owner's plates date from 2019 onwards.

**Limits**

- Rated load 200 lb (90.7 kg). VERIFIED ([US-LEG], [UK-LEG]).
- Quick-Lock plates: "you can load up to 100 lbs" (45.4 kg). VERIFIED ([US-LEG], [WB-LEG]).

**Not stated**

- Empty lever weight: UNKNOWN. The manual and both product pages omit it ([M-LEG], [US-LEG], [UK-LEG]).
- How plates are held on the plate holder: UNKNOWN. The manual's parts list has no collar ([M-LEG]).
- Shopify lists a shipping weight of 12.4 kg for the whole attachment ([UK-JSON]). This is not the lever weight.

### 2.9 Mirafit Adjustable Weighted Vest, 30 kg

mirafit.co.uk serves a Cloudflare browser check to non-browser requests. The facts below come from Wayback Machine copies of the Mirafit page.

- Sold in 10 kg, 20 kg and 30 kg sizes. VERIFIED ([MF-2025]).
- "Includes individual 1kg cast iron blocks which can be added and removed to the vest, allowing you to set the perfect weight for your exercises up to the maximum stated." VERIFIED ([MF-2025]).
- "Our weighted vest has up to thirty 1kg iron blocks." VERIFIED, from Mirafit's blog ([MF-BLOG]). The product page does not state a block count.
- Increment: 1 kg (2.2 lb). VERIFIED ([MF-2025]).
- Maximum: 30 kg (66.1 lb). VERIFIED ([MF-2025]).
- Empty vest weight: UNKNOWN.
- Whether 30 kg means the blocks alone or blocks plus vest: UNKNOWN.
- 30 kg size measurements: width 34 cm; height from shoulder mid-point 60 cm; shoulder strap width 12 cm; total shoulder height 33 cm; neck opening 15 cm × 33 cm; waist strap about 170 cm × 5 cm. VERIFIED ([MF-2025]).
- Block dimensions: UNKNOWN.
- "These vests are not suitable for distance running." VERIFIED ([MF-2025]).

### 2.10 Mirafit M130 Adjustable Squat & Bench Press Rack

Same access limit as the vest: facts come from Wayback Machine copies of Mirafit's pages and from Mirafit's Amazon listing.

**Maximum load**

- The M130 product page states no maximum load, in the 2022, 2023 and 2025 copies. UNKNOWN ([MF-M130-2025], [MF-M130-2023], [MF-M130-2022]).
- Mirafit's Amazon UK listing states none either. SECONDARY ([AMZ-M130]).
- A reviewer on Mirafit's page writes: "Not entirely sure what the rack is rated to, but have had 80kg on it so far and it seemed fine." SECONDARY ([MF-M130-2025]).
- Spotter bar rating: UNKNOWN. No source lists one.

Related figures, none of them for the M130 itself:

| Figure | Applies to | Status | Source |
| --- | --- | --- | --- |
| 250 kg (551 lb) on the barbell rests; 50 kg (110 lb) on the storage poles | The M1 Adjustable Squat Rack With Spotters, the model sold at the same URL and SKU (77795789) in 2021 | VERIFIED for the M1 | [MF-M1-2021] |
| "between 200kg and 250kg, depending on which one you get" (441–551 lb) | Mirafit's adjustable squat racks and stands as a group | VERIFIED for the group | [MF-GUIDE] |
| 300 kg (661 lb) | The 6ft Olympic bar sold in a package with the M130. Not the rack | VERIFIED for the bar | [MF-PKG] |

Web search summaries report "300 kg" for the M130. That figure is the barbell's rating from the package page ([MF-PKG]). Do not use it for the rack.

The owner's heaviest barbell is 228 lb (103.4 kg). That is about half of the lowest figure in the table. DERIVED.

**Frame type**

- One joined frame, not two independent stands. DERIVED. No source says so in those words.
- Evidence: Mirafit describes a "powder coated steel frame" with "10 width settings" and one depth of 97 cm ([MF-M130-2025]). Its guide sets the M130 rack apart from its "independent M3 Squat Stands" ([MF-GUIDE]). Two loose stands would have no fixed width settings.

**Width**

- "Total width: 78cm - 123cm" (30.7–48.4"). VERIFIED ([MF-M130-2025]). The Amazon UK listing gives the same range. SECONDARY ([AMZ-M130]).
- The width is adjustable: "10 width settings allowing different size bars to be used." VERIFIED ([MF-M130-2025]).
- Step between settings: 5 cm. DERIVED: (123 − 78) ÷ 9 = 5. The M1 page states "10 width settings (5cm gaps)" for the same range ([MF-M1-2021]).
- Settings, DERIVED: 78, 83, 88, 93, 98, 103, 108, 113, 118, 123 cm.
- Distance between the uprights, inner or outer: UNKNOWN. Mirafit gives total width only. It does not say whether total width is measured across the uprights or across the feet.
- Tube size: 50 mm on the M1 ([MF-M1-2021]). Not stated for the M130. UNKNOWN.
- Mirafit says its adjustable racks suit "a shorter bar (4ft, 5ft or 6ft)". VERIFIED ([MF-GUIDE]). The Ironmaster bar is 5.5 ft.

**Other dimensions**

- Total height 103–158 cm. 13 barbell rest levels at 2" intervals. VERIFIED ([MF-M130-2025]).
- Spotter height 62–87 cm. 11 spotter levels at 1" intervals. VERIFIED ([MF-M130-2025]).
- Depth 97 cm. VERIFIED ([MF-M130-2025]).
- Storage poles: 21 cm long, 1" diameter. VERIFIED ([MF-M130-2025], [MF-PKG]).
- Rubber liners on the barbell rests. VERIFIED ([MF-M130-2025]).

**Fit with the Ironmaster Straight Bar**

The bar fits. DERIVED from the figures below.

| Bar figure | Value | Source |
| --- | --- | --- |
| Total length | 66" (167.6 cm) | [US-BAR] |
| Grip section between the welded backing plates | 42.5" (108.0 cm) | [US-BAR] |
| Loadable end, each side | 11.5" (29.2 cm) | [US-BAR] |

The rule: both barbell rests must sit inside the 108.0 cm grip section, so the backing plates and the plates stay outside the uprights.

- The uprights cannot be wider apart than the rack's total width. So any setting with a total width under 108.0 cm fits, however Mirafit measures the width.
- Six settings qualify: 78, 83, 88, 93, 98 and 103 cm.
- Clearance per side, (108.0 − total width) ÷ 2:

| Total width | Clearance per side, at least |
| --- | --- |
| 78 cm | 15.0 cm |
| 83 cm | 12.5 cm |
| 88 cm | 10.0 cm |
| 93 cm | 7.5 cm |
| 98 cm | 5.0 cm |
| 103 cm | 2.5 cm |

- The 108 cm setting leaves no clearance if the uprights sit at the full total width. The 113, 118 and 123 cm settings are wider than the grip section. Whether any of these four fit depends on how far the feet stick out past the uprights. UNKNOWN.
- Real clearance is larger than the table shows if the feet are wider than the uprights.

**Sleeve length left for plates**

- The full 11.5" (29.2 cm) per end. The rack takes none of it, because the uprights sit inside the grip section. DERIVED.
- The spin-lock collar still uses part of each end. Collar thickness is UNKNOWN. See [2.4](#24-straight-barbell-bar-sku-1043).

**Storage poles and Quick-Lock plates**

- The poles are 1" diameter, the same as the Ironmaster bar. Quick-Lock plates fit a 1" bar ([US-BAR]), so they should slide onto the poles. DERIVED. No source confirms it.
- Pole rating for the M130: UNKNOWN. The M1's poles were rated 50 kg (110 lb) ([MF-M1-2021]).
- By stacking pitch, a 21 cm (8.3") pole holds sixteen 5 lb plates. DERIVED.

### 2.11 Mirafit Pair of 1" Standard Weight Bar Clamp Collars (Orange)

The owner bought 2 pairs, 4 collars, from Amazon UK in July 2025. The owner often uses them on the Ironmaster Straight Bar in place of the bar's spin-lock collars. OWNER.

Mirafit facts come from Wayback Machine copies of Mirafit's page. The Amazon UK listing is sold by Mirafit's own store; it is marked SECONDARY as a retailer listing.

**Weight**

- Weight of one collar: not weighed. The owner judges the nylon collar to weigh next to nothing, so the app counts it as 0 lb. OWNER.
- Mirafit's page states no weight, in the 2022 and 2025 copies ([MF-COLLAR-2025], [MF-COLLAR-2022]).
- The Amazon UK listing shows no item weight and no package weight ([AMZ-COLLAR]). The listing is "currently unavailable", and the Wayback Machine holds no copy of it.
- No other retailer listing found gives a weight.

**Width along the bar**

- 3.2 cm (1.26"). SECONDARY, read from Mirafit's dimension image on the Amazon UK listing ([AMZ-COLLAR-IMG]).
- The image gives three figures: 2.1 cm across the closed opening, 5 cm and 3.2 cm on the side view. It does not label which is the width along the bar. The side view shows the collar turned a quarter turn from the end-on view, so 3.2 cm runs along the bar and 5 cm is the collar's height. DERIVED from the image.
- A customer agrees: "The width is around 3cms, not 5.1." That review, from February 2020, says an older image showed 5.1 cm. SECONDARY ([AMZ-COLLAR]).
- Mirafit's own page states no dimensions ([MF-COLLAR-2025]).

**Material and fit**

- "Solid nylon design with rubber insert to stop collar sliding when locked on bar." VERIFIED ([MF-COLLAR-2025]).
- "Designed for use with all 1" weight bars." VERIFIED ([MF-COLLAR-2025]). The Amazon listing says "all 25mm/1" sized weight bars". SECONDARY ([AMZ-COLLAR]).
- Inner diameter: 1" nominal, listed as "Item diameter 1 Inches". SECONDARY ([AMZ-COLLAR]). The closed opening between the rubber inserts is 2.1 cm. SECONDARY ([AMZ-COLLAR-IMG]).
- "Locking clamp design - simply slide on and close clamp to lock in place." VERIFIED ([MF-COLLAR-2025]).
- Sold in black or orange, in pairs. VERIFIED ([MF-COLLAR-2025]).

**Maximum load**

- None stated by Mirafit. UNKNOWN ([MF-COLLAR-2025]).
- "Up to 10x stronger than standard spring collars." SECONDARY ([AMZ-COLLAR]). This is not a load figure.
- The Amazon detail table lists "Tensile Strength 22.05 Pounds", which is 10.0 kg. SECONDARY ([AMZ-COLLAR]). The listing does not say what it measures. Do not treat it as a plate limit.

**How well they hold**

Customer reports are mixed. All SECONDARY.

| Report | Source |
| --- | --- |
| "I use them on a 1" threaded barbell and they work perfectly" | [AMZ-COLLAR] |
| "It fits over the threads no problem and fits pretty snug. They do move a bit" | [AMZ-COLLAR] |
| "Ok for doing curls or any lift when the bar is horizontal, not good when doing virtical holds like hammer curls" | [AMZ-COLLAR] |
| "They will hold 15kg on a down facing exercise no problems" | [MF-COLLAR-2025] |
| "I put 10kg on each side of my 1inch bar and doesn't really hold it in place" | [MF-COLLAR-2025] |
| On a trap bar, "plates easily become loose" | [MF-COLLAR-2025] |

**Clamp collars on Ironmaster bars**

- Ironmaster says nothing about clamp collars on either bar. UNKNOWN. Its pages and the EZ Curl Bar manual describe the spin-lock collars only ([US-BAR], [US-EZ], [M-EZ]).
- A Straight Bar owner bought "a set of rubber 1 inch quick lock off of amazon" and advises: "just buy some 12 dollar quick clamps". SECONDARY ([US-BAR]).
- An EZ Curl Bar owner uses "a 1" clamp collar": "It's not as locked in as the stock spin collars and the weights move a bit." SECONDARY ([US-EZ]).
- Thread on the EZ Curl Bar: "the last bit of the bar has no thread so you can quickly spin the collar loose without it flying off the bar." SECONDARY ([US-EZ], [UK-EZ]).
- Thread on the Straight Bar: UNKNOWN. No source says whether the thread runs the full 11.5". A Straight Bar owner reports "up to 10-15 turns" to lock the spin collar. SECONDARY ([US-BAR]).

**Bar end left for plates**

- A clamp collar 3.2 cm (1.26") wide leaves 11.5 − 1.26 = 10.24" (26.0 cm) of each end for plates. DERIVED.
- By stacking pitch, 10.24" holds twenty 5 lb plates, 10.0". DERIVED.
- The 228 lb load, 2 × 22.5 lb + 12 × 5 lb per end, is 9.75" long. It fits with 0.49" (1.2 cm) to spare. DERIVED.
- These figures assume the clamp grips at the very tip of the bar end.

**Ironmaster spin-lock collar, second search**

- Weight: UNKNOWN. Thickness: UNKNOWN.
- Ironmaster sells no spare spin-lock collar on its US, UK or EU sites, so no listing states a weight. Searched: the US site search and product list ([US-SEARCH]), the UK catalogue ([UK-JSON]) and the EU catalogue ([EU-JSON]).
- "Spin-lock collars are weighted to easily screw on and off." VERIFIED ([US-EZ]). No figure is given.
- Shipping weights for the Straight Bar are 10.5 kg in the UK catalogue and 12.7 kg in the EU catalogue ([UK-JSON], [EU-JSON]). These include packaging. They overstate the bar and collars.

## 3. Combined plate pool

Assumes one of each order, with standard contents.

### Plates

| Plate | From | Count | Total |
| --- | --- | --- | --- |
| 5 lb (2.27 kg) | 45 lb set 12; 75 lb kit 12 | 24 | 120 lb (54.4 kg) |
| 2.5 lb (1.13 kg) | 45 lb set 4 | 4 | 10 lb (4.5 kg) |
| 22.5 lb (10.2 kg) | 120 lb kit 4; kettlebell 80 lb kit 1 | 5 | 112.5 lb (51.0 kg) |
| 1.25 lb (0.57 kg) micro | Micro Plate Kit 4 | 4 | 5 lb (2.3 kg) |
| **All plates** | | **37** | **247.5 lb (112.3 kg)** |

### Locking hardware

| Item | From | Count | Nominal weight | True weight |
| --- | --- | --- | --- | --- |
| Standard locking screw | 45 lb set 4 | 4 | 2.5 lb (1.13 kg) | 2.5 lb |
| Long locking screw | 120 lb kit 4; kettlebell 80 lb kit 1 | 5 | 2.5 lb (1.13 kg) | About 3 lb (1.36 kg); UK says 1.5 kg |
| Spin-lock collar | Straight Bar 2 | 2 | UNKNOWN | UNKNOWN |
| Clamp collar, Mirafit 1" | 2 pairs | 4 | UNKNOWN | UNKNOWN |

### Implements

| Implement | Count | Empty weight |
| --- | --- | --- |
| Dumbbell handle | 2 | 5 lb (2.27 kg) bare; 10 lb (4.54 kg) with two standard screws |
| Straight Bar | 1 | About 18 lb (8.16 kg); collars included or not is UNKNOWN |
| Kettlebell handle 22.5 | 1 | 22.5 lb (10.2 kg) bare; 25 lb (11.3 kg) with one screw |
| Leg Attachment PRO | 1 | Lever weight UNKNOWN |
| Weighted vest | 1 | Empty weight UNKNOWN; up to thirty 1 kg blocks |
| Squat and bench rack | 1 | Holds the bar only. Two 1" storage poles, 21 cm long |

### What the pool allows

All DERIVED from the counts above.

- Two dumbbells at 120 lb each need 4 × 22.5 lb, 24 × 5 lb, 4 × 2.5 lb and 4 long screws. The owner has exactly that, with one 22.5 lb plate and one long screw to spare.
- Dumbbells at 120 lb use every 5 lb and 2.5 lb plate. The kettlebell and bar then have only the spare 22.5 lb plate and the micro plates.
- The screws are shared. Four standard and five long screws cover two dumbbells and the kettlebell at once.
- The bar's 210 lb plate rating is below the pool's 247.5 lb, so the bar's rating limits the bar.

## 4. Open questions

Each line names the check that settles it. The owner has a kitchen scale, which settles the small parts. The bar needs a bathroom scale.

| # | Question | Why it matters | Check |
| --- | --- | --- | --- |
| 1 | Does the Straight Bar's 18 lb include the two collars? Sources give 17, 18 and 21 lb. | Every barbell total depends on it. | Settled: the bar alone weighs 17.7 lb and one spin-lock collar 433 g (OWNER). The app counts 18 lb and 1 lb. |
| 2 | How thick is a spin-lock collar, and how much of the 11.5" end can hold plates? | Sets plates per end. | Measure a collar. Thread it on fully and measure the free length. |
| 3 | What produces the 210 lb plate rating? | Decides whether the app caps by weight, by length or both. | Load 2 × 22.5 lb + 12 × 5 lb on one end and check the collar threads on fully. |
| 4 | What does a long locking screw weigh? Sources say "about 3 lb" and 1.5 kg. | True weight differs from nominal by about 0.5 lb per screw. | Weigh one long screw and one standard screw. |
| 5 | Should the app show nominal or true weight? | Ironmaster counts the long screw as 2.5 lb. | Owner's choice, after check 4. |
| 6 | ANSWERED. Do the micro plates fit the Straight Bar? US says no, UK says yes. | Sets the bar's smallest step. | They fit the owner's Straight Bar and dumbbells. OWNER. |
| 7 | What are the micro plate's diameter and thickness? | Needed to draw it to scale. | Measure one. |
| 8 | What are the true plate thicknesses? Derived pitch is 0.5", 0.25" and 1.875"; a review says 0.6" and 0.4". | Needed to draw to scale and to count plates per end. | Measure one plate of each size, then a stack of five 5 lb plates. |
| 9 | Are the plates 6.7" or 6.5" square? | Drawing scale. | Measure one plate. |
| 10 | Is the 120 lb dumbbell 18.25" or 19" long? | Fixes the 22.5 lb plate's pitch. | Measure a 120 lb dumbbell, or the 22.5 lb plate. |
| 11 | What is the lightest load a long screw locks on the dumbbell and on the kettlebell? Sources say 57.5, 60, 70 and 75 lb; a customer used 47.5 lb. | The app must know when to switch screws. | Try the long screw with fewer and fewer plates until it no longer tightens. |
| 12 | Does a long screw hold eleven 5 lb plates, or ten plus one 2.5 lb? | Decides whether the kettlebell reaches 80 lb without a 22.5 lb plate. | Stack eleven 5 lb plates on the kettlebell with the long screw. |
| 13 | With a long screw and a micro plate, which plate has to come off? | Micro plate rules above 75 lb. | Build a 120 lb end, swap the 2.5 lb plate for a micro plate, and check the screw tightens. |
| 14 | Is a one-plate offset allowed on the bar, as it is on the dumbbell? | Sets whether the bar has 2.5 lb steps. | Ask Ironmaster. No source covers it. |
| 15 | What does the Leg Attachment PRO's lever weigh, and what holds the plates on? | Needed to show true resistance. | Weigh the upper frame, or hang a luggage scale from the plate holder. Check the box for a collar. |
| 16 | What does the empty vest weigh, and does 30 kg include it? | Every vest total depends on it. | Weigh the vest empty. Count the blocks. Weigh one block. |
| 17 | What does the owner's handle weigh? The UK page splits 10 lb differently from the manufacturer. | Confirms the 5 lb handle. | Weigh one bare handle. |
| 18 | Which kettlebell grip diameter is right, 1.375" or 1.15"? | Drawing only. | Measure the grip. |
| 19 | What is the M130's load rating, on the barbell rests and on the spotter bars? | Mirafit publishes none. The 250 kg figure belongs to the older M1. | Check the rack for a rating label and the printed manual. Ask Mirafit. |
| 20 | How far apart are the uprights at each width setting, outer face to outer face? | Confirms the bar fits and shows which of the four widest settings work. | Measure across the barbell rests at the setting in use. It must be under 108 cm (42.5"). |
| 21 | Do Quick-Lock plates slide onto the rack's storage poles? | Lets the app suggest where to park plates. | Slide one 5 lb plate and one 22.5 lb plate onto a pole. |
| 22 | Is the M130 one joined frame with a width-adjusting cross member? | The width check assumes fixed 5 cm settings. | Look at the rack. Count the width holes and measure their spacing. |
| 23 | What does one Mirafit clamp collar weigh? | No source gives a weight. Four collars add to every clamp-collared bar total. | Weigh one collar. |
| 24 | Is the clamp collar 3.2 cm wide along the bar? | Sets the bar end left for plates. The figure comes from an unlabelled image. | Measure one collar with a ruler. |
| 25 | Is the Straight Bar's end threaded along the full 11.5"? | Shows where a clamp or spin-lock collar can sit. | Look at the bar end. Measure the threaded length. |
| 26 | Do the clamp collars hold a heavy stack tight against the backing plate? | Customer reports are mixed, and Ironmaster is silent. | Load 105 lb on one end, clamp it, and check for movement. |

## Sources

Manufacturer, ironmaster.com:

- US-45: <https://www.ironmaster.com/products/quick-lock-dumbbell-system-45-lb-set-original/>
- US-75SET: <https://www.ironmaster.com/products/quick-lock-adjustable-dumbbells-75-original/>
- US-75KIT: <https://www.ironmaster.com/products/quick-lock-adjustable-dumbbells-75lb-upgrade-kit/>
- US-120: <https://www.ironmaster.com/products/add-on-kit-to-120-lbs-quick-lock-original/>
- US-165: <https://www.ironmaster.com/products/165-lb-add-on-kit-custom/>
- US-BAR: <https://www.ironmaster.com/products/straight-bar-for-quick-lock-dumbbell-plates/>
- US-KB: <https://www.ironmaster.com/products/quick-lock-adjustable-kettlebell-handle/>
- US-KB80: <https://www.ironmaster.com/products/weight-kit-80-lbs-for-qlkb/>
- US-MICRO: <https://www.ironmaster.com/products/micro-plate-kit/>
- US-LEG: <https://www.ironmaster.com/products/leg-attachment-pro/>
- US-STD: <https://www.ironmaster.com/products/quick-lock-locking-screw-standard/>
- US-LONG: <https://www.ironmaster.com/products/quick-lock-dumbbell-locking-screw-add/>
- US-P225: <https://www.ironmaster.com/products/22_5-lb-plate/>
- US-P5: <https://www.ironmaster.com/products/5-lb-plates-4-pack/>
- US-P25: <https://www.ironmaster.com/products/2_5-lb-plates-4-pack/>
- US-EZ: <https://www.ironmaster.com/products/ez-curl-bar-for-quick-lock-dumbbell-plates/>
- US-SEARCH: <https://www.ironmaster.com/mm5/merchant.mvc?Screen=SRCH&Search=collar>

Manufacturer manuals:

- M-QLDB: <https://www.ironmaster.com/mm5/graphics/00000001/woo/2016/09/Quick-Lock-Dumbbells-6-16.pdf>
- M-ADDON: <https://www.ironmaster.com/mm5/graphics/00000001/woo/2016/09/QLDB_Addonkit.pdf>
- M-KB: <https://www.ironmaster.com/mm5/graphics/00000001/1050_1051%20Kettlebell%20manual%205-17%202024.pdf>
- M-MICRO: <https://www.ironmaster.com/mm5/graphics/00000001/woo/2019/09/Micro-Plate-Instructions.pdf>
- M-LEG: <https://www.ironmaster.com/mm5/graphics/00000001/woo/2019/03/SB-PRO-Leg-Att-4-12-2021.pdf>
- M-EZ: <https://www.ironmaster.com/mm5/graphics/00000001/woo/2016/07/EZ-Curl-Bar-for-QLDB-Instructions.pdf>
- CAT-2016: <https://cdn.shopify.com/s/files/1/1005/5565/3458/files/Full_Product_Catalog.pdf>

UK distributor, ironmaster.co.uk, current site:

- UK-45: <https://ironmaster.co.uk/products/quick-lock-dumbbell-set-45-lbs-20-kg>
- UK-75KIT: <https://ironmaster.co.uk/products/75-lbs-34-kg-quick-lock-dumbbell-upgrade-kit>
- UK-120: <https://ironmaster.co.uk/products/quick-lock-add-on-kit-120-lbs-54-4-kg>
- UK-BAR: <https://ironmaster.co.uk/products/straight-barbell-bar>
- UK-KB: <https://ironmaster.co.uk/products/quick-lock-adjustable-kettlebell-handle-22-5>
- UK-KB57: <https://ironmaster.co.uk/products/weight-kit-up-to-57-5-lbs-26-kg>
- UK-KB80: <https://ironmaster.co.uk/products/weight-kit-up-to-80-lbs-36-kg>
- UK-MICRO: <https://ironmaster.co.uk/products/micro-plate-kit>
- UK-LEG: <https://ironmaster.co.uk/products/leg-attachment-pro>
- UK-STD: <https://ironmaster.co.uk/products/quick-lock-locking-screw-standard>
- UK-LONG: <https://ironmaster.co.uk/products/quick-lock-locking-screw-long>
- UK-HANDLE: <https://ironmaster.co.uk/products/quick-lock-dumbbell-handle-set>
- UK-P225: <https://ironmaster.co.uk/products/22-5-lb-10-2-kg-quick-lock-plate>
- UK-JSON: <https://ironmaster.co.uk/products.json?limit=250>
- UK-EZ: <https://ironmaster.co.uk/products/ez-curl-bar>

UK distributor, archived copies:

- WB-45-2019: <https://web.archive.org/web/20190921032531/https://ironmaster.co.uk/products/quick-lock-dumbbell-set-45-lbs-20-kg-no-rack/>
- WB-75KIT: <https://web.archive.org/web/20250208065111/https://ironmaster.co.uk/products/75-lbs-34-kg-quick-lock-dumbbell-upgrade-kit/>
- WB-120-2025: <https://web.archive.org/web/20250325022431/https://ironmaster.co.uk/products/quick-lock-add-on-kit-120lbs-54-4kg/>
- WB-BAR-2024: <https://web.archive.org/web/20240811095055/https://ironmaster.co.uk/products/straight-barbell-bar/>
- WB-KB-2024: <https://web.archive.org/web/20240913091010/https://ironmaster.co.uk/products/quick-lock-adjustable-kettlebell-handle/>
- WB-KB80-2024: <https://web.archive.org/web/20241009095045/https://ironmaster.co.uk/products/weight-kit-80-lbs-36-kg-for-quick-lock-kettlebell/>
- WB-MICRO-2026: <https://web.archive.org/web/20260617001917/https://ironmaster.co.uk/products/micro-plate-kit/>
- WB-LONG: <https://web.archive.org/web/20251205084641/https://ironmaster.co.uk/products/quick-lock-locking-screw-add/>
- WB-LEG: <https://web.archive.org/web/20250208055216/https://ironmaster.co.uk/products/leg-attachment-pro/>

EU distributor:

- EU-BAR: <https://www.ironmaster-eu.com/en/straight-bar-for-quick-lock-dumbbell-plates.html>
- EU-PLATES: <https://www.ironmaster-eu.com/en/quick-lock-dumbbell-weight-plates-box-of-6-x-5lbs.html>
- EU-JSON: <https://www.ironmaster-eu.com/products.json?limit=250>

Mirafit, archived copies:

- MF-2025: <https://web.archive.org/web/20250618015514/https://mirafit.co.uk/mirafit-adjustable-weighted-vest.html>
- MF-BLOG: <https://web.archive.org/web/20250907105252/https://mirafit.co.uk/blog/weighted-vest-vs-tactical-vest/>
- MF-M130-2025: <https://web.archive.org/web/20250804010907/https://mirafit.co.uk/mirafit-adjustable-squat-rack-with-dip-bars.html>
- MF-M130-2023: <https://web.archive.org/web/20230602230310/https://mirafit.co.uk/mirafit-adjustable-squat-rack-with-dip-bars.html>
- MF-M130-2022: <https://web.archive.org/web/20221130094829/https://mirafit.co.uk/mirafit-adjustable-squat-rack-with-dip-bars.html>
- MF-M1-2021: <https://web.archive.org/web/20210830002217/https://mirafit.co.uk/mirafit-adjustable-squat-rack-with-dip-bars.html>
- MF-GUIDE: <https://web.archive.org/web/20250807220309/https://mirafit.co.uk/squat-racks/>
- MF-PKG: <https://web.archive.org/web/20251231101648/https://mirafit.co.uk/mirafit-home-gym-squat-bench-package.html>
- MF-COLLAR-2025: <https://web.archive.org/web/20250719204805/https://mirafit.co.uk/mirafit-1-standard-weight-bar-collars.html>
- MF-COLLAR-2022: <https://web.archive.org/web/20221122190637/https://mirafit.co.uk/mirafit-1-standard-weight-bar-collars.html>

Mirafit, Amazon listing:

- AMZ-M130: <https://www.amazon.co.uk/Mirafit-Fully-Adjustable-Position-Spotter/dp/B09FQD2P8P>
- AMZ-COLLAR: <https://www.amazon.co.uk/Mirafit-Standard-Weight-Clamp-Collars/dp/B077K3JVTH>
- AMZ-COLLAR-IMG: <https://m.media-amazon.com/images/I/61yuzSsohQL._AC_SL1500_.jpg>

Secondary:

- GG: <https://www.garage-gyms.com/ironmaster-quick-lock-adjustable-dumbbells-review/>

[US-45]: https://www.ironmaster.com/products/quick-lock-dumbbell-system-45-lb-set-original/
[US-75SET]: https://www.ironmaster.com/products/quick-lock-adjustable-dumbbells-75-original/
[US-75KIT]: https://www.ironmaster.com/products/quick-lock-adjustable-dumbbells-75lb-upgrade-kit/
[US-120]: https://www.ironmaster.com/products/add-on-kit-to-120-lbs-quick-lock-original/
[US-165]: https://www.ironmaster.com/products/165-lb-add-on-kit-custom/
[US-BAR]: https://www.ironmaster.com/products/straight-bar-for-quick-lock-dumbbell-plates/
[US-KB]: https://www.ironmaster.com/products/quick-lock-adjustable-kettlebell-handle/
[US-KB80]: https://www.ironmaster.com/products/weight-kit-80-lbs-for-qlkb/
[US-MICRO]: https://www.ironmaster.com/products/micro-plate-kit/
[US-LEG]: https://www.ironmaster.com/products/leg-attachment-pro/
[US-STD]: https://www.ironmaster.com/products/quick-lock-locking-screw-standard/
[US-LONG]: https://www.ironmaster.com/products/quick-lock-dumbbell-locking-screw-add/
[US-P225]: https://www.ironmaster.com/products/22_5-lb-plate/
[US-P5]: https://www.ironmaster.com/products/5-lb-plates-4-pack/
[US-P25]: https://www.ironmaster.com/products/2_5-lb-plates-4-pack/
[M-QLDB]: https://www.ironmaster.com/mm5/graphics/00000001/woo/2016/09/Quick-Lock-Dumbbells-6-16.pdf
[M-ADDON]: https://www.ironmaster.com/mm5/graphics/00000001/woo/2016/09/QLDB_Addonkit.pdf
[M-KB]: https://www.ironmaster.com/mm5/graphics/00000001/1050_1051%20Kettlebell%20manual%205-17%202024.pdf
[M-MICRO]: https://www.ironmaster.com/mm5/graphics/00000001/woo/2019/09/Micro-Plate-Instructions.pdf
[M-LEG]: https://www.ironmaster.com/mm5/graphics/00000001/woo/2019/03/SB-PRO-Leg-Att-4-12-2021.pdf
[M-EZ]: https://www.ironmaster.com/mm5/graphics/00000001/woo/2016/07/EZ-Curl-Bar-for-QLDB-Instructions.pdf
[CAT-2016]: https://cdn.shopify.com/s/files/1/1005/5565/3458/files/Full_Product_Catalog.pdf
[UK-45]: https://ironmaster.co.uk/products/quick-lock-dumbbell-set-45-lbs-20-kg
[UK-75KIT]: https://ironmaster.co.uk/products/75-lbs-34-kg-quick-lock-dumbbell-upgrade-kit
[UK-120]: https://ironmaster.co.uk/products/quick-lock-add-on-kit-120-lbs-54-4-kg
[UK-BAR]: https://ironmaster.co.uk/products/straight-barbell-bar
[UK-KB]: https://ironmaster.co.uk/products/quick-lock-adjustable-kettlebell-handle-22-5
[UK-KB57]: https://ironmaster.co.uk/products/weight-kit-up-to-57-5-lbs-26-kg
[UK-KB80]: https://ironmaster.co.uk/products/weight-kit-up-to-80-lbs-36-kg
[UK-MICRO]: https://ironmaster.co.uk/products/micro-plate-kit
[UK-LEG]: https://ironmaster.co.uk/products/leg-attachment-pro
[UK-STD]: https://ironmaster.co.uk/products/quick-lock-locking-screw-standard
[UK-LONG]: https://ironmaster.co.uk/products/quick-lock-locking-screw-long
[UK-HANDLE]: https://ironmaster.co.uk/products/quick-lock-dumbbell-handle-set
[UK-P225]: https://ironmaster.co.uk/products/22-5-lb-10-2-kg-quick-lock-plate
[UK-JSON]: https://ironmaster.co.uk/products.json?limit=250
[WB-45-2019]: https://web.archive.org/web/20190921032531/https://ironmaster.co.uk/products/quick-lock-dumbbell-set-45-lbs-20-kg-no-rack/
[WB-75KIT]: https://web.archive.org/web/20250208065111/https://ironmaster.co.uk/products/75-lbs-34-kg-quick-lock-dumbbell-upgrade-kit/
[WB-120-2025]: https://web.archive.org/web/20250325022431/https://ironmaster.co.uk/products/quick-lock-add-on-kit-120lbs-54-4kg/
[WB-BAR-2024]: https://web.archive.org/web/20240811095055/https://ironmaster.co.uk/products/straight-barbell-bar/
[WB-KB-2024]: https://web.archive.org/web/20240913091010/https://ironmaster.co.uk/products/quick-lock-adjustable-kettlebell-handle/
[WB-KB80-2024]: https://web.archive.org/web/20241009095045/https://ironmaster.co.uk/products/weight-kit-80-lbs-36-kg-for-quick-lock-kettlebell/
[WB-MICRO-2026]: https://web.archive.org/web/20260617001917/https://ironmaster.co.uk/products/micro-plate-kit/
[WB-LONG]: https://web.archive.org/web/20251205084641/https://ironmaster.co.uk/products/quick-lock-locking-screw-add/
[WB-LEG]: https://web.archive.org/web/20250208055216/https://ironmaster.co.uk/products/leg-attachment-pro/
[EU-BAR]: https://www.ironmaster-eu.com/en/straight-bar-for-quick-lock-dumbbell-plates.html
[EU-PLATES]: https://www.ironmaster-eu.com/en/quick-lock-dumbbell-weight-plates-box-of-6-x-5lbs.html
[MF-2025]: https://web.archive.org/web/20250618015514/https://mirafit.co.uk/mirafit-adjustable-weighted-vest.html
[MF-BLOG]: https://web.archive.org/web/20250907105252/https://mirafit.co.uk/blog/weighted-vest-vs-tactical-vest/
[GG]: https://www.garage-gyms.com/ironmaster-quick-lock-adjustable-dumbbells-review/
[MF-M130-2025]: https://web.archive.org/web/20250804010907/https://mirafit.co.uk/mirafit-adjustable-squat-rack-with-dip-bars.html
[MF-M130-2023]: https://web.archive.org/web/20230602230310/https://mirafit.co.uk/mirafit-adjustable-squat-rack-with-dip-bars.html
[MF-M130-2022]: https://web.archive.org/web/20221130094829/https://mirafit.co.uk/mirafit-adjustable-squat-rack-with-dip-bars.html
[MF-M1-2021]: https://web.archive.org/web/20210830002217/https://mirafit.co.uk/mirafit-adjustable-squat-rack-with-dip-bars.html
[MF-GUIDE]: https://web.archive.org/web/20250807220309/https://mirafit.co.uk/squat-racks/
[MF-PKG]: https://web.archive.org/web/20251231101648/https://mirafit.co.uk/mirafit-home-gym-squat-bench-package.html
[AMZ-M130]: https://www.amazon.co.uk/Mirafit-Fully-Adjustable-Position-Spotter/dp/B09FQD2P8P
[MF-COLLAR-2025]: https://web.archive.org/web/20250719204805/https://mirafit.co.uk/mirafit-1-standard-weight-bar-collars.html
[MF-COLLAR-2022]: https://web.archive.org/web/20221122190637/https://mirafit.co.uk/mirafit-1-standard-weight-bar-collars.html
[AMZ-COLLAR]: https://www.amazon.co.uk/Mirafit-Standard-Weight-Clamp-Collars/dp/B077K3JVTH
[AMZ-COLLAR-IMG]: https://m.media-amazon.com/images/I/61yuzSsohQL._AC_SL1500_.jpg
[US-EZ]: https://www.ironmaster.com/products/ez-curl-bar-for-quick-lock-dumbbell-plates/
[US-SEARCH]: https://www.ironmaster.com/mm5/merchant.mvc?Screen=SRCH&Search=collar
[UK-EZ]: https://ironmaster.co.uk/products/ez-curl-bar
[EU-JSON]: https://www.ironmaster-eu.com/products.json?limit=250
