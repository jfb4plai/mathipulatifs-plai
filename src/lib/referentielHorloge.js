// Points du référentiel de Mathématiques FWB (tronc commun) auxquels se
// rattachent les modes de l'horloge. Textes repris tels quels des attendus
// (referentiels-fwb/maths/P2 à P6.json). Tous relèvent du Champ 2 « Des
// grandeurs à la relation entre variables », point 2.2 « Agir sur des grandeurs ».

export const REFERENTIEL_SOURCE =
  'Référentiel de Mathématiques, tronc commun FWB — Champ 2, point 2.2 « Agir sur des grandeurs »'

const LIRE = {
  intitule: 'Savoir-faire : utiliser des instruments, des supports pour exprimer un instant dans le temps',
  lignes: [
    { annees: 'P2', texte: "Lire l'heure sur un support : analogique : en heures ; digital : en heures et minutes." },
    { annees: 'P3', texte: "Lire l'heure sur un support analogique ou digital : en heures et minutes ; en heures, quart et demi-heure." },
    { annees: 'P4', texte: "Lire l'heure sur un support analogique ou digital : en heures et minutes ; en secondes ; en heures, quart et demi-heure." },
  ],
}

const NOTE_24H =
  "Le format 24 h et la distinction avant / après midi ne sont pas cités tels quels : le référentiel mentionne « 1 jour = 24 heures » (P3). C'est un prolongement de la lecture de l'heure."

const OPERER = (attendu) => ({
  intitule: 'Savoir-faire : opérer sur des durées en référence à des représentations visuelles',
  lignes: attendu,
})

export const REFERENTIEL_HORLOGE = {
  libre: null,
  lire: { ...LIRE, note: NOTE_24H },
  correspondance: { ...LIRE, note: NOTE_24H },
  placer: {
    ...LIRE,
    note: "Placer une heure est la réciproque de la lecture : le référentiel cite la lecture, pas le placement. " + NOTE_24H,
  },
  arrivee: OPERER([
    { annees: 'P4', texte: "Déterminer un instant d'arrivée ou de départ, au cours d'une même heure, à partir d'une durée donnée." },
    { annees: 'P5', texte: "Déterminer un instant d'arrivée ou de départ, à partir d'une durée donnée ne dépassant pas une heure." },
    { annees: 'P6', texte: "Déterminer un instant d'arrivée ou de départ, à partir d'une durée donnée." },
  ]),
  depart: OPERER([
    { annees: 'P4', texte: "Déterminer un instant d'arrivée ou de départ, au cours d'une même heure, à partir d'une durée donnée." },
    { annees: 'P5', texte: "Déterminer un instant d'arrivée ou de départ, à partir d'une durée donnée ne dépassant pas une heure." },
    { annees: 'P6', texte: "Déterminer un instant d'arrivée ou de départ, à partir d'une durée donnée." },
  ]),
  duree: OPERER([
    { annees: 'P4', texte: "Déterminer et représenter (horloge, chronomètre, ligne du temps…) une durée au cours d'une même heure." },
    { annees: 'P5', texte: "Déterminer et représenter (horloge, chronomètre, ligne du temps…) une durée ne dépassant pas une heure." },
    { annees: 'P6', texte: "Déterminer et représenter (horloge, chronomètre, ligne du temps…) une durée pouvant dépasser une heure." },
  ]),
  horaire: {
    intitule: 'Compétence : recourir à divers outils et stratégies pour anticiper, représenter, planifier, gérer le temps',
    lignes: [
      { annees: 'P6', texte: "Établir l'horaire d'une journée, en organisant les activités choisies parmi celles proposées, selon leurs durées respectives et les durées intermédiaires (repas, pauses, déplacements éventuels…)." },
    ],
    note: "Dans l'exercice, les activités s'enchaînent sans durée intermédiaire : c'est une version simplifiée de l'attendu.",
  },
}
