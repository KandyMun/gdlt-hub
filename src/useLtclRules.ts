import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from './firebase'

// The LTCL submission rules, stored as a single editable markdown blob in
// Firestore (config/ltclRules). Admins edit it in the admin panel with a
// formatting toolbar + live preview; everyone else reads the rendered result.
export const DEFAULT_LTCL_RULES = `## Completion'ų submittinimo taisyklės

- Completion'as turi būti nufilmuotas ir su aiškiai girdimais clickais.
- Turi būti matoma mirtis prieš completion'o attempt'ą. (jei sugebėjai įveikt per vieną attempt'ą po practice arba iškart įeinant į lygį, turi parodyt ir tai)
- Po lygio įveikimo turi būti matoma "Level Complete" lentelė (endscreen'as). Jei kampe įjungtas Cheat Indicator, užtenka tik "Level Complete" teksto.
- Lygius pereikite kaip skirta. Jei skip/bug praleidžią didelę dalį lygio jūsų įveikimo tikrai nepriimsime. Jei challenge esmė yra prastas matomumas ar kažkas panašaus, hack'ai "No Camera Zoom", "No Camera Move", "No Particles" ir "No Shaders" nėra leidžiami.

## Challenge'ų submittinimo taisyklės

- Challenge negali būti layout. Turi būti kažkiek dekoruotas, normaliai sustruktūruotas ir būt bent šiek tiek visually appealing. OBJEKTŲ SPAM =/= DEKORACIJA, nebent ji padaryta tinkamai (pavyzdžiui Slick Challenge series, Say Gex). Default layout blokus naudot galima, bet tada turi būti labai geros ir pilnai užpildytos struktūros, ir/arba normalesnė fono dekoracija. Ar jūsų lygio dekoracija gerai atrodo nusprendžia list modai, tad jei ir jūsų lygis atrodo pilnas, bet nuo jo norisi vemt, mes laisvai galime jį atmesti.
- Challenge turi būti visiškai originalus.
- Patvirtinimai turi būti keliami į YouTube. Ar viešas ar neįtrauktas į sąrašą, jau jūsų sprendimas.
- Jei lygis gauna update'ą ir jis labai mažai pakeičia arba išvis nekeičia sunkumo, patvirtinti arba pereiti iš naujo nebūtina.
- Challenge turi būti pilnai lietuviškas - gameplay sukurtas lietuvio, dekoracija sukurta lietuvio. Tačiau patvirtinimas gali būti ne lietuvio.
- Challenge'ai gali būti patvirtinami su CBF, tik jei bus naudojama oficiali žaidimo versija.
- Naudok bendrą išprusimą ir neieškok spragų taisyklėse.`

export function useLtclRules() {
  const [rules, setRules] = useState<string>(DEFAULT_LTCL_RULES)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    return onSnapshot(doc(db, 'config', 'ltclRules'), (snap) => {
      const text = snap.exists() ? (snap.data().text as string | undefined) : undefined
      setRules(text && text.trim() ? text : DEFAULT_LTCL_RULES)
      setLoaded(true)
    })
  }, [])

  return { rules, loaded }
}

export async function setLtclRules(text: string) {
  await setDoc(doc(db, 'config', 'ltclRules'), { text }, { merge: true })
}
