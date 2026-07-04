# Changelog

## [v0.2] - 2026-07-05

### Pridėta
- Prisijungimas per Discord — vietoje vartotojo vardo ir slaptažodžio dabar jungiamasi vienu mygtuku „Prisijungti su Discord".
- Kaip numatytoji profilio nuotrauka paimama Discord nuotrauka; ją vėliau galima pasikeisti į bet kokią.
- Palaikomos animuotos (GIF) Discord profilio nuotraukos.

### Pakeista
- Vartotojo vardas dabar imamas iš Discord paskyros.

### Sisteminiai pokyčiai
- Autentifikacija perkelta į Discord OAuth (Firebase custom token). Prisijungimas išlieka tarp seansų.
- Senas paskyras galima perkelti prie Discord tapatybės kartu su įrašais, komentarais, „patinka" ir profiliu.

## [v0.1.2.1] - 2026-07-04

### Pridėta
- Profilyje po duomenimis rodomi to vartotojo įrašai — tokiu pačiu formatu kaip pagrindiniame puslapyje, tik išdėstyti vienu stulpeliu.
- Changelog rodomas pagal pasirinktą kalbą (LT/EN).

### Pakeista
- Įrašo kūrimo mygtukas perkeltas į apatinį dešinį kampą ir rodomas tik pagrindiniame įrašų puslapyje.

## [v0.1.2] - 2026-07-04

### Pridėta
- Vartotojų profiliai: kiekvienas naudotojas turi savo puslapį (/u/vartotojas), kuriame rodomas jo vardas, prisijungimo data, profilio nuotrauka ir „Apie mane" skiltis.
- Profilio savininkas gali įsikelti profilio nuotrauką ir redaguoti „Apie mane" tekstą.
- Autorių vardai įrašuose ir komentaruose tapo nuorodomis į jų profilius, šalia rodoma maža profilio nuotrauka.
- Naudotojų rolės: po naudotojo vardu profilyje gali būti rodomi spalvoti rolių ženkleliai. Rolės išverstos į lietuvių ir anglų kalbas.
- Profilio nuotraukai taikomi tokie patys apribojimai kaip įrašams (iki 15MB, iki 5000×5000). GIF formatas palaikomas.

### Pakeista
- Atsijungimo, profilio ir „Mano įrašai" mygtukai suglausti į profilio nuotraukos ikoną viršuje dešinėje — ją paspaudus atsiveria meniu su profiliu, savo įrašais ir atsijungimu. Prisijungimo mygtukas nepakito.

### Sisteminiai pokyčiai
- Registruojantis patikrinama, ar pasirinktas vartotojo vardas dar neužimtas.
- Pakeitus profilio nuotrauką, senoji automatiškai ištrinama iš saugyklos, kad būtų taupoma vieta.

## [v0.1.1] - 2026-06-06

### Pakeista
- Sunatūrintas įrašo kėlimo mygtukas, prieš tai jis skambėjo šiek tiek keistai ir nepraktiškai.
- Pakeistas puslapio logotipas ir pavadinimas naršyklės skiltyje (wtf is tmp-scaffold bruh).
- Patinka/Nepatinka mygtukai paspaudus ant įrašo yra didesni, nebėra sulieti su aprašu.

### Pataisyta
- Pele užvedus ant Patinka/Nepatinka mygtukų, žymeklis netampa paprastu, išlieka pirštu.
- Tvarkingiau rodomas laukas, kuriame parodo kuria paskyra yra prisijungta.

### Pridėta
- Rodomas komentarų skaičius įrašo lange.

## [v0.1.0.3] - 2026-06-06

### Pridėta
- Krovimo indikacijos tekstas pakeistas į besisukantį Lietuvos spalvų Electrodynamix ikoną, LTCL mentioned

## [v0.1.0.2] - 2026-06-06

### Pataisyta
- Pašalinti du pertekliniai lokalės raktai, pataisytas nenatūralus lietuviškas pranešimo tekstas

## [v0.1.0.1] - 2026-06-05

### Pataisyta
- Sutaisyta lokalės kūrimo klaida dėl nesutampančių eilučių tipų

## [v0.1.0] - 2026-06-05

### Pakeista
- Pradėta naudoti versijavimas, ši puslapio iteracija bus laikoma pirmąja (ne v1.x.x, kadangi dar yra ką dadėti ir taisyti iki funkcionalaus puslapio).
- Puslapių nuorodos perkeltos į viršutinio meniu centrą, taip pat yra nukreipiama į atitinkamą puslapį, o ne pakeičiamas esamas langas.

### Pridėta
- Pridėta lietuvių (LT) ir anglų (EN) kalbų lokalizacija, galima kalbas keisti viršuje dešinėje.
- Pridėtas šis puslapis, čia bus aprašomi nauji pakeitimai.
- Administracinė paskyra gali prisegti įrašus, jie bus rodomi pačiame viršuje apeinant visas rūšiavimo metrikas, vėliau gal implementuosiu kitokias roles kad galėtų tą daryti. 
- Galima ištrinti savo komentarus, administracinė paskyra gali trinti visus.
- Galima paminėti kitus naudotojus komentaruose, jiems išsiunčiant pranešimą.

### Sisteminiai pokyčiai
- Susidorota su S3NI (tikiuosi, jei prisikels praneškit, ačiū).

