# Changelog

## [v0.5.4] - 2026-07-08

### Pridėta
- Premijų lentos „Daugiausiai išdavę" lyderių lentelė — skelbėjai rikiuojami pagal tai, kiek pinigų iš tikrųjų išdalino, sumuojant jų įvykdytas (apmokėtas) premijas.
- Premijos dabar turi nebūtiną AREDL nuorodos lauką, rodomą kaip „Žiūrėti AREDL" nuoroda premijos kortelėje — extreme demon ar bet kokiam kitam lygiui. Ne AREDL nuorodos rodomos kaip „Daugiau informacijos".
- LTCL profilio puslapiuose dabar galima nustatyti savo foną: žiūrint savo puslapį, pasirink bet kurį įveiktą ar patvirtintą lygį (su paieška) kaip puslapio foną arba palik „Automatinį (sunkiausias lygis)".

### Pakeista
- LTCL profilio puslapiai dabar naudoja tą patį suskirstytą, matinio stiklo išdėstymą kaip Sąrašo puslapis, su pasirinkto (ar sunkiausio) lygio miniatiūra kaip viso ekrano fonu.

### Pataisyta
- Lygio miniatiūros fonas Sąrašo puslapyje dabar užpildo visą ekraną nuo viršaus iki apačios ir šiek tiek priartinamas, kad dengtų iš visų pusių, o ne tik iš kairės į dešinę.
- LTCL taškai: lygį patvirtinęs žaidėjas dabar gauna jo taškus, kaip ir jį įveikęs.
- Patvirtinti lygiai dabar visur laikomi „įveiktais" rodant sunkiausią lygį — LTCL lyderių lentelėje, žaidėjo LTCL puslapyje ir gdlt-hub profilio kortelėje.

## [v0.5.3] - 2026-07-08

### Pridėta
- (Nepilna implementacija) Nauja „Premijų lenta" — naujas skirtukas pagrindiniame puslapyje. Bet kas gali paskelbti piniginę premiją (min. 2 €) už konkretaus lygio įveikimą. Skelbėjas gali redaguoti ar atšaukti savo aktyvią premiją. Premijų lentos vadovas (jau esama rolė) gali pažymėti premiją įvykdyta arba grąžinti į aktyvias — atlygis sumokamas išoriškai, patys susitarę, o vadovas tik patvirtina, kad tai iš tikrųjų įvyko.
- LTCL administravimo skydelio lygių sąraše dabar rodoma lygio miniatiūra šalia pavadinimo, jei ji nustatyta, o sąrašo administratoriai gali tiesiog užvilkti paveikslėlį ant lygio eilutės, kad iškart nustatytų ar pakeistų jo miniatiūrą — nereikia atidaryti redaktoriaus. Galioja tas pats 2 MB dydžio apribojimas.


## [v0.5.2.1] - 2026-07-08

### Pridėta
- Naujausių pakeitimų kortelė pagrindiniame puslapyje (Labas!!!!!!) — šone rodomi 3 naujausi žurnalo įrašai su nuoroda į pilną pakeitimų žurnalą.

### Pakeista
- LTCL: paspaudus žaidėjo vardą lygio informacijoje (kūrėjai, patvirtinęs, įkėlęs) ar rekorduose, dabar nukreipiama į jo LTCL statistikos puslapį, o ne gdlt-hub profilį — ne visi žaidėjai (senojo sąrašo likučiai) turi čia susikūrę paskyrą.

### Pataisyta
- LTCL statistikos puslapyje nuoroda „Pagrindinis profilis" nebėra rodoma žaidėjams, kurie neturi gdlt-hub paskyros.

## [v0.5.2] - 2026-07-08

### Pridėta
- Failų vilkimas ir paleidimas — visi failų įkėlimai dabar priima užvilktą paveikslėlį: profilio nuotrauka, ženklelio ikona ir fonas (administravimas) bei lygio miniatiūra; kiekvienas pasišviečia velkant virš jo. Paspaudus naršyti taip pat veikia.
- GD statistika dabar rodoma su ikonomis (žvaigždė, mėnulis, deimantas, vartotojo moneta, slapta moneta, demonas, kūrėjo taškai) vietoj teksto etikečių; vieta lyderių lentelėje žymima trofėjaus ikona.
- Naujas „Sujungti profilius" skirtukas LTCL administravimo skydelyje — sąrašo administratoriai gali susieti LTCL lyderių lentelės vardą (kuriam nereikia paskyros) su tikra gdlt-hub paskyra; visos to vardo vietos lygių sąraše perrašomos į paskyros vartotojo vardą, kad visur teisingai rodytųsi profilis ir vardas.
- Pridedant LTCL rekordą, vartotojo vardo laukas dabar siūlo esamas svetainės paskyras rašant, tačiau vardą vis tiek galima įvesti ranka žaidėjams be paskyros.

### Pakeista
- LTCL statistikos kortelė profilyje dabar rodo sunkiausio lygio įkeltą individualią miniatiūrą, jei tokia yra; jei ne — naudojama automatinė miniatiūra (pagal lygio ID), kaip ir anksčiau.
- LTCL ir AREDL statistikos kortelės profilyje dabar naudoja tą patį suskirstytą, matinio stiklo išdėstymą kaip Sąrašo puslapis, su sunkiausio lygio/demono miniatiūra kaip išblukusiu kortelės fonu.
- GD statistikos kortelė dabar turi fiksuotą fono paveikslėlį, o susietas vartotojo vardas rodomas atskirame, centruotame segmente.

### Pataisyta
- Lygio miniatiūros fonas Sąrašo puslapyje nebėra stipriai išblukęs — dabar jis rodomas ryškus ir aiškiai atpažįstamas. Skilčių fonai išlaiko lengvesnį matinio stiklo efektą.

## [v0.5.1] - 2026-07-08

### Pridėta
- Individualios lygių miniatiūros — sąrašo personalas gali įkelti miniatiūros paveikslėlį pridedant ar redaguojant lygį (saugoma saugiai, iki 2 MB). Pasirinkto lygio miniatiūra dabar rodoma kaip išblukęs fonas Sąrašo puslapyje; jei nėra įkeltos, naudojama automatinė miniatiūra (pagal lygio ID).
- Dainų nuorodos — lygio daina dabar veda į išorę: NONG atveria išorinę atsisiuntimo nuorodą, o įprasta daina nukreipia į jos Newgrounds puslapį. Sąrašo personalas pasirenka pagal NONG žymimąjį langelį lygio redaktoriuje, kuris perjungia lauką tarp dainos ID ir atsisiuntimo nuorodos.

## [v0.5.0.1] - 2026-07-08

### Pakeista
- LTCL lygių sąrašas dabar yra per visą ekrano plotį.
- Pridėta galimybė rodyti lygių nuotraukas puslapio fone, šiuo metu jų nėra nes nuotraukos nėra sukeltos.
- Sumažintas esamų skilčių fonų skaidrumas kad būtų matomesnis puslapio fonas.

## [v0.5] - 2026-07-07

### Pridėta
- LTCL administravimo skydelis — viena vieta sąrašo personalui pridėti, redaguoti, trinti ir perrikiuoti lygius, tvarkyti rekordus bei redaguoti taisykles; kiekvienas įrankis pasiekiamas pagal atitinkamą rolę.
- Formatuojamos taisyklės — LTCL taisyklės dabar palaiko formatuotą tekstą (Markdown) ir rodomos su antraštėmis, paryškinimu, sąrašais bei nuorodomis. Sąrašo personalas jas redaguoja su formatavimo įrankių juosta ir tiesiogine peržiūra, rodančia tiksliai, kaip jos atrodys.

### Pakeista
- Vieši LTCL Sąrašo ir Taisyklių puslapiai dabar skirti tik peržiūrai; sąrašo personalas keitimus atlieka naujame LTCL administravimo skydelyje.
- LTCL personalo sąrašas pagrindiniame puslapyje dabar generuojamas automatiškai iš rolių (Savininkai, Sąrašo administratoriai, Sąrašo moderatoriai, Programuotojai), o ne iš fiksuoto sąrašo.
- Sąrašo administratoriai ir moderatoriai dabar gali redaguoti rekordo „enjoyment" vertę.
- Ženkleliai profiliuose dabar suskirstyti į įprastą ir su fono paveikslėliu stilius.

### Pataisyta
- Lygio rekordų redaktoriaus išdėstymas — „enjoyment" laukas nebeužima didžiosios eilutės dalies; rekordai dabar turi sulygiuotus „Žaidėjas / Enjoyment / Vaizdo įrašas" stulpelius.

## [v0.4] - 2026-07-06

### Pridėta
- Lietuvos iššūkių sąrašas (LTCL) — nauja hub'o dalis, skirta rikiuoti sunkiausius bendruomenės sukurtus iššūkius. Turi savo pagrindinį puslapį (pasisveikinimas, lygių pakeitimų žurnalas ir sąrašo personalas) bei skirtukus: Sąrašas, Lyderių lentelė ir Sąrašo taisyklės.
- Iššūkių ruletė ir pakeliai bus pridėti vėliau.
- Sąrašas — ieškomas, surikiuotas 145 importuotų lygių sąrašas. Pasirinkus lygį matomas patvirtinimo vaizdo įrašas, taškų vertė, lygio ID, vidutinis enjoyment, daina/NONG, kūrėjai/patvirtinęs/įkėlęs ir visi įveikimai (rekordai) su žaidėjo enjoyment.
- Taškai ir legacy — vietos #1–100 gauna taškus pagal kreivę; viskas po #100 rodoma kaip Legacy ir verta 0 taškų. Kiekvieno lygio vidutinis enjoyment apskaičiuojamas iš jo rekordų.
- Lyderių lentelė — žaidėjai rikiuojami pagal bendrą taškų skaičių. Žaidėjo puslapyje rodoma jo vieta, taškai, sunkiausias iššūkis ir jo įveikti / sukurti / patvirtinti iššūkiai (pagrindinis sąrašas paryškintas, legacy — kursyvu), kiekvienas lygis nukreipia atgal į Sąrašą.
- LTCL statistika hub profiliuose — kortelė su vieta lyderių lentelėje, taškais ir sunkiausiu iššūkiu bei nuoroda į žaidėjo LTCL puslapį. LTCL puslapis turi nuorodą atgal į pagrindinį profilį.
- Rolėmis pagrįstos teisės — priskirtos rolės dabar suteikia galimybes: sąrašo administratoriai tvarko lygius, rekordus ir taisykles; sąrašo moderatoriai tvarko rekordus; administratoriai gali viską ir tik jie gali priskirti roles.
- Individualūs ženkleliai — administratoriai gali kurti grynai dekoratyvius ženklelius su emoji ar įkelta nuotrauka/GIF ikona (≤ 250 KB), nebūtinu 86×40 fono paveikslėliu (≤ 1 MB), spalva ir renginio data. Ženkleliai gali būti suteikti bet kam, rodomi jų profilyje, o užvedus pele parodomas pavadinimas ir data.
- Administratorių įrankiai LTCL lygiams pridėti, redaguoti, trinti ir perrikiuoti bei rekordams tvarkyti tiesiai svetainėje.

### Pakeista
- Vartotojų profiliai dabar priklauso visam hub'ui (`/u/...`), o ne freepost daliai.
- Vartotojų paieška dabar yra kortelė pagrindiniame puslapyje.
- Rolės rodomos kaip mažos ikonos šalia vartotojo vardo; individualūs ženkleliai užima „piliulės" vietą po jomis.

## [v0.3.1] - 2026-07-05

### Pridėta
- Geometry Dash statistika profilyje — kortelė su žvaigždėmis, mėnuliais, demonais, slaptomis ir vartotojo monetomis, deimantais, kūrėjo taškais bei vieta pasaulio lyderių lentelėje, su nuoroda į žaidėjo GDBrowser puslapį.
- Automatinis paskyros suradimas — jei Discord vardas tiksliai sutampa su GD paskyra, jos statistika profilyje rodoma be jokių nustatymų. Prie automatiškai parinktų kortelių rodoma pastaba, nebent GD profilio Discord nuoroda patvirtina, kad tai jūs.
- Rankinis GD paskyros susiejimas — savo profilyje galima nurodyti žaidimo vartotojo vardą. Apsaugai nuo apsimetinėjimo, išsaugoti pavyks tik jei GD profilio socialinėse nuorodose nurodytas jūsų Discord vardas; palikus lauką tuščią ir išsaugojus, paskyra atsiejama.

### Pašalinta
- Bluesky iš profilio socialinių nuorodų.

### Pataisyta
- Paspaudus vartotojo vardą įrašuose ar įrašo lange, būdavo nukreipiama į neegzistuojantį puslapį — dabar atidaromas vartotojo profilis, kaip vartotojų paieškoje.

## [v0.3] - 2026-07-05

### Pridėta
- GDLT Hub — naujas pagrindinis puslapis, veikiantis kaip centralizuota vieta bendruomenei. freepost dabar yra viena hub'o dalis, o daugiau bus netrukus.
- „Apie šį puslapį" puslapis su „Apie" ir „Padėkos" skirtukais; nurodyti žmonės gali būti susieti su savo freepost profiliais ir rodyti savo profilio nuotraukas.
- Atnaujinimų sąrašas perkeltas į hub'ą, todėl pasiekiamas iš bet kur.
- Bendra viršutinė juosta kiekviename puslapyje — kalbos perjungimas, pranešimai ir prisijungimas/profilio nuotrauka dabar pasiekiami visur, įskaitant pagrindinį puslapį.
- Vartotojų paieška freepost'e — galima rasti vartotojus pagal vardą; pagal nutylėjimą rodomi visi vartotojai, o sąrašas siaurėja rašant.
- Grįžimo mygtukas po antrašte kiekviename puslapyje.
- Lietuvos vėliavos spalvos „GDLT" užraše.
- Įkėlimo piktograma, rodoma kol puslapis dar kraunasi.

### Pakeista
- Švarios nuorodos be „#" (pvz., `/gdlt-hub/freepost` vietoje `/gdlt-hub/#/freepost`).
- Discord prisijungimas centralizuotas visam hub'ui ir po prisijungimo grąžina į pagrindinį puslapį.
- Antraštės logotipe dabar rašoma „GDLT Hub" ir šalia rodomas dabartinis puslapis.

### Pašalinta
- Atnaujinimų sąrašas nebėra freepost viduje (dabar jis yra hub'o lygyje).

### Pataisyta
- Pridėtas tarpas po paskutiniu įrašo komentaru.

## [v0.2.2] - 2026-07-05

### Pridėta
- AREDL statistika profilyje — rodoma bendri taškai (su paketais), įveiktų extreme demonų skaičius, sunkiausias demonas ir vietos pasaulyje bei šalyje (pagal taškus ir demonus). Duomenys automatiškai gaunami pagal Discord paskyrą.
- Sunkiausias demonas rodomas kaip išryškinta juosta su lygio miniatiūra.
- Nuoroda į vartotojo AREDL profilį.

## [v0.2.1] - 2026-07-05

### Pridėta
- Socialinių tinklų nuorodos profilyje — galima nurodyti YouTube, X, Bluesky, Twitch, Instagram, TikTok, GitHub, Steam, Spotify ir asmeninės svetainės nuorodas.
- Pasirinktinės nuorodos — iki 5 papildomų nuorodų su savo pavadinimu.
- Nuorodos rodomos kaip spustelėjamų piktogramų eilutė po vartotojo vardu ir atsidaro naujame skirtuke.
- Rodomas vardas — galima pasirinkti bet kokį vardą (iki 32 simbolių); pagal nutylėjimą naudojamas Discord vardas.
- Profilio peržiūra — savo profilyje galima įjungti peržiūrą ir pamatyti, kaip jį mato kiti lankytojai.

### Pataisyta
- Prisijungus arba atsijungus dabar visada grįžtama į pagrindinį puslapį, o ne į paskutinį lankytą puslapį.

## [v0.2.0.2] - 2026-07-05

### Pataisyta
- Prisijungus per Discord, grįžimas atgal į puslapį neveikė publikuotoje (GitHub) versijoje — dabar nukreipimas veikia tiek publikuotoje, tiek kūrimo aplinkoje.

## [v0.2.0.1] - 2026-07-05

### Pataisyta
- Pradžioje įkeliant puslapį, profilių nuotraukos įrašuose kartais nepasirodydavo — dabar jos užsikrauna iš karto.
- Teisingai nustatyti Discord prisijungimui reikalingi kintamieji, kurie nebuvo perkelti iš dev aplinkos

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

