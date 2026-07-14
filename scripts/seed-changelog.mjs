#!/usr/bin/env node
/**
 * Seed the historical LTCL list changelog into the dynamic `changelog`
 * collection that the LTCL home page now reads live. Parses the original
 * "pakeitimu sarasas" text (embedded below), standardizes the same typos we
 * cleaned earlier, splits each line into { level, text } and writes one doc
 * per change.
 *
 * Idempotent: doc IDs are deterministic (`<date>-<index>`), so re-running
 * overwrites the same docs instead of creating duplicates.
 *
 * ts is derived from each entry's date so the seeded history sorts correctly
 * below any changes logged automatically from now on.
 *
 * Usage:
 *   node scripts/seed-changelog.mjs
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SOURCE = `2022-06-20
Crackman Is Racist įdėtas į 22 vietą, virš Slicker Challenge ir po Epilogas.
KandyMan Never Clear perkeltas iš 20 vietos į 18, virš Shredda ir po Holy Moly.
Epilogas perkeltas iš 21 vietos į 19, virš Shredda ir po KandyMan Never Clear.
Tursta challenge įdėtas į 7 vietą, virš Burnt Nachos is yay ir po Clap of yolomodeboom.
Ice never caved įdėtas į 10 vietą, virš notdanz challenge ir po Natura Electrum.
MAXIMA CHALLENGE įdėtas į 19 vietą, virš Holy Moly ir po mano lygis.
nostalgia bait įdėtas į 26 vietą, po Slick Challenge.
I LOVE IKEA įdėtas į 16 vietą, virš Maxima challenge ir po mano lygis.
mallory įdėtas į 21 vietą, virš Shredda ir po Epilogas.
Resent įdėtas į 27 vietą, virš amber ir po HARMOGUS.
Fever Dream įdėtas į 15 vietą, virš mano lygis ir po Say Gex.
Harmyko Challenge 2 pašalintas iš sąrašo dėl reikalavimų neatitikimo.
Turtle Challenge 2 pašalintas iš sąrašo dėl reikalavimų neatitikimo.
spacethug never clear pašalintas iš sąrašo dėl reikalavimų neatitikimo.
notdanz challenge pašalintas iš sąrašo dėl reikalavimų neatitikimo.

2022-06-21
danz challenge įdėtas į 11 vietą, virš riktus ir po Air Tech 59 wave.
Madhouse challenge įdėtas į 12 vietą, virš riktus ir po danz challenge.
Resent perkeltas iš 30 vietos į 28, virš Slicker Challenge ir po Crackman Is Racist.
Slickest Challenge įdėtas į 28 vietą, virš Resent ir po Crackman Is Racist.
FUNC 1 įdėtas į 21 vietą, virš Holy Moly ir po Maxima challenge.
harmyko challenge 3 įdėtas į 29 vietą, virš Slickest Challenge ir po Crackman Is Racist.
wtaer įdėtas į 36 vietą, virš nostalgia bait ir po Slick Challenge.
grsas įdėtas į 36 vietą, virš wtaer ir po Slick Challenge.
snad įdėtas į 36 vietą, virš grsas ir po Slick Challenge.
Unnamed 394 įdėtas į 34 vietą, virš amber ir po HARMOGUS.

2022-06-22
Akropolis įdėtas į 36 vietą, virš Slick Challenge ir po amber.
FUNC 1 perkeltas iš 21 vietos į 19, virš I LOVE IKEA ir po mano lygis.
Atspindziai įdėtas į 42 vietą, po nostalgia bait.
Akropolis perkeltas iš 36 vietos į 32, virš Slicker Challenge ir po Resent.
Madhouse challenge perkeltas iš 12 vietos į 22, virš Holy Moly ir po MAXIMA CHALLENGE. 

2022-06-23
Epilogas perkeltas iš 24 vietos į 20, virš I I LOVE IKEA ir po FUNC 1.
Epilogas ir FUNC 1 sukeisti vietomis, Epilogas dabar aukščiau.
Lifrana įdėtas į 19 vietą, virš FUNC 1 ir po Epilogas.
The Second Variant įdėtas į 32 vietą, virš Resent ir po Slickest Challenge.
Pizdabybiskes įdėtas į 45 vietą, po Atspindziai.
Bic Lighter įdėtas į 39 vietą, virš Slick Challenge ir po Amber.

2022-06-27
The Second Variant perkeltas į 39 vietą, virš Bic Lighter ir po Amber.
RGB Skraidymas įdėtas į 39 vietą, virš The Second Variant ir po Amber.
oleki challenge idėtas į 38 vietą, virš Amber ir po Unnamed 394.
Kandyman challenge pašalintas iš sąrašo dėl reikalavimų neatitikimo.
3 click hell pašalintas iš sąrašo dėl reikalavimų neatitikimo.
Fourty pašalintas iš sąrašo dėl reikalavimų neatitikimo.
Tursta Challenge pašalintas iš sąrašo dėl reikalavimų neatitikimo.
Ice Never Caved pašalintas iš sąrašo dėl reikalavimų neatitikimo.
Silent Flight pašalintas iš sąrašo dėl reikalavimų neatitikimo.
mano lygis pašalintas iš sąrašo dėl reikalavimų neatitikimo.
Crackman is racist pašalintas iš sąrašo dėl reikalavimų neatitikimo.
Pykinimas įdėtas į 44 vietą, po Pyzdabybiškės.
Pykinimas perkeltas į 42 vietą, virš Atspindziai ir po nostalgia bait.
Crackman is racist įdėtas į 23 vietą, virš The Hell Wave ir po aurisa.

2022-06-28
Silent Flight įdėtas į 9 vietą.
Lifrana ir Silent Flight sukeisti vietomis, Lifrana dabar aukščiau.
musu lygis įdėtas į 8 vietą, virš Banana Juice Strat ir po riktus.
Rip įdėtas į 37 vietą, virš RGB Skraidymas ir po bic lighter.
Kandyman Never Clear perkeltas į 14 vietą, virš Silent Flight ir po Epilogas.

2022-06-30
piktzole įdėtas į 18 vietą, virš MAXIMA CHALLENGE ir po I LOVE IKEA.

2022-07-01
Silent Flight pašalintas iš sąrašo dėl reikalavimų neatitikimo.
Air Tech 59 wave pašalintas iš sąrašo dėl reikalavimų neatitikimo.

2022-07-02
Reddit Landscape įdėtas į 33 vietą, virš Amber ir po oleki challenge.

2022-07-03
kandyman chamber įdėtas į 21 vietą, virš Shredda ir po mallory.
DR nefario clear įdėtas į 14 vietą, virš FUNC 1 ir po KandyMan Never Clear.
Fever Dream ir Say Gex sukeisti vietomis, Fever Dream dabar aukščiau.
Melyninis Miau įdėtas į 41 vietą, virš Slick Challenge ir po Rip.
v O i D ir LIDL įdėti tarp piktzole ir I LOVE IKEA, 17 ir 18 vietos.

2022-07-04
harmyko challenge pašalintas iš sąrašo dėl reikalavimų neatitikimo.
danz challenge pašalintas iš sąrašo dėl reikalavimų neatitikimo.
MAXIMA CHALLENGE pašalintas iš sąrašo dėl reikalavimų neatitikimo.
The Hell Wave pašalintas iš sąrašo dėl reikalavimų neatitikimo.
Atspindziai pašalintas iš sąrašo dėl reikalavimų neatitikimo.
kamuoliuko isbandyma įdėtas į 38 vietą, virš Bic Lighter ir po The Second Variant.

2022-07-11
lost įdėtas į 4 vietą, virš riktus ir po Natura Electrum.
leaves  be brown įdėtas į 14 vietą, virš FUNC 1 ir po DR nefario clear.
MCTTN įdėtas į 33 vietą, virš Unnamed 394 ir po HARMOGUS.
Rip pašalintas iš sąrašo.
mallory pašalintas iš sąrašo.
MCTTN perkeltas iš 32 vietos į 35, virš Amber ir po Reddit Landscape.
v O i D perkeltas į 1 vietą, virš Clap of yolomodeboom.
TRIEDALAS įdėtas į 49 vietą, po Pizdabybiskes.

2022-07-12
myzalas įdėtas į 42 vietą, virš Slick Challenge ir po Melyninis Miau.
LIDL perkeltas į 16 vietą, virš FUNC 1 ir po leaves  be brown.
Melyninis Miau perkeltas į 31 vietą, virš HARMOGUS ir po Slicker Challenge.

2022-07-16
SurFaced įdėtas į 17 vietą, virš FUNC 1 ir po LIDL.
Slicker Challenge ir oleki challenge sukeisti vietomis, oleki challenge dabar aukščiau.
Į legacy sąrašą išstumiamas TRIEDALAS.

2022-07-18
MAXIMA IS COOL įdėtas į 22 vietą, virš Holy Moly ir po MadHouse challenge.
Į legacy sąrašą išstumiamas Pizdabybiskes.

2022-07-21
MadHouse challenge perkeltas į 24 vietą, virš Shredda ir po kandyman chamber.
Slickest Challenge ir Akropolis sukeisti vietomis, Slickest Challenge dabar aukščiau.
nokia spider įdėtas į 43 vietą, virš Bic Lighter ir po kamuoliuko isbandyma.
Į legacy sąrašą išstumiami Pizdabybiskes ir Pykinimas.

2022-07-22
random Things įdėtas į 30 vietą, virš Resent ir po Akropolis.
Į legacy sąrašą išstumiamas nostalgia bait.

2022-08-04
robot never clear įdėtas į 6 vietą, virš riktus ir po lost.
Į legacy sąrašą išstumiamas wtaer.

2022-08-06
Holy Moly perkeltas į 22 vietą, virš piktzole ir po I LOVE IKEA.
3 seconds RGB įdėtas į 19 vietą, virš FUNC 1 ir po SurFaced.
Adrenalinas įdėtas į 25 vietą, virš kandyman chamber ir po MAXIMA IS COOL.
Degtine įdėtas į 39 vietą, virš Unnamed 394 ir po HARMOGUS.
Į legacy sąrašą išstumiami Slick Challenge, snad ir grsas.

2022-08-09
Have fun įdėtas į 34 vietą, virš Resent ir po random Things.
lost perkeltas į 4 vietą, virš Natura Electrum ir po burnt nachos is yay.

2022-08-10
Jack Daniels įdėtas į 35 vietą, virš Resent ir po Have fun.
Pavirsius įdėtas į 40 vietą, virš HARMOGUS ir po Melyninis Miau.
twitter users įdėtas į 45 vietą, virš Reddit Landscape ir po Slicker Challenge.
Į legacy sąrašą išstumiami Bic Lighter, nokia spider ir kamuoliuko isbandyma.

2022-08-11
MAXIMA IS COOL perkeltas į 21 vietą, virš I LOVE IKEA ir po FUNC 1.

2022-08-14
ABSOLUT įdėtas į 47 vietą, virš MCTTN ir po Reddit Landscape.

2022-08-18
lost perkeltas į 5 vietą, virš robot never clear ir po Natura Electrum.
leaves be brown perkeltas į 14 vietą, virš KandyMan Never Clear ir po Epilogas.
actimel įdėtas į 25 vietą, virš piktzole ir po FCL IS BIASED.
hematogenas įdėtas į 39 vietą, virš Slickest Challenge ir po Resent.
Į legacy sąrašą išstumiami Amber ir MCTTN.

2022-08-20
Slickest Challenge (taiga) įdėtas į 37 vietą, virš Jack Daniels ir po Have fun.
Į legacy sąrašą išstumiamas ABSOLUT.

2022-08-21
KasSkaitysTasGaidys įdėtas į 45 vietą, virš HARMOGUS ir po Pavirsius.
FCL IS BIASED perkeltas į 28 vietą, virš MadHouse Challenge ir po kandyman chamber.
Į legacy sąrašą išstumiamas Reddit Landscape.

2022-08-25
Blindness įdėtas į 10 vietą, virš Lifrana ir po Banana Juice Strat.
Į legacy sąrašą išstumiamas twitter users.

2022-09-18
leaves  be brown pašalintas iš sąrašo, nes buvo ištrintas iš GD serverių.
mr mitten įdėtas į 9 vietą, virš Banana Juice Strat ir po musu lygis.
GTA V MOD MENU PC įdėtas į 19 vietą, virš SurFaced ir po LIDL.
Į legacy sąrašą išstumiamas Slicker Challenge.

2022-11-10
undisclosed įdėtas į 1 vietą, virš  v O i D.
Epilogas perkeltas į 29 vietą, virš kandyman chamber ir po Adrenalinas.
Į legacy sąrašą išstumiamas Unnamed 394.

2022-12-14
best chal possible įdėtas į 6 vietą, virš mr mitten ir po musu lygis.
worst challenge ever įdėtas į 21 vietą, virš SurFaced ir po GTA V MOD MENU PC.
Askeral įdėtas į 37 vietą, virš Crackman is racist ir po aurisa.
daphne įdėtas į 41 vietą, virš random Things ir po Akropolis.
Į legacy sąrašą išstumiami Pavirsius, KasSkaitysTasGaidys, HARMOGUS ir Degtine.

2022-12-20
harmyko challenge 3 pašalintas iš sąrašo dėl reikalavimų neatitikimo.
Slickest Challenge (xtrapnation) pašalintas iš sąrašo dėl reikalavimų neatitikimo.
Jagermeister įdėtas į 32 vietą, virš kandyman chamber ir po Epilogas.
admixture įdėtas į 39 vietą, virš Crackman is racist ir po Askeral.

2022-12-24
best chall possible pakeltas į 4 vietą.

2022-12-29
kauno pienas įdėtas į 29 vietą, virš piktzole ir po actimel.
Į legacy sąrašą išstumiamas Melyninis Miau.

2023-01-03
Akropolis pašalintas iš sąrašo, nes buvo ištrintas iš GD serverių.

2023-01-23
KandyMan Never Clear pašalintas iš listo dėl reikalavimų neatitikimo.
mr beas įdėtas į 20 vietą, virš worst challenge ever ir po LIDL.
vilkyskiu pienine įdėtas į 24 vietą, virš FUNC 1 ir po 3 seconds RGB.
crazy challenge įdėtas į 32 vietą, virš Adrenalinas ir po piktzole.
Fitler of HCL įdėtas į 41 vietą, virš aurisa ir po Shredda.
Larger Service Area įdėtas į 47 vietą, virš random Things ir po daphne.
Į legacy sąrašą išstumiami Resent, hematogenas, ir oleki challenge.

2023-03-16
i dislike rimi įdėtas į 10 vietą, virš musu lygis ir po riktus.
FCL IS BIGOTED įdėtas į 38 vietą, virš FCL IS BIASED ir po kandyman chamber.
Singularity įdėtas į 44 vietą, virš aurisa ir po Fitler of HCL.
Who let the cats out įdėtas į 48 vietą, virš Crackman is racist ir po admixture.
Į legacy sąrašą išstumiami Jack Daniels, Have fun, random Things ir Larger Service Area.

2023-05-25
i dislike rimi pakeltas į 2 vietą, virš v O i D ir po undisclosed.
Blindness pakeltas į 7 vietą, virš lost ir po Burnt nachos is yay.
Natura Electrum nuleistas į 10 vietą, virš musu lygis ir po robot never clear.
riktus nuleistas į 16 vietą, virš Fever Dream ir po GTA V MOD MENU PC.
FUNC 1 nuleistas į 28 vietą, virš Holy Moly ir po I LOVE IKEA.

2023-08-20
Sightless įdėtas į 6 vietą, virš Burnt nachos is yay ir po best chall possible.
Klaipedos bandeles įdėtas į 10 vieta, virš robot never clear ir po lost.
Lidl XoXo įdėtas į 20 vietą, virš Say Gex ir po Fever Dream.
The devious įdėtas į 38 vietą, virš Epilogas ir po Adrenalinas.
actimel perkeltas į 31 vietą, virš FUNC 1 ir po I LOVE IKEA.
DR nefario clear perkeltas į 25 vietą, virš SurFaced ir po worst challenge ever.
Į legacy sąrašą išstumiami daphne, Crackman is racist, Who let the cats out ir admixture.

2024-07-18
Sąrašas pratęstas iki 75 vietų.
Į sąrašą grįžta RGB SKRAIDYMAS, kamuoliuko isbandyma, nokia spider, Bic Lighter, Amber, MCTTN, ABSOLUT, Reddit Landscape, twitter users, Slicker Challenge, Unnamed 394, Pavirsius, KasSkaitysTasGaidys, HARMOGUS, Degtine, Melyninis Miau, Resent, hematogenas, oleki challenge, Jack Daniels, Have fun, random Things, Larger Service Area, daphne, Who let the cats out ir admixture.
Askeral perkeltas į 55 vietą, virš random Things ir po Larger Service Area.
Singularity perkeltas į 35 vietą, virš piktzole ir po kauno pienas.

2024-07-29
INSANE SIMAS įdėtas į 23 vietą, virš worst challenge ever ir po mr beas.
Enjoy the experience įdėtas į 26 vietą, virš SurFaced ir po DR nefario clear.
Ardour įdėtas į 36 vietą, virš Singularity ir po kauno pienas.
chickencore įdėtas į 62 vietą, virš hematogenas ir po Resent.
Lidl XoXo pašalintas iš listo, nes yra neįmanomas.
Lifrana pakeltas į 12 vietą, virš Natura Electrum ir po robot never clear.
GTA V MOD MENU PC pakeltas į 14 vietą, virš mr mitten ir po Natura Electrum.
musu lygis nuleistas į 17 vietą, virš riktus ir po Banana Juice Strat.
Į legacy sąrašą išstumiami RGB SKRAIDYMAS, kamuoliuko isbandyma ir twitter users.

2024-08-12
Direction įdėtas į 20 vietą, virš Say Gex ir po Fever Dream.
IRON DEFICIENCY įdėtas į 35 vietą, virš FUNC 1 ir po Jagermeister.
365 įdėtas į 46 vietą, virš FCL IS BIGOTED ir po kandyman chamber.
Dart Mastery įdėtas į 52 vietą, virš Estrella Traškučiai ir po Shredda.
Estrella Traskuciai įdėtas į 53 vietą, virš Fitler of HCL ir po Dart Mastery.
Jagermeister pakeltas į 34 vietą, virš IRON DEFICIENCY ir po actimel.
Epilogas nuleistas į 65 vietą, virš Resent ir po Jack Daniels.
Į legacy sąrašą išstumiami Amber, MCTTN, ABSOLUT, Reddit Landscape ir Slicker Challenge.

2024-08-14
Viso Gero įdėtas į 29 vietą, virš 3 seconds RGB ir po SurFaced.
Akropolis II įdėtas į 41 vietą, virš Singularity ir po Ardour.
ABYSSAL HUNTER įdėtas į 46 vietą, virš The devious ir po Adrenalinas.
Dalbajobas įdėtas į 55 vietą, virš Dart Mastery ir po Shredda.
Kebabas įdėtas į 65 vietą, virš Askeral ir po Larger Service Area.
Sightless pakeltas į 3 vietą, virš v O i D ir po i dislike rimi.
Fever Dream ir musu lygis sukeisti vietomis, Fever Dream dabar aukščiau.
Direction pakeltas į 17 vietą, virš Fever Dream ir po Banana Juice Strat.
riktus nuleistas į 24 vietą, virš worst challenge ever ir po INSANE SIMAS.
Į legacy sąrašą išstumiami Pavirsius, KasSkaitysTasGaidys, HARMOGUS, Degtine ir Unnamed 394.

2024-08-28
mr beas pašalintas iš sąrašo.
Blossom įdėtas į 40 vietą, virš Ardour ir po kauno pienas.
awesome dance party įdėtas į 42 vietą, virš Akropolis II ir po Ardour.
lemon įdėtas į 48 vietą, virš ABYSSAL HUNTER ir po Adrenalinas.
Oho Traskuciai įdėtas į 56 vietą, virš MadHouse challenge ir po Slickest Challenge.
LEKTUVAS įdėtas į 67 vietą, virš Larger Service Area ir po daphne.
FCL IS BIGOTED pakeltas į 32 vietą, virš I LOVE IKEA ir po MAXIMA IS COOL.
Dalbajobas pakeltas į 53 vietą, virš FCL IS BIASED ir po 365.
Į legacy sąrašą išstumiami Melyninis Miau, oleki challenge, hematogenas ir chickencore.

2024-09-09
LTCL SUGRIZO įdėtas į 20 vietą, virš Say Gex ir po musu lygis.
Kalabybiskes įdėtas į 28 vietą, virš Viso Gero ir po Enjoy the experience.
le fish au chocolat įdėtas į 33 vietą, virš I LOVE IKEA ir po FCL IS BIGOTED.
H ell įdėtas į 40 vietą, virš FUNC 1 ir po IRON DEFICIENCY.
Leaves įdėtas į 50 vietą, virš crazy challege ir po piktzole.
Undisclosed v2 įdėtas į 61 vietą, virš Oho Traskuciai ir po Slickest Challenge.
SurFaced nuleistas į 38 vietą, virš IRON DEFICIENCY ir po Jagermeister.
3 seconds RGB nuleistas į 35 vietą, virš actimel ir po I LOVE IKEA.
Į legacy sąrašą išstumiami Resent, Epilogas, Jack Daniels, Have fun, random Things ir Askeral.

2024-09-21
Leaves iš sąrašo dėl reikalavimų neatitikimo.
Larger Service Area pakeltas į 72 vietą, virš Crackman is racist ir po Who let the cats out.
Kebabas pakeltas į 68 vietą, virš aurisa ir po Fitler of HCL.
Lektuvas pakeltas į 49 vietą, virš piktzole ir po Singularity.
H ell pakeltas į 33 vietą, virš le fish au chocolat ir po FCL IS BIGOTED.
Kalabybiskes pakeltas į 24 vietą, virš worst challenge ever ir po INSANE SIMAS.
riktus nuleistas į 29 vietą, virš vilkyskiu pienine ir po Viso Gero
Į sąrašą grįžta Askeral.

2024-10-06
KICKSTART įdėtas į 66 vietą, virš Estrella Traskuciai ir po Dart Mastery.
insecure įdėtas į 73 vietą, virš Larger Service Area ir po Who let the cats out.
Į legacy sąrašą išstumiami Askeral ir daphne.

2024-10-12
Tanzanitas įdėtas į 49 vietą, virš piktžolė ir po LEKTUVAS.
Mesainis įdėtas į 68 vietą, virš Fitler of HCL ir po Estrella Traškučiai.
evil gear yard įdėtas į 75 vietą, virš Who let the cats out ir po admixture.
H ell pakeltas į 27 vietą, virš Viso Gero ir po DR nefario clear.
awesome dance party pakeltas į 32 vietą, virš FCL IS BIGOTED ir po MAXIMA IS COOL.
KICKSTART pakeltas į 63 vietą, virš MadHouse challenge ir po Oho Traškučiai.
Kalabybiškės nuleistas į 25 vietą, virš DR nefario clear ir po worst challenge ever.
Enjoy the experience nuleistas į 34 vietą, virš le fish au chocolat ir po FCL IS BIGOTED.
Ardour nuleistas į 51 vietą, virš crazy challenge ir po piktžolė.
365 nuleistas į 60 vietą, virš Slickest Challenge ir po FCL IS BIASED.
undisclosed v2 nuleistas į 71 vietą, virš aurisa ir po kebabas.
insecure pakeltas iš 76 vietos į 73 vietą ir lieka tam pačiam spot'e, tik dabar virš admixture ir po aurisa.
Į legacy sąrašą išstumiami Crackman is racist, Larger Service Area ir Who let the cats out.

2024-10-26
OPPRESSION įdėtas į 2 vietą, virš i dislike rimi ir po undisclosed.
Session įdėtas į 8 vietą, virš Blindness ir po Burnt nachos is yay.
le fish au chocolat ir Tanzanitas buvo sukeisti vietomis, Tanzanitas dabar aukščiau.
LTCL SUGRIZO pakeltas į 17 vietą, virš mr mitten ir po GTA V MOD MENU PC.
H ell pakeltas į 25 vietą, virš worst challenge ever ir po Banana Juice Strat.
evil gear yard pakeltas į 72 vietą, virš Kebabas ir po Fitler of HCL.
Best chall possible nuleistas į 11 vietą, virš Klaipedos bandeles ir po lost.
Banana Juice Strat nuleistas į 24 vietą, virš H ell ir po LIDL.
INSANE SIMAS nuleistas į 31 vietą, virš vilkyskiu pienine ir po riktus.
Akropolis II nuleistas į 56 vietą, virš ABYSSAL HUNTER ir po lemon.
Į legacy sąrašą išstumiami admixture ir Undisclosed v2.

2025-02-17
Ufo Challenge įdėtas į 19 vietą, virš Direction ir po mr mitten.
IMONE įdėtas į 22 vietą, virš musu lygis ir po Fever Dream.
INTENSIVUS CHALLENGE įdėtas į 26 vietą, virš Banana Juice Strat ir po LIDL.
Į legacy sąrašą išstumiami insecure, aurisa ir FCL IS BIASED.

2025-06-14
FRI BULVYTES įdėtas į 21 vietą, virš Fever Dream ir po Direction.
Redemption įdėtas į 32 vietą, virš Viso Gero ir po Kalabybiskes.
Rukas įdėtas į 40 vietą, virš FCL IS BIGOTED ir po awesome dance party.
camo lead huzz įdėtas į 72 vietą, virš Estrella Traskuciai ir po Dart Mastery.
Burnt nachos is yay ir Session sukeisti vietomis, Session dabar aukščiau.
Viso Gero ir DR nefario clear sukeisti vietomis, Viso Gero dabar aukščiau.
riktus ir INSANE SIMAS sukeisti vietomis, INSANE SIMAS dabar aukščiau.
Į legacy sąrašą išstumiami Kebabas, evil gear yard, Fitler of HCL ir Mesainis.

2025-08-12
INSANE SIMAS pašalintas iš sąrašo, nes buvo ištrintas iš GD serverių.
Redemption pašalintas iš sąrašo, nes buvo ištrintas iš GD serverių.
Į sąrašą grįžta Mesainis ir Fitler of HCL.

2025-08-27
Electro magnetism įdėtas į 5 vietą, virš SUPERSLAVERYWORLD ir po Sightless.
SUPERSLAVERYWORLD įdėtas į 6 vietą, virš v O i D ir po Electro magnetism.
ODIUM įdėtas į 12 vietą, virš Best chall possible ir po lost.
FCL IS BIGOTED ir Enjoy the experience sukeisti vietomis, Enjoy the experience dabar aukščiau.
LTCL SUGRIZO pakeltas į 18 vietą, virš Natura Electrum ir po Lifrana.
Burnt nachos is yay nuleistas į 14 vietą, virš Klaipedos bandeles ir po Best chall possible.
Į legacy sąrašą išstumiami Fitler of HCL, Mesainis ir Estrella Traskuciai.

2025-08-29
OPPRESSION pakeltas į 1 vietą, virš undisclosed.

2025-08-30
Sveiki įdėtas į 47 vietą, virš actimel ir po 3 seconds RGB.
Those Who Patapim X įdėtas į 75 vietą, virš Shredda ir po MadHouse challenge.
Dart Mastery pakeltas į 70 vietą, virš Slickest Challenge ir po 365.
Blossom pakeltas į 50 vietą, virš SurFaced ir po Jagermeister.
Lifrana pakeltas į 13 vietą, virš Best chall possible ir po ODIUM.
SUPERSLAVERYWORLD nuleistas į 10 vietą, virš lost ir po Blindness.
Į legacy sąrašą išstumiami Shredda ir camo lead huzz.

2025-08-31
OPPRESSION pašalintas iš sąrašo, nes buvo ištrintas iš GD serverių.
Į sąrašą grįžta Shredda.

2025-09-14
Unnamed O0 įdėtas į 5 vietą, virš v O i D ir po Electro magnetism.
Perkuno Kardas įdėtas į 25 vietą, virš Fever Dream ir po FRI BULVYTES.
LIDL pakeltas į 28 vietą, virš musu lygis ir po IMONE.
Tanzanitas pakeltas į 38 vietą, virš riktus ir po DR nefario clear.
Į legacy sąrašą išstumiami Those Who Patapim X ir Shredda.

2025-09-25
Captain Morgan įdėtas į 60 vietą, virš piktzole ir po le fish au chocolat.
Į legacy sąrašą išstumiamas MadHouse challenge.

2026-01-01
PooPiD įdėtas į 25 vietą, virš Perkuno Kardas ir po FRI BULVYTES.
Į legacy sąrašą išstumiamas KICKSTART.

2026-01-17
I ohhh įdėtas į 2 vietą, virš I dislike rimi ir po undisclosed.
Mandarinas 34 įdėtas į 9 vietą, virš session ir po Clap of yolomodeboom.
Golden Symphony įdėtas į 11 vietą, virš Blindness ir po session.
mosquito at 3am įdėtas į 42 vietą, virš Tanzanitas ir po DR nefario clear.
Just Us įdėtas į 75 vietą, virš Dalbajobas ir po kandyman chamber.
Į legacy sąrašą išstumiami Oho Traskuciai, Slickest Challenge, Dart Mastery, 365 ir Dalbajobas.

2026-01-20
crazy challenge pašalintas iš sąrašo dėl reikalavimų neatitikimo.
DR nefario clear pašalintas iš sąrašo dėl reikalavimų neatitikimo.
Į sąrašą grįžta 365 ir Dalbajobas.

2026-01-22
as noriu pasikarti įdėtas į 8 vietą, virš Clap of yolomodeboom ir po v O i D.
ledinis kalnas įdėtas į 66 vietą, virš piktzole ir po Captain Morgan.
I ohhh nuleistas į 3 vietą, virš Sightless ir po I dislike rimi.
Į legacy sąrašą išstumiami 365 ir Dalbajobas.

2026-04-30
BLCKLGHT įdėtas į 4 vietą, virš Sightless ir po I ohhh (trūksta nuomonių, vieta gali keistis).
Tylus Skrydis įdėtas į 6 vietą, virš Electro magnetism ir po Sightless.
Distortion įdėtas į 12 vietą, virš Mandarinas 34 ir po Clap of yolomodeboom (trūksta nuomonių, vieta gali keistis).
LOPEZ need a job įdėtas į 42 vietą, virš worst challenge ever ir po H ell (trūksta nuomonių, vieta gali keistis).
oppression įdėtas į 73 vietą, virš Adrenalinas ir po Ardour.
Į legacy sąrašą išstumiami Just Us, kandyman chamber, The devious, ABYSSAL HUNTER ir Akropolis II.

2026-07-06
Sąrašas pratęstas iki 100 vietų.
Į sąrašą grįžta Akropolis II, ABYSSAL HUNTER, The devious, kandyman chamber, Just Us, Dalbajobas, 365, Dart Mastery, Slickest Challenge, Oho Traskuciai, KICKSTART, MadHouse challenge, Those Who Patapim X, Shredda, Estrella Traskuciai, Mesainis, Fitler of HCL, evil gear yard, Kebabas, FCL IS BIASED, aurisa, insecure, Undisclosed v2, admixture ir Who let the cats out.`

function standardize(line) {
  line = line.trim().replace(/\s+/g, ' ')
  line = line.split(' idėtas ').join(' įdėtas ')
  line = line.split('iš listo').join('iš sąrašo')
  line = line.split('challege').join('challenge')
  line = line.split('I I LOVE IKEA').join('I LOVE IKEA')
  line = line.split(' buvo sukeisti vietomis').join(' sukeisti vietomis')
  line = line.replace(/(į \d+) vieta\b/g, '$1 vietą')
  if (!line.endsWith('.')) line += '.'
  return line
}

const VERBS = ['įdėtas', 'perkeltas', 'pakeltas', 'nuleistas', 'pašalintas']

function splitEntry(line) {
  if (line.startsWith('Į legacy sąrašą') || line.startsWith('Į sąrašą') || line.startsWith('Sąrašas ')) {
    return ['', line]
  }
  let i = line.indexOf(' sukeisti vietomis')
  if (i > 0) return [line.slice(0, i), line.slice(i + 1)]
  i = line.indexOf(' įdėti tarp')
  if (i > 0) return [line.slice(0, i), line.slice(i + 1)]
  let best = -1
  for (const v of VERBS) {
    const idx = line.indexOf(' ' + v + ' ')
    if (idx > 0 && (best < 0 || idx < best)) best = idx
  }
  if (best >= 0) return [line.slice(0, best), line.slice(best + 1)]
  i = line.indexOf(' iš sąrašo')
  if (i > 0) return [line.slice(0, i), 'pašalintas' + line.slice(i)]
  throw new Error('UNPARSED: ' + line)
}

function parseDays(text) {
  const days = []
  let cur = null
  for (const raw of text.split('\n')) {
    const t = raw.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
      cur = { date: t, lines: [] }
      days.push(cur)
    } else if (t && cur) {
      cur.lines.push(t)
    }
  }
  return days
}

async function main() {
  const admin = (await import('firebase-admin')).default
  const keyPath = resolve(__dirname, 'serviceAccountKey.json')
  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'))
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  const db = admin.firestore()

  const days = parseDays(SOURCE)

  // Build every entry first. First source line of a day gets the highest ts
  // within that day, so it sorts to the top (display is newest-ts-first).
  const entries = []
  for (const { date, lines } of days) {
    const N = lines.length
    const baseTs = Date.parse(date + 'T12:00:00Z')
    lines.forEach((raw, i) => {
      const line = standardize(raw)
      const [level, text] = splitEntry(line)
      entries.push({
        id: `${date}-${String(i).padStart(3, '0')}`,
        data: { level: level.trim(), text: text.trim(), date, ts: baseTs + (N - i) },
      })
    })
  }

  // Firestore caps a batch at 500 writes; commit in chunks of 400.
  for (let start = 0; start < entries.length; start += 400) {
    const chunk = entries.slice(start, start + 400)
    const b = db.batch()
    for (const e of chunk) b.set(db.collection('changelog').doc(e.id), e.data)
    await b.commit()
    console.log(`  committed ${Math.min(start + 400, entries.length)}/${entries.length}`)
  }

  console.log(`Seeded ${entries.length} changelog entries across ${days.length} days.`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
