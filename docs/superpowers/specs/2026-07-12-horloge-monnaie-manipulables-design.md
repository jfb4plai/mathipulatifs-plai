# Design — Manipulables Horloge & Monnaie

Date : 2026-07-12
Projet : Mathipulatifs PLAI

## Contexte

L'app compte 6 manipulables mathématiques (Base10Blocks, NumberLine, FractionBars,
CuisenaireRods, TenFrames, HundredChart), tous suivant le même pattern architectural.
Ce spec ajoute deux nouveaux manipulables — Horloge et Monnaie — en réutilisant ce
pattern à l'identique.

## Pattern existant (rappel, non modifié)

Chaque manipulable touche 7 points :
1. Composant React dans `src/components/manipulatives/<Nom>.jsx` — reçoit `config` et
   `onValidate`, gère son propre état local, appelle `onValidate({..., correct})`
2. `StudentView.jsx` — import du composant, branche dans `ManipulativeComponent`,
   entrée dans `DEMO_CONFIGS` pour le mode démo sans compte
3. `ExerciseCreate.jsx` — entrée dans le tableau `manipulatives`, state de config
   dédié, branche dans `buildConfig()`, branche de pré-remplissage dans
   `loadExercise()`, panneau de configuration UI
4. `Dashboard.jsx` — entrée dans `manipulativeLabels`
5. `Home.jsx` — carte dans le tableau `manipulatives` + entrée `colorMap`
6. `Guide.jsx` — entrée dans `MANIPULATIVES` (niveaux, compétences FWB, description,
   progression CPA) + références RISS le cas échéant
7. `supabase/migrations/` — la contrainte `check (manipulative in (...))` sur
   `mathip_exercises` doit être élargie

Le mode CPA guidé (concret → pictural → abstrait) est déjà géré de façon générique par
`StudentView.jsx` via `exercise.config.cpaMode` — aucun changement nécessaire côté CPA,
les nouveaux manipulables en héritent automatiquement.

## 1. Horloge (`id: 'horloge'`)

Cadran SVG avec aiguilles heures/minutes, sur le modèle de `NumberLine.jsx` (jeton
draggable → ici deux aiguilles draggables).

### Config
```js
{
  mode: 'libre' | 'placer' | 'lire',
  granularity: 60 | 30 | 15 | 5,   // pas en minutes : heure pleine / demi / quart / 5 min
  targetTime: { h: number, m: number } | undefined,  // requis en mode 'placer'
  cpaMode: boolean,
}
```

### Comportement par mode
- **libre** : aiguilles glissables sans contrainte, exploration. `onValidate` renvoie
  l'heure affichée sans notion de « correct » (comme NumberLine mode libre).
- **placer** : une heure cible est affichée en texte (ex. « Place 14h30 »), l'élève
  positionne les aiguilles, la validation compare l'heure obtenue à `targetTime`
  (tolérance = `granularity`).
- **lire** : les aiguilles sont fixées (non draggables) sur une heure choisie au hasard
  respectant `granularity` si `targetTime` n'est pas fourni, sinon sur `targetTime`.
  L'élève saisit l'heure dans deux champs numériques (heures / minutes). Validation par
  comparaison stricte.

### Interaction technique
- Rendu SVG : cadran, 12 graduations, aiguille heures (courte, épaisse) et aiguille
  minutes (longue, fine), draggables via `pointerdown/move/up` sur des poignées
  circulaires en bout d'aiguille (même technique que le jeton de `NumberLine.jsx` —
  calcul d'angle au lieu de position X).
- Le glissement de l'aiguille des heures dans un cadran à `granularity` grossière (60,
  30) doit s'aimanter (snap) à la graduation la plus proche pour rester utilisable au
  doigt sur tablette.

## 2. Monnaie (`id: 'monnaie'`)

Banque de pièces/billets euros cliquables, sur le modèle de `Base10Blocks.jsx` /
`CuisenaireRods.jsx`.

### Config
```js
{
  mode: 'composer' | 'rendu',
  targetAmount: number | undefined,   // centimes, mode 'composer', optionnel = libre
  price: number | undefined,          // centimes, mode 'rendu'
  paid: number | undefined,           // centimes, mode 'rendu'
  maxDenomination: 200 | 500 | 2000 | 5000,  // centimes — plafonne les pièces/billets disponibles
  cpaMode: boolean,
}
```

### Dénominations disponibles (centimes)
`[1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000]` filtrées par
`<= maxDenomination`. Représentation visuelle : cercles proportionnels pour les pièces
(couleur cuivre/or selon valeur), rectangles pour les billets (couleurs officielles
euro simplifiées) — pas d'images de billets réels scannées, uniquement des formes/
couleurs stylisées pour rester libre de droits.

### Comportement par mode
- **composer** : banque de pièces/billets cliquables → ajoutées à l'espace de travail,
  total affiché en continu. `targetAmount` optionnel ; si présent, validation compare
  le total à la cible (comme Cuisenaire).
- **rendu** : énoncé généré affichant « Prix : Y € — Payé : X € », l'élève compose le
  rendu attendu (`X - Y`) en cliquant des pièces/billets. Toute combinaison dont la
  somme est exacte est acceptée (pas de contrainte sur le nombre minimal de pièces —
  choix pédagogique pour rester accessible aux élèves en difficulté).

## Ancrage RISS (à vérifier via `mcp__RISS__get_article` avant rédaction finale de Guide.jsx)

- Horloge : Gangloff-Grateau 2019 (`dumas-04649697`, structuration du temps en classe),
  Bertrand 2018 (`dumas-02000366`, outils de structuration temporelle chez élèves à
  troubles des fonctions cognitives)
- Monnaie : Fix 2016 (`dumas-01380192`, fausse monnaie et motivation en
  différenciation), David-Blandin 2021 (`dumas-03282600`, monnaie comme objet
  d'apprentissage du nombre chez élèves à besoins éducatifs particuliers)

Ces 4 références ont déjà été localisées par recherche RISS (`search_articles`) au
stade du brainstorming ; leur contenu complet doit être relu via `get_article` au
moment d'écrire les paraphrases dans `Guide.jsx`, comme pour les 9 références
existantes.

## Migration base de données

Nouvelle migration `supabase/migrations/<timestamp>_add_horloge_monnaie_manipulatives.sql` :
```sql
ALTER TABLE public.mathip_exercises DROP CONSTRAINT IF EXISTS mathip_exercises_manipulative_check;
ALTER TABLE public.mathip_exercises ADD CONSTRAINT mathip_exercises_manipulative_check
  CHECK (manipulative IN ('base10', 'droite-numerique', 'fractions', 'cuisenaire', 'cadres10', 'grille100', 'horloge', 'monnaie'));
```
(Nom exact de la contrainte à vérifier dans le schéma live avant d'écrire la migration
— `schema.sql` local est décrit comme périmé, cf. audit précédent.)

## Hors périmètre

- Pas de génération d'énoncés aléatoires « problèmes de monnaie » en langage naturel
  (ex. « Paul achète... ») — seuls prix/payé numériques bruts sont configurés par
  l'enseignant dans un premier temps.
- Pas de son distinct par manipulable — TTS générique existant réutilisé tel quel.
- Pas de nouvelle table Supabase — ces deux manipulables réutilisent `mathip_exercises`
  / `mathip_sessions` comme les 6 existants.
