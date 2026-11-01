# Common plate-loaded gym equipment

Researched 2026-11-01 for [issue #55](https://github.com/joeuk89/plate-pool/issues/55), part of the version 3 map (#53). It answers the ticket's five questions in order. Question 4, the fields inventory format 1 needs, is the output the other tickets build on.

Units follow the source: kg for federation rules and European makers, lb for US makers, with the other unit in brackets. Every number names its source. Where sources disagree or state nothing, the text says so.

## How to read this file

- **Rule** means an IWF or IPF rule book states it.
- **Maker** means a manufacturer's product page or product sheet states it.
- **Retailer** or **review** means a stockist or reviewer states it; the maker does not.
- **Not stated** means no source found.

Sources read: IWF Technical and Competition Rules and Regulations (TCRR) 2024 ([PDF](https://pzpc.pl/download/file/7080); the April and November 2025 editions sit behind a bot wall, and the IWF's own change notes for them concern weigh-in, not equipment); IPF Technical Rules Book 2026, in force from 1 March 2026 ([PDF mirror](https://benchpresschampion.com/REGLEMENTS/IPF2026.pdf), bar and disc text identical to the [2024 edition](https://www.fpio.org.ru/data/04-docs/IPF_Technical_Rules_Book_2024_24_Jan.pdf)); product pages at Rogue (US site blocks fetches; Canada, EU and Australia mirrors used), Eleiko, York Barbell, Ironmaster, Mirafit, Titan Fitness and Rep Fitness.

## 1. Implements by kind

The four kinds come from the map: **bar** (mirrored positions, optional collars), **handle** (two ends, may be uneven), **stack** (one position), **vest** (block grid).

### 1.1 Bar

Every Olympic bar below has 50 mm (1.97 in) sleeves and takes Olympic 2 in plates. Collars are never supplied with an Olympic bar; they are mandatory in competition (IWF rule 3.3.3.8; IPF "Collars (a) Shall always be used") and usual in training. Standard 1 in bars are sold with spin-lock collars and are unusable without them.

| Implement | Bare weight | Sleeve diameter | Loadable length per side | Overall length | Collars | Source |
| --- | --- | --- | --- | --- | --- | --- |
| IWF men's bar | 20 kg (44.1 lb), tolerance +0.1 % / -0.05 % | 50 mm | 415 mm (16.3 in) | 2200 mm | 2 × 2.5 kg, mandatory | Rule: IWF TCRR 2024, Regulation to 3.3.3 |
| IWF women's bar | 15 kg (33.1 lb) | 50 mm | 320 mm (12.6 in) | 2010 mm | 2 × 2.5 kg, mandatory | Rule: same |
| IPF bar (one bar for all three lifts, no women's bar) | "bar and collars 25 kg": 20 kg bar + 2 × 2.5 kg | 50 to 52 mm | Not stated (at most about 440 mm by subtraction) | At most 2200 mm; 1310 to 1320 mm between collar faces | 2 × 2.5 kg, mandatory | Rule: IPF 2026, Bars and Discs (a) |
| Rogue Ohio Bar | 20 kg (44 lb) | 50 mm | 16.4 in (417 mm) | 86.75 in (2203 mm) | Not supplied | Maker: [Ohio bar sleeves](https://www.rogueeurope.eu/ohio-bar-sleeves); length from a [review](https://www.garagegymreviews.com/equipment/rogue-ohio-bar-cerakote) |
| Rogue Bella Bar 2.0 | 15 kg (33 lb) | 50 mm | 13.0 in (330 mm) | 79.13 in (2010 mm) | Not supplied | Maker: [Bella Bar](https://www.roguefitness.com/ca/the-bella-bar-2-0-stainless-steel) |
| Eleiko IWF Competition Bar 20 kg | 20 kg | 50 mm | 415 mm | 2200 mm | Not supplied | Maker: [Eleiko](https://eleiko.com/en/equipment/bars/weightlifting/3085893-eleiko-iwf-weightlifting-competition-bar-20-kg-men) |
| Eleiko IWF Competition Bar 15 kg | 15 kg | 50 mm | 320 mm (a retailer says 350 mm; Eleiko says 320) | 2010 mm | Not supplied | Maker: [Eleiko](https://eleiko.com/en/equipment/bars/weightlifting/3060762-eleiko-iwf-weightlifting-competition-bar-15-kg-women) |
| Rogue Curl Bar (EZ) | 30 lb (13.6 kg) | 50 mm | 10.5 in (267 mm) | 54.5 in | Not supplied | Maker: [Rogue](https://roguefitness.com/rogue-curl-bar-cerakote) |
| Rogue Rackable Curl Bar | 35 lb (15.9 kg) | 50 mm | 10.5 in | 74.75 in | Not supplied | Maker: [Rogue](https://www.roguefitness.com/ca/rogue-rackable-curl-bar) |
| Rep Curl Bar / Rackable Curl Bar | 30 lb / 35 lb | 50 mm | 10 in (254 mm) | 55 in / 74 in | Not supplied | Maker: [Rep rackable](https://repfitness.com/collections/barbells/products/rackable-curl-bar); plain bar from a [stockist](https://www.northernfitness.ca/products/rep-curl-bar) |
| Rogue TB-2 trap bar | 60 lb (27.2 kg) | 1.91 in (48.5 mm) | 16 in (406 mm) | 88.5 in | Not supplied; sub-50 mm sleeve wants axle or Proloc collars | Maker: [Rogue guide](https://support.roguefitness.com/hc/en-us/articles/47193411735444-Product-Guide-Rogue-TB-2-Trap-Bar) |
| Rep Open Trap Bar | 58.4 lb (26.5 kg) | 50 mm | 16.5 in | 84.3 in | Not supplied | Review: [Garage Gym Reviews](https://www.garagegymreviews.com/equipment/rep-fitness-open-trap-bar) |
| Titan Rackable Hex Trap Bar | Not stated by Titan (60 lb per retailers) | 48 mm | 16 in | 85 in | Not supplied | Maker: [Titan](https://titan.fitness/products/rackable-hex-trap-bar) |
| Rogue SB-1 safety squat bar | 70 lb (31.8 kg) | 50 mm | Not stated | 89 to 93 in by production run | Not supplied; HG 2.0, OSO or spring collars fit | Maker: [Rogue guide](https://support.roguefitness.com/hc/en-us/articles/47194928302484-Product-Guide-Rogue-SB-1-Safety-Squat-Bar) |
| Titan Safety Squat Bar V2 | 58 lb (26.3 kg); a review measured 61 lb | 50 mm | 14.75 in (375 mm) | 90.5 in | Not supplied | Maker: [Titan](https://titan.fitness/products/safety-squat-olympic-bar-v2) |
| Rep Safety Squat Bar | 68 lb (30.8 kg) | 50 mm | 15.6 in (396 mm) | 92.5 in | Not supplied | Maker: [Rep](https://ca.repfitness.com/products/safety-squat-bar) |
| Rogue MG-3 Swiss bar | 43 lb (19.5 kg) | 1.91 in (48.5 mm) | 14 in (356 mm) | 82 in | Not supplied; axle or Proloc collars | Maker: [Rogue guide](https://support.roguefitness.com/hc/en-us/articles/47263320519188-Rogue-MG-3-Multi-Grip-Bar) |
| Rep Cambered Swiss Bar | 45 lb (20.4 kg) | 50 mm | 14.03 in | 80.7 in | Not supplied | Maker: [Rep](https://dk.repfitness.com/products/cambered-swiss-multi-grip-barbell) |
| Titan Multi-Grip Barbell V2 | 41 lb (18.6 kg) | 48 mm | 14.5 in | 82 in | Not supplied | Maker: [Titan](https://www.titan.fitness/strength/barbells/specialty/multi-grip-barbell-v2/430122.html) |
| York 5 ft spin-lock bar (1 in) | Not stated | 1 in (25.4 mm) threaded | 11 in (279 mm) | 5 ft | 2 spin-lock collars included | Maker: [York](https://yorkbarbell.com/product/chrome-spin-lock-bar-w-spin-lock-collars) |
| York 6 ft spin-lock bar (1 in) | Not stated | 1 in threaded | 15 in (381 mm) | 6 ft | Included | Maker: same page |
| Mirafit 5 ft standard 1 in spin-lock bar | 6.5 kg (14.3 lb); whether that includes collars is not stated | 1 in threaded | Not stated | 5 ft | Included | Maker: [Mirafit](https://www.mirafit.co.uk/mirafit-1inch-spinlock-barbell-weight-bar-5ft.html) |
| Mirafit 6 ft international 1 in spin-lock bar | Not stated | 1 in threaded | 26.5 cm (10.4 in) | 186 cm | Included | Maker: [Mirafit](https://mirafit.co.uk/mirafit-6ft-international-1-spinlock-bar-silver.html) |
| Mirafit 7 ft standard 1 in bar | 8.5 kg (18.7 lb) | 1 in threaded | 39.5 cm (15.6 in) | 213 cm | Included | Maker: [Mirafit](https://mirafit.co.uk/mirafit-7ft-standard-1-barbell-with-locking-spinlock-collars.html) |
| Mirafit 1 in spin-lock EZ curl bar | About 5 kg (11 lb) | 1 in threaded | 19 cm (7.5 in); a second listing says 19.5 cm | 120 cm | Included | Maker: [Mirafit](https://mirafit.co.uk/weightlifting-arm-curl-bar.html) |
| Ironmaster Quick-Lock straight bar | About 18 lb | 1 in, Quick-Lock | 11.5 in with the collar | n/a | 2 spin-lock collars included | Repo: [equipment-specs.md](equipment-specs.md) |

Points for the schema:

- Bare weight is a maker figure for Olympic bars and often absent for standard bars. Whether a stated weight includes collars is unstated for Mirafit and Ironmaster.
- Loadable length ranges from 10 in (EZ bars) to 16.5 in (trap bars). It bounds the stack, as `positionLengthIn` does today.
- Three common bars (Rogue TB-2, Rogue MG-3, Titan hex and multi-grip) have 48 to 48.5 mm sleeves. Olympic plates fit; standard 50 mm collars do not grip. Which collars fit is a property of the pairing, which `hardware.options` already carries.
- A landmine is not an implement. The bar is the implement; one sleeve sits in the pivot tube and the other carries plates ([Rogue landmine guide](https://support.roguefitness.com/hc/en-us/articles/47884684331924-Product-Guide-Rogue-Landmines): 2 in inner diameter tube, 315 lb rated). For the calculator a landmine set-up is a one-position implement with a bar's weight as base; the felt load is not the plate weight, so it needs a fixed note like the leg attachment's.

### 1.2 Handle

| Implement | Bare weight | Post diameter | Loadable length per end | Overall length | Collars | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Rogue DB-10 loadable dumbbell | 10 lb (4.5 kg) each with collars | 50 mm | 3.625 in (92 mm) | 14.25 in (a Rogue guide says 14.5) | Collars included, in the stated weight | Maker: [Rogue](https://www.roguefitness.com/ca/rogue-loadable-dumbbells) |
| Rogue DB-15 | 15 lb (6.8 kg) each with collars | 50 mm | 6.75 in (171 mm) | 20.5 in | Included | Maker: same page |
| Rogue DB25-10 (25 mm shaft) | 9 to 10 lb; listings differ | 50 mm | 4 in | 14.5 in | Included | Maker: [Rogue guide](https://support.roguefitness.com/hc/en-us/articles/47643666809108-Product-Guide-Rogue-DB-25-10-Loadable-Dumbbells) |
| Titan loadable 15 in handle | Not stated | 50 mm | 3.5 in | 15 in | Not stated | Maker: [Titan](https://titan.fitness/products/loadable-15-in-olympic-dumbbell-handle-pair) |
| Titan loadable 20 in handle | About 12 lb (5.4 kg) | 50 mm | 6.5 in | 20 in | Not stated | Maker: [Titan](https://titan.fitness/products/loadable-20-in-olympic-dumbbell-handles-pair) |
| Titan loadable 36 in handle (single) | Not stated | 50 mm | 13.5 in | 36 in | Not stated | Maker: [Titan](https://titan.fitness/products/single-loadable-36-in-olympic-dumbbell-handle) |
| Mirafit 18 in spin-lock dumbbell bar (1 in) | 2.1 kg (4.6 lb) each with collars | 1 in threaded | 13 cm (5.1 in) | 45 cm | 2 spin-lock collars included | Maker: [Mirafit](https://mirafit.co.uk/mirafit-18inch-spinlock-dumbbell-bars-silver.html) |
| Mirafit 14 in spin-lock dumbbell bar (1 in) | 1.7 kg (3.7 lb) each with collars | 1 in threaded | 8.5 cm (3.3 in) | 35 cm | Included | Maker: [Mirafit](https://mirafit.co.uk/mirafit-spinlock-dumbbell-barbell-and-plates-set.html) |
| Ironmaster Quick-Lock dumbbell handle | 5 lb each, no screws | 1 in, Quick-Lock | Standard screw holds 3.25 in of plates; long screw 5.125 in | About 6.5 in between plates (review) | Locking screws, 2.5 lb each | Repo: [equipment-specs.md](equipment-specs.md); length from a [review](https://www.garage-gyms.com/ironmaster-quick-lock-adjustable-dumbbells-review/) |

No Rep Fitness loadable Olympic handle and no York 1 in dumbbell handle page was found.

Points for the schema:

- Olympic handles are sold as pairs and the stated weight includes their collars; Ironmaster's excludes the screws. The file must say which, so `base` needs the note it already allows, and the hardware option must be able to weigh 0 when the base already counts it.
- Loadable length per end runs from 3.5 in to 13.5 in. A 45 lb Rogue cast iron plate is 1.3 in thick, so a DB-10 holds two per end; that is the real cap, not a weight.
- Plate diameter matters on a handle: a 450 mm plate on a 14 in handle is impractical and no maker rates it. No maker publishes a maximum plate diameter; the inventory author must choose.
- Uneven ends are an Ironmaster technique (2.5 lb steps from a 2.5 lb plate on one end). On an Olympic handle with 2.5 lb plates the same trick works; on a spin-lock bar with 1.25 kg plates too. The allowance is a number per implement, not a rule.

### 1.3 Stack

| Implement | Bare weight | Post | Loadable length | Max load | Collar needed | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Titan Plate Loadable Kettlebell Swing | 8 lb (3.6 kg) | Olympic 2 in; 9 pin positions at 1 in steps (review) | Not stated | 500 lb (227 kg) | Pin, included | Maker: [Titan](https://titan.fitness/products/plate-loadable-kettlebell-swing); pins from a [review](https://www.garagegymreviews.com/titan-fitness-plate-loadable-kettlebell-swing-review) |
| Strength Shop plate loadable kettlebell | Not stated | Olympic 2 in | Not stated | 100 kg (220 lb) | Pin | Maker: [Strength Shop](https://strengthshop.eu/products/plate-loadable-adjustable-kettlebell-swing) |
| Rogue Loadable Kettlebell | Not found | Olympic 2 in | Not found | Not found | Not found | Maker guide exists but gives no numbers: [Rogue](https://support.roguefitness.com/hc/en-us/articles/47340186034964-Product-Guide-Rogue-Loadable-Kettlebell) |
| Ironmaster Quick-Lock kettlebell handle | 22.5 lb (10.2 kg) | Quick-Lock | Standard screw 3.25 in, long screw 5.125 in | 57.5 lb standard screw; 80 lb long screw | Locking screw | Repo: [equipment-specs.md](equipment-specs.md) |
| Rogue Dip Belt | 3.2 lb (1.45 kg) | 30 in, 1/4 in link chain | Any plate whose hole passes a 1/4 in chain: all 1 in and 2 in plates | No practical limit stated (webbing rated 29,400 lb) | None | Maker: [Rogue guide](https://support.roguefitness.com/hc/en-us/articles/47655692873108-Product-Guide-Rogue-Dip-Belt) |
| Rogue Echo Dip Belt | 2.15 lb (0.98 kg) | Chain, length not found | Any plate | 350 lb (159 kg) | None | Maker: [Rogue](https://www.roguefitness.com/ca/rogue-echo-dip-belt) |
| Rep Dip Belt | Not stated | 31.5 in (800 mm) steel chain | Any plate | Not stated | None | Maker: [Rep](https://repfitness.com/rep-dip-belt) |
| Landmine (bar in a Rogue, Titan or post landmine) | The bar's weight | The bar's far sleeve | The bar's sleeve length | 315 lb (143 kg) for Rogue and Titan units | As the bar | Maker: [Rogue guide](https://support.roguefitness.com/hc/en-us/articles/47884684331924-Product-Guide-Rogue-Landmines); Titan from a [review](https://www.garagegymreviews.com/equipment/titan-post-landmine) |
| Titan Leg Press Hack Squat Machine | Carriage bar 80 lb (36.3 kg); post count not stated | 49 mm | 11.25 in (286 mm) | 1000 lb (454 kg) | None stated | Maker: [Titan](https://titan.fitness/products/leg-press-hack-squat-machine) |
| Titan Vertical Leg Press | Holder bar 17 lb (7.7 kg) | 50 mm | Not stated | 400 lb (181 kg) | None stated | Maker: [Titan](https://www.titan.fitness/strength/specialty-machines/lower-body/vertical-leg-press/400573.html) |
| Titan Belt Squat Machine | Lever arm; starting resistance not found | 1.9 in (48 mm) per a review; 2 weight sleeves | 16.5 in (419 mm) | 1000 lb (454 kg) | None stated | Maker: [Titan](https://titan.fitness/products/belt-squat-machine) |
| Rogue Monster Rhino Belt Squat | Trolley 27.5 lb (12.5 kg) ± 1 lb unloaded | Not stated; 2 posts | 15.75 in (400 mm) each | No rating stated | None stated | Maker: [Rogue guide](https://support.roguefitness.com/hc/en-us/articles/47297477274516-Product-Guide-Rogue-Monster-Rhino-Belt-Squat-RM-3-Rack) |
| Ironmaster leg attachment | Lever weight not published; counts 0 | Quick-Lock, 1 in, Olympic via 12.5 in adapter | 100 lb of Quick-Lock plates | 200 lb rated | None | Repo: [equipment-specs.md](equipment-specs.md) |

Points for the schema:

- Machines with two symmetrical posts (belt squats, most leg presses) load like a bar: mirrored positions, no collars. In kind terms they are **bar** with no hardware, not stack. A single-post machine or a dip belt is **stack**.
- Base weight means something different on a machine: a carriage weight is not the resistance felt. Every machine, the landmine and the leg attachment need the fixed note that is hardcoded for the leg attachment today.
- Every stack implement in the survey takes Olympic 2 in plates; the dip belt takes any plate with a hole. "Any plate" is a list of every plate type in the file, which `accepts` can express.

### 1.4 Vest

| Implement | Empty weight | Block | Count and layout | Max | Source |
| --- | --- | --- | --- | --- | --- |
| Mirafit Adjustable Weighted Vest | Not stated | 1 kg cast iron block | 10, 20 or 30 blocks by model; pocket layout not stated | 30 kg | Maker: [Mirafit](https://mirafit.co.uk/mirafit-adjustable-weighted-vest.html); count from a [Mirafit blog](https://mirafit.co.uk/blog/weighted-vest-vs-tactical-vest/) |
| Rogue Plate Carrier | 1.12 lb (0.51 kg), medium | Rogue USA Cast vest plates in 5, 7.5, 10 and 20 lb, or Echo vest plates | One pocket front, one back, one plate each | 40 lb (18 kg) | Maker: [Rogue](https://www.roguefitness.com/ca/rogue-plate-carrier) |
| Rogue Box Weighted Vest | Not stated | 2.5 lb block | Not stated | Not stated | Maker: [Rogue guide](https://support.roguefitness.com/hc/en-us/articles/48020457666452-Product-Guide-Rogue-Vest-Weight) |
| MiR Short Weighted Vest | 3 lb (1.4 kg) | 3 lb (1.36 kg) iron block | Front and back pockets; count not stated | 20 to 60 lb by model | Maker: [Rogue guide](https://support.roguefitness.com/hc/en-us/articles/47992258677780-Product-Guide-MiR-Short-Weighted-Vest) |
| MiR Super Slim Air Flow Vest | Not stated | 0.9 lb (0.41 kg) iron weight | Not stated | 8 to 32 lb by model | Maker: [Rogue guide](https://support.roguefitness.com/hc/en-us/articles/48096101353108-Product-Guide-MiR-Super-Slim-Air-Flow-Vest) |
| Hyperwear Hyper Vest Pro / Elite | Not stated | 2.25 oz (64 g) steel piece, 1/4 in thick, two per pocket | 5 lb booster box of 36 pieces | By model | Maker: [Hyperwear](https://hyperwear.com/product/hyper-elite) |

Points for the schema:

- Empty vest weight is unpublished for every vest but the Rogue carrier and MiR Short. `base` with status unverified handles it, as today.
- Block weight runs from 64 g to 20 lb, so "vest block" is a plate type per vest, not one type.
- Pocket layout is unpublished for Mirafit. Front and back as two positions with an even split (section 6.2) is the only general rule the data supports. A plate carrier is a vest with a capacity of one plate per position, so the vest kind needs a per-position plate cap.

## 2. Plate standards

### 2.1 Which implement takes which plate type

| Plate type | Hole | Fits | Does not fit |
| --- | --- | --- | --- |
| Olympic 2 in (iron, bumper, calibrated, fractional, change) | 50.4 to 50.6 mm on Rogue and Eleiko plates; IPF rule 52 to 53 mm; IWF rule does not state a disc hole | Every 50 mm or 48 mm sleeve: Olympic bars, specialty bars, loadable Olympic handles, loadable kettlebells, dip belts, machines, Ironmaster leg attachment via adapter | 1 in bars, Quick-Lock handles |
| Standard 1 in (iron, kg or lb) | Nominal 25.4 mm; no maker states the bore. Retailers list 25.4 mm and about 24.7 mm; Decathlon sells 28 mm and 30 mm bore plates in Europe | 1 in spin-lock bars and dumbbell bars, dip belts, Ironmaster leg attachment | Olympic sleeves, Quick-Lock handles |
| Ironmaster Quick-Lock | Square plate, 1 in locking screw, 6.7 in square (maker, 5 lb plate) | Ironmaster handles, bar, kettlebell, leg attachment; 1 in bars per Ironmaster | Olympic sleeves |
| Vest block | None | The vest it ships with | Everything else |
| Vest plate (Rogue USA Cast, 5.75 lb and 8.75 lb carrier plates) | None | The carrier it is cut for; Rogue marks the 8.75 lb plate as not fitting its own Plate Carrier | Everything else |

Fractional plates come in both 2 in and 1 in bores (Rogue 2 in; Micro Gainz both), so "fractional" is a weight range inside Olympic or standard, not a plate type of its own. The inventory needs no separate fractional type; it needs small plates listed under the type whose bore they have.

### 2.2 Olympic calibrated and competition plates (kg)

IWF discs (TCRR 2024 rule 3.3.3.6 and Regulation to 3.3.3 item 6): diameter 450 mm ± 1 mm for 10 kg and above; smaller discs at most 450 mm with per-weight ranges. Weight tolerance +0.1 % / -0.05 % above 5 kg, +10 g / -0 g at 5 kg and below; training discs ± 0.8 %. Hole diameter not stated for discs (collar hole is 50 mm). Colours: 25 red, 20 blue, 15 yellow, 10 green, 5 white, 2.5 red, 2 blue, 1.5 yellow, 1 green, 0.5 white.

| kg | IWF max thickness | IWF diameter | Eleiko IWF competition plate | Rogue IWF competition / change plate |
| --- | --- | --- | --- | --- |
| 25 | 67 mm | 450 mm | 450 × 58 mm | 450 × 66 mm |
| 20 | 54 mm | 450 mm | 450 × 50 mm | 450 × 55 mm |
| 15 | 43 mm | 450 mm | 450 × 39 mm | 450 × 42 mm |
| 10 | 35 mm | 450 mm | 450 × 35 mm | 450 × 29 mm |
| 5 | 26.5 mm | 230 to 260 mm | 240 × 27 mm | 230 × 26 mm |
| 2.5 | 23 mm | 190 to 220 mm | 216 × 23 mm | 210 × 19 mm |
| 2 | 22 mm | 155 to 193 mm | 193 × 22 mm | 190 × 19 mm |
| 1.5 | 20 mm | 139 to 175 mm | 170 × 20 mm | 175 × 18 mm |
| 1 | 19 mm | 118 to 160 mm | 148 × 19 mm | 160 × 15 mm |
| 0.5 | 16 mm | 97 to 137 mm | 127 × 16 mm | 135 × 12.5 mm |

Sources: Eleiko product sheets, articles 3085231 and 3085260 (hole 50.5 mm ± 0.05, tolerance ± 0.05 %); [Rogue KG Competition Plates](https://www.rogueaustralia.com.au/rogue-kg-competition-plates-iwf-au) (hole 50.4 mm, ± 15 g) and [Rogue KG Change Plates](https://www.roguecanada.ca/rogue-kg-change-plates) (± 10 g).

IPF discs (Technical Rules Book 2026, Bars and Discs (b)): range 1.25, 2.5, 5, 10, 15, 20, 25 kg (no 50 kg disc in the rules; 0.25, 0.5 and 1 kg allowed for record attempts). Hole 52 to 53 mm. Thickness at most 60 mm for 20 kg and over, 30 mm for 15 kg and under. Diameter at most 450 mm. Tolerance ± 0.25 % or ± 10 g. Colours: 25 red, 20 blue, 15 yellow; 10 kg and below any colour. Loading order: heaviest innermost, first disc face in, the rest face out.

| kg | Eleiko IPF plate (diameter × thickness) | Rogue Calibrated KG Steel (diameter; thickness not published) |
| --- | --- | --- |
| 50 | Not in range | 450 mm |
| 25 | 450 × 27 mm, red | 450 mm |
| 20 | 450 × 20 mm, blue | 450 mm |
| 15 | 400 × 19 mm, yellow | 400 mm |
| 10 | 325 × 19 mm, green | 325 mm |
| 5 | 228 × 20 mm, white | 228 mm |
| 2.5 | 190 × 15 mm, black | 190 mm |
| 1.25 | 160 × 12 mm, chrome | 160 mm |
| 0.5 | 134 × 8 mm | 134 mm |
| 0.25 | 112 × 7 mm | 112 mm |

Sources: Eleiko product sheets, article 3060350 (tolerance ± 0.25 %, or ± 10 g at 2.5 kg and below); [Rogue Calibrated KG Steel Plates](https://rogueaustralia.com.au/rogue-calibrated-kg-steel-plates-au) (hole 50.4 mm, ± 10 g). Rogue's hole is below the IPF 52 mm minimum.

Disagreements between the federations: disc hole (IWF unstated; IPF 52 to 53 mm), tolerance, thickness limits, the disc set (IWF has 2, 1.5 and 0.5 kg and no 1.25; IPF has 1.25 and 0.25 and no 2 or 1.5), colours below 15 kg, the women's bar (IWF yes; IPF no).

### 2.3 Olympic iron and bumper plates (lb and kg)

| Plate | 45 lb / 20 kg | 35 lb / 15 kg | 25 lb / 10 kg | 10 lb / 5 kg | 5 lb / 2.5 kg | 2.5 lb / 1.25 kg | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Rogue Olympic cast iron (lb), hole 50.6 mm, ± 3 % | 17.5 × 1.3 in | 14.0 × 1.3 in | 10.9 × 1.4 in | 8.9 × 0.9 in | 7.75 × 0.6 in | 6.3 × 0.5 in | Maker: [Rogue](https://www.roguecanada.ca/rogue-olympic-plates) |
| York 2 in cast iron (lb), hole not stated | 17.5 × 1.5 in | 14.125 × 1.5 in | 11.375 × 1.75 in | 7.375 × 1 in | 6.5 × 0.75 in | 5.625 × 0.5 in | Maker: [York](https://yorkbarbell.com/product/2-inch-cast-iron-olympic-plate/) |
| Rogue USA machined (lb), hole 50 mm; 55 lb 450 × 26.75 mm | 450 × 22.75 mm | 400 × 22.5 mm | 325 × 23.75 mm | 229 × 20 mm | 190 × 14.5 mm | 160 × 11.5 mm; 1 lb 135 × 7.5; 0.5 lb 112 × 6.5; 0.25 lb 107 × 4.5 | Maker: [Rogue](https://www.roguecanada.ca/rogue-usa-olympic-plate) |
| Rogue Echo bumper V2 (lb), 450 mm, hole 50.6 mm, ± 1 % | 2.40 in | 1.90 in | 1.50 in | 0.83 in (15 lb: 1.04 in) | n/a | n/a | Maker: [Rogue](https://www.roguecanada.ca/rogue-echo-bumper-plates); Rogue's MIL Spec Echo page lists 45 lb at 2.72 in |
| Rogue Hi-Temp bumper (lb), 445 mm, ± 0.5 lb | 3.75 in | 3.12 in | 2.25 in | 1.37 in (15 lb: 1.87 in) | n/a | n/a | Maker: [Rogue](https://roguecanada.ca/rogue-hi-temp-bumper-plates) |
| Rogue Color Echo bumper (kg), 450 mm; 25 kg 70 mm | 58 mm | 47 mm | 34 mm | 24 mm (unverified) | n/a | n/a | Maker: [Rogue EU](https://www.roguefitness.com/eu/rogue-color-echo-bumper-plate-eu) |
| Mirafit extra thin cast iron (kg); 25 kg 450 × 26 mm | 450 × 21 mm | 400 × 21 mm | 325 × 21 mm | 240 × 19.5 mm | 216 × 12.5 mm | 180 × 10 mm | Maker: [Mirafit](https://mirafit.co.uk/mirafit-extra-thin-cast-iron-plates.html) |
| Mirafit black deep dish (kg); 25 kg 450 × 45 mm | 450 × 40 mm | 360 × 36 mm | 325 × 32 mm | 230 × 32 mm | 200 × 23 mm | 160 × 16 mm | Maker: [Mirafit](https://mirafit.co.uk/mirafit-black-deep-dish-olympic-weight-plates.html) |
| Mirafit cast iron tri-grip (kg), diameter only; 25 kg 400 mm | 400 mm | 380 mm | 340 mm | 260 mm | 189 mm | 153 mm | Maker: [Mirafit](https://mirafit.co.uk/mirafit-grey-cast-iron-2-olympic-weight-plates.html) |

Titan cast iron: 162 to 448 mm diameter, hole 50.5 mm, 2.5 lb 15 mm and 45 lb 38 mm thick ([Titan](https://www.titan.fitness/products/245-lb-set-cast-iron-olympic-plates)). Rep Equalizer iron: 45 lb 17.7 in diameter, 1.5 or 1.6 in thick depending on the stockist; Rep's own table was unreachable.

What this means: a 45 lb plate is 0.89 in (machined), 1.3 to 1.5 in (cast), 2.4 to 2.8 in (Echo bumper) or 3.75 in (Hi-Temp) thick. On a 10.5 in EZ bar sleeve that is eleven, seven, four or two plates per side. Stack length per plate is a real field for every plate, not an Ironmaster quirk.

### 2.4 Standard 1 in plates

| Plate | 50 lb | 35 lb | 25 lb | 10 lb | 5 lb | 2.5 lb | 1.25 lb | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| York 1 in contour cast iron | 14 × 1.75 in | 13 × 1.5 in | 11 × 1.375 in | 7.75 × 1 in | 5.75 × 1 in | 4.625 × 0.875 in | n/a | Maker: [York](https://yorkbarbell.com/product/1-inch-standard-contour-cast-iron-plate) |
| York 1 in flat pro cast iron | 14.375 × 1.25 in | n/a | 11 × 1.125 in | 8 × 0.875 in | 6.25 × 0.75 in | 5 × 0.625 in | 3.875 × 0.5 in | Maker: [York](https://yorkbarbell.com/product/1-inch-standard-flat-pro-cast-iron-plate) |
| Mirafit 1 in tri-grip (kg), diameter only | 20 kg 385 mm | n/a | n/a | 5 kg 230 mm | 2.5 kg 180 mm | 1.25 kg 155 mm | n/a | Maker: [Mirafit](https://mirafit.co.uk/mirafit-cast-iron-1-tri-grip-weights.html) |

No maker states the bore. Fit between brands is not guaranteed, which is why a plate type should name the bore it was bought for and an implement list the types that fit it.

### 2.5 Fractional plates

| Plate | Bore | Diameter | Thickness | Source |
| --- | --- | --- | --- | --- |
| Rogue LB Fractional 1, 0.75, 0.5, 0.25 lb | 50.4 mm | 130, 125, 120, 120 mm | 0.55, 0.50, 0.45, 0.35 in | Maker: [Rogue](https://www.roguecanada.ca/rogue-lb-fractional-plates) |
| Rogue KG Fractional 0.25, 0.125 kg | 50.4 mm | 120 mm | 0.50, 0.35 in | Maker: [Rogue](https://www.roguecanada.ca/rogue-kg-fractional-plates); 0.5 and 1 kg are change plates (2.2) |
| Micro Gainz Olympic 1, 0.75, 0.5, 0.25 lb | 2 in | 3.5 in | 0.651, 0.481, 0.323, 0.164 in | Retailer: [Barbell Logic](https://store.barbell-logic.com/product/micro-gainz-olympic-size-fractional-weight-plates-set-of-8-plates-25lb-1lb-w-bag/) |
| Micro Gainz standard 0.25 to 1.25 lb | 1 in | Not stated | Not stated | Retailer listings only |
| Ironmaster micro plate 1.25 lb | Quick-Lock | Round | 0.25 in stack length (derived) | Repo: [equipment-specs.md](equipment-specs.md) |

### 2.6 Quick-Lock and vest blocks

Ironmaster publishes a 6.7 × 6.7 in face for the 5 lb plate ([Ironmaster](https://www.ironmaster.com/products/5-lb-plates-4-pack/)) and no thickness for any plate. The repo's derived stack lengths stand. Vest blocks: Mirafit 1 kg cast iron; MiR 0.9 lb, 1.5 to 3 lb by model; Rogue Box vest 2.5 lb; Hyperwear 64 g pieces. No dimensions are published for any block.

## 3. Collars and locks

| Hardware | Fits | Weight each | Width on the sleeve | Source |
| --- | --- | --- | --- | --- |
| Spring clip, 2 in | 50 mm sleeves | Not stated by Rogue or Rep. York pair 0.45 to 0.5 kg; Body-Solid pair 0.3 or 0.5 lb, listings differ; Life Fitness pair 1 lb. About 0.25 kg (0.5 lb) each | Not stated | Maker: [Rogue spring collars](https://www.roguecanada.ca/spring-collars); retailer: [York pair](https://www.fitness-superstore.co.uk/york-olympic-spring-collar-pair.html) |
| Rogue HG 2.0 clamp | 50 mm | 0.85 lb per pair (0.43 lb each) | 1.875 in | Maker (via Rogue listing) |
| Lock-Jaw Pro 2 | 50 mm | 16 oz per pair (8 oz, 0.23 kg each); one stockist says 13 oz per pair | 2 in (51 mm) deep | Retailer: [BFS](https://www.biggerfasterstronger.com/products/torque-pr2-pro-blk); [Life Fitness](https://lifefitness.com/en-gb/catalog/accessories/barbells-plates/lock-jaw-pro-2-collar) |
| OSO Mighty 2.0 | 50 mm | 0.3 lb per pair (0.15 lb, 68 g each) | 1.4 in (36 mm) | Maker listing: [Rogue](https://www.roguecanada.ca/oso-mighty-collars-multi-color) |
| Rogue KG Competition Collar | 50 mm | 2.5 kg, -0 / +10 g; IWF and IPF approved | About 3 to 3.625 in (77 to 92 mm) | Maker: [Rogue](https://www.roguecanada.ca/rogue-kg-competition-collars) |
| Eleiko IWF Competition Collar (3002404) | 50 mm | Not stated by Eleiko; 2.5 kg by rule | 40 mm | Maker: Eleiko product page (now 404) |
| Eleiko Competition Collar (3085701, IWF / IPF / WPPO) | 50 mm | Not stated; 2.5 kg by rule | 60 mm; "adds 33 mm loadable space" against IPF-style collars, so those are about 93 mm | Maker: [Eleiko](https://eleiko.com/en/equipment/collars/3085701-eleiko-competition-collar-pair) |
| Strength Shop IPF-style collar | 50 mm | 2.5 kg, +10 / -0 g | 94 mm (120 mm overall) | Maker: [Strength Shop](https://www.strengthshop.co.uk/collections/collars/products/calibrated-2-5kg-weightlifting-collars-pair) |
| IWF rule collar | 50 mm hole | 2.5 kg, +10 / -0 g | At most 70 mm | Rule: IWF TCRR 2024, Regulation to 3.3.3 item 8 |
| IPF rule collar | 50 to 52 mm | 2.5 kg | Not stated | Rule: IPF 2026, Collars |
| York 1 in spin-lock collar | 1 in threaded bars | Not stated by York; a retailer says 0.5 lb | 3 in outer diameter; width not stated | Retailer: [Marchants](https://www.marchants.com/york-1-spin-lock-collar/) |
| Mirafit spin-lock collar | 1 in threaded bars | Not stated; a 14 in dumbbell bar is 1.7 kg with both collars | Not stated | Maker: [Mirafit](https://www.mirafit.co.uk/mirafit-14-spinlock-dumbbell-bars-black.html) |
| Mirafit 1 in clamp collar | 1 in bars | Not published; counts 0 | 1.26 in (retailer image) | Repo: [equipment-specs.md](equipment-specs.md) |
| Ironmaster standard locking screw | Quick-Lock handles | 2.5 lb | Holds 3.25 in of plates | Repo |
| Ironmaster long locking screw | Quick-Lock handles | 2.5 lb nominal, about 3 lb real | Holds 5.125 in of plates | Repo |
| Ironmaster spin-lock collar (bar) | Ironmaster bar | Not published; owner weighed 433 g | Not stated | Repo |

Points for the schema:

- Collar weight runs from 0 (nylon clamp) to 2.5 kg (competition). It belongs in the total, as today.
- Collar width runs from 36 mm to 94 mm and takes sleeve room, as `widthIn` says today. Few makers publish it.
- IWF collars may be designed for "inside loading for 2 kg or less" (Regulation item 8): small plates outside the collar are a competition practice the rules allow. The calculator can treat it as a position that ignores the collar's width, or ignore it. Nothing in version 3 needs it.
- Whether collars are required is a property of the pairing. IWF and IPF bars require them; a spin-lock bar cannot hold plates without them; machines and dip belts take none. Today `hardware.options` without `"none"` means required, which covers every case.

## 4. Fields format 1 needs that today's schema lacks

Today's schema is `inventory/inventory.schema.json`. The table lists each gap with its one-line reason. "Entity" names where the field lives.

| Entity | Field | Reason |
| --- | --- | --- |
| file | `format` (integer, required, 1) | Decided on the map: unknown formats are refused by name. |
| file | `name` (string) | One named kit on the device at a time; the kit screen and the `achievable` header need a name to show. |
| file | one length unit for the whole file (`lengthUnit`: `mm` or `in`), replacing the `In` suffix on `stackLengthIn`, `capacityIn`, `minStackIn`, `widthIn` and `positionLengthIn` | Every federation and European maker publishes mm; US makers publish inches. An inch-only file cannot be authored from a kg gym's spec sheets without conversion. |
| plate type | `bore` (closed list: `olympic`, `standard`, `quick-lock`, `block`, `carrier`) | Says which family of sleeve the plates fit, so a loader can refuse an implement that lists a type with the wrong bore and the picture can draw the right hole; `accepts` alone carries no check. |
| plate | `diameter` (number, in the file's length unit) | A 450 mm plate does not go on a 14 in dumbbell handle or a loadable kettlebell; and the drawing today sizes plates by five hardcoded weights (map "not yet specified"). |
| plate | `colour` (string, optional) | IWF and IPF colours and bumper colours are fixed per weight in kg; the drawing today keys colours to five Quick-Lock weights. |
| plate | `stackLength` required for every plate whose type has a sleeve bore | Thickness decides how many plates fit a sleeve: 2 to 11 plates of 45 lb per side on a 10.5 in EZ bar depending on make. Today it is optional and unused for anything but Quick-Lock. |
| plate | `shape` gains `hexagonal` / `twelve-sided`; `square` stays | Rogue, York and Rep sell 12-sided and hex plates; the picture needs the silhouette. (Minor; `round` covers the maths.) |
| implement | `kind` (closed list: `bar`, `handle`, `stack`, `vest`) | Decided on the map: the kind carries the loading rules. Today the rules are hardcoded per implement id. |
| implement | `picture` (closed list, optional, default per kind) | Decided on the map; question 5 gives the list. |
| implement | `maxPerPosition` (map of plate id to count) | Generalises two hardcoded Ironmaster rules: at most one micro plate per side, at most one 22.5 lb plate on the kettlebell. The Rogue plate carrier needs one plate per pocket. |
| implement | `maxPlateDiameter` (number, optional) | Handles and loadable kettlebells cannot take full-size plates; no maker rates it, so the author sets it. |
| implement | `unevenAllowance` (number in the implement's unit, handle kind only) | Today 2.5 lb is hardcoded for the Ironmaster dumbbell. Olympic handles with 2.5 lb plates and spin-lock bars with 1.25 kg plates use the same trick; 0 means even only. |
| implement | `unevenAllowanceRelaxed` (number, optional) | Today's "5 lb when every small plate is in use" rule, as data; omit it and the relaxation is off. Ironmaster-specific in practice. |
| implement | `note` (string, optional, fixed note on every result) | Today hardcoded for the leg attachment. Machines and landmines need the same: the plate weight is not the felt resistance. |
| implement | `baseIncludesHardware` (boolean, default false) | Rogue, Mirafit and York state handle and bar weights with their collars; Ironmaster states them without. Without the flag the collars count twice or not at all. |
| hardware | `kind` gains `pin` | Loadable kettlebells lock with a pin at one of several heights; it weighs something and takes no sleeve room. |
| hardware | `minStack` and `capacity` become optional on every kind, not screw-only | A spin-lock collar needs thread left to bite on; a competition collar has a minimum stack of 0. Both are the same shape of rule. |

Fields the current schema already has that the survey confirms as generic: `plateTypes[].unit`, `plates[].count` and `countStatus`, `value.listed` / `measured` / `status` / `note`, `hardware[].weight` and `widthIn`, `implements[].base`, `positions`, `symmetric`, `accepts`, `hardware.options` / `default` / `perPosition`, `maxPlateWeight`, `maxTotal`, `positionLengthIn`.

### 4.1 Ironmaster-only in today's schema

| Where | What | Why it is Ironmaster-only |
| --- | --- | --- |
| `hardware.kind` | `screw` | Only Quick-Lock uses a locking screw that is both the lock and 2.5 lb of the total. Every other system is a collar, a pin or nothing. Keep it; it is one value of a closed list. |
| `hardware.capacityIn` | Stack length a screw holds | A property of the Quick-Lock screw's thread length. A collar has no capacity; the sleeve length caps the stack. Make it optional on every kind (above) rather than screw-only. |
| `hardware.minStackIn` | Shortest stack a long screw locks on | Same: a thread-length property. Generic in shape, Ironmaster in fact. |
| `plates[].shape: square` | Square plate face | Quick-Lock plates are the only square plates in the survey. Keep the value; add round variants. |
| `plates[].stackLengthIn` as unverified, derived numbers | Ironmaster publishes no thickness | Every other maker in section 2 publishes thickness. The field is generic; the unverified status is Ironmaster's. |
| Every `*In` length field | Inches only | Ironmaster designs in lb and inches. Half the survey is in mm. |
| `implements[].maxPlateWeight` on the barbell (210 lb) | Ironmaster's bar rating | Generic field, Ironmaster value. Fine. |
| Rules in spec section 6.2 that the schema does not hold | Micro plate cap, 22.5 lb cap, uneven 2.5 lb and 5 lb, screw choice by weight, long-screw warning on the kettlebell, the leg attachment note | These are code today, not data. The fields above turn each into data; screw choice by weight is already derivable from `capacity`, so it needs no field. |

## 5. Which implements need their own drawing

The default drawing per kind: **bar** is a straight bar with two mirrored sleeves; **handle** is a short bar with two ends; **stack** is one vertical post with plates on it; **vest** is a block grid, front and back.

| Implement | Drawing | Why |
| --- | --- | --- |
| Olympic men's and women's bars, standard 1 in bars, Ironmaster bar | Bar default | A straight bar. Sleeve length and plate diameter change the proportions, not the picture. |
| EZ curl bar | Bar default, or an `ez` variant | The plates sit on straight sleeves; only the shaft differs. A variant is cosmetic. |
| Trap or hex bar | Own: `trap` | The sleeves sit beside the lifter, parallel, inside a frame. The default's end-on sleeves mislead. |
| Safety squat bar | Own: `safety-squat` | The yoke and camber put the sleeves below the shaft; recognisable at a glance and the plate stacks still read left and right. |
| Swiss or multi-grip bar | Bar default, or a `swiss` variant | Straight sleeves either side of a frame; the default reads correctly. |
| Loadable Olympic dumbbell handle, spin-lock dumbbell bar, Ironmaster dumbbell | Handle default | Two ends, plates inwards. |
| Loadable kettlebell (Titan, Rogue) | Own: `kettlebell` | A vertical post under a handle; plates stack upward. The stack default is close, so this can be the stack default's shape with a handle on top. |
| Ironmaster kettlebell | Same `kettlebell` drawing | Same silhouette. |
| Dip belt | Own: `dip-belt` | Plates hang on a chain; the stack is vertical but below the belt, and the picture should not look like a post. |
| Landmine | Own: `landmine` | One sleeve loaded, the bar angled from the floor. No default has one loaded end on a two-ended bar. |
| Leg press, hack squat | Own: `leg-press` | A carriage with pegs; the default post is misleading. One drawing covers both. |
| Belt squat (two posts) | Bar default with no collars | Two mirrored posts on a trolley read fine as a bar with no shaft detail; a `belt-squat` variant is optional. |
| Ironmaster leg attachment | Stack default | A single horizontal peg; the default post suffices. |
| Weighted vest with blocks | Vest default | Grid front and back. |
| Plate carrier | Vest default with capacity 1 per position | One large block per pocket; the grid degenerates to two cells. |

So the closed list for `picture` is: `bar`, `ez`, `trap`, `safety-squat`, `swiss`, `handle`, `stack`, `kettlebell`, `dip-belt`, `landmine`, `leg-press`, `vest`. Six are new drawings beyond the four defaults: `trap`, `safety-squat`, `kettlebell`, `dip-belt`, `landmine`, `leg-press`. `ez` and `swiss` are variants a build may skip in favour of the bar default.

## Not found

Rogue SB-1 sleeve length; Rogue calibrated lb plate thickness; York plate bores; Mirafit tri-grip thickness and 1 in bore; Mirafit vest pocket layout and empty weight; Eleiko collar weights; any maker's spring collar weight; Ironmaster 22.5 lb plate thickness; Titan leg press post count; Titan belt squat starting resistance; a Rep loadable Olympic handle; a York 1 in dumbbell handle; the IWF 2025 TCRR text.
