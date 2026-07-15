# Design — Lot B : série d'exercices (1 à 10 items)

Date : 2026-07-15
Projet : Mathipulatifs PLAI

## Contexte

Suite du spec `2026-07-14-series-exercices-design.md`, qui posait l'architecture
partagée des 3 lots et décidait : cycle indice/réessai (Lot A, livré), les 2 modes
de génération (fixe/aléatoire), et l'étiquette `kind` par manipulable pour le futur
diagnostic (Lot C, toujours hors scope).

Demande précise du 2026-07-15 : un exercice reste **une seule entité** assignée par
l'enseignant (un lien, une ligne `mathip_exercises`), mais peut désormais contenir
une **série de 1 à 10 items**, avec validation et/ou modification des items générés
par l'enseignant avant publication.

## Décisions prises pendant le brainstorming (ne pas re-débattre)

1. **Les deux modes de génération dès ce lot** : fixe (prévisualisable, éditable)
   et aléatoire (tiré à la volée par élève, non prévisualisable).
2. **Modification enseignant = édition de valeur uniquement.** Pas de bouton
   « régénérer un item », pas de suppression, pas de réordonnancement. L'enseignant
   ajuste la valeur cible de chaque item généré, un par un, via le même champ
   qu'aujourd'hui pour un exercice mono-item.
3. **Paramétrage initial** : l'enseignant choisit `itemCount` (1-10) et un niveau de
   `difficulty` (borne haute de la progression pédagogique) ; le système distribue
   automatiquement les items sur les catégories (`kind`) autorisées jusqu'à cette
   borne.
4. **Navigation élève : auto-avance après résolution complète** (réponse juste, ou
   révélation après N échecs) — jamais de bouton « item suivant ». Le prochain item
   apparaît une fois l'animation de correction terminée, pas avant.
5. **Mode CPA désactivé pour les séries.** Disponible seulement quand
   `itemCount` vaut 1 (ou est absent). Un texte d'aide sous le contrôle CPA dans
   `ExerciseCreate` explique pourquoi et comment l'activer (repasser en mono-item).
6. **Résultat enseignant** : score global (« 6/8 ») + détail par item dépliable.
   Pas d'agrégation par étiquette (`kind`) — ça reste le Lot C.

## Fondation technique : généraliser le signal de fin d'animation

**Problème découvert en corrigeant le mode CPA le même jour** : `handleValidate`
dans `StudentView.jsx` ne pouvait pas se fier au seul appel `onValidate` pour savoir
quand une réponse est *visuellement* stabilisée — Horloge appelle `onValidate`
**avant** la fin de son animation de recalage dans le cas « réponse approximative
acceptée », sans jamais le signaler (ce cas n'active pas `solutionShown`, qui ne
couvre que la révélation après échecs). Le correctif retenu pour CPA a été de
remplacer toute logique de délai par un bouton explicite « Continuer ».

**Pour la série, on ne peut pas se permettre un bouton à chaque item** (décision 4
ci-dessus : auto-avance). Il faut donc un signal de timing exact et fiable. On
généralise : chaque manipulable renvoie un champ **`revealMs`** dans son objet
`onValidate` — durée en millisecondes de l'animation encore à jouer après l'appel
(`0` si aucune, verrouillage instantané). `solutionShown` reste tel quel (il pilote
l'affichage du bandeau « voici la solution », inchangé depuis le Lot A) ; `revealMs`
est un champ additionnel, utilisé uniquement pour le timing par les consommateurs
(ici, la boucle de série).

Valeurs exactes, auditées depuis le code Lot A déjà écrit (mécanique, pas de
nouveau design) :

| Manipulable | Réponse juste | Révélation après échecs |
|---|---|---|
| Base10Blocks | `revealMs: 0` | `revealMs: 0` (verrouillage instantané, pas d'animation) |
| TenFrames, CuisenaireRods, HundredChart, Money | `revealMs: 0` | `revealMs: 2000` |
| NumberLine | `revealMs: 0` | `revealMs: 4000` (pause 2000 + glissement animé 2000) |
| Clock | `revealMs: 0` si précis, **`revealMs: 4500`** si approximatif accepté (recalage) | `revealMs: 4000` |

Ce correctif de fondation touche les 7 mêmes fichiers que le Lot A (ajout d'un seul
champ dans les appels `onValidate` déjà existants) — pas une refonte.

## Modèle de données

`config` (jsonb, déjà existant, aucune migration bloquante) :

```js
config = {
  // ... paramètres de base du manipulable, inchangés (granularity, maxDenomination, mode, ...)

  seriesMode: 'fixe' | 'aleatoire',   // absent = exercice mono-item, comportement actuel strictement inchangé
  itemCount: 8,                       // 1 à 10
  difficulty: 'jusqu-aux-quarts',      // borne haute — valeurs par manipulable, voir génération ci-dessous
  items: [                            // présent seulement si seriesMode === 'fixe'
    { kind: 'heure-pleine', targetTime: { h: 3, m: 0 } },
    { kind: 'demie',        targetTime: { h: 7, m: 30 } },
  ],
}
```

Un item est fusionné sur la config de base (`{ ...configBase, ...item }`) avant
d'être transmis au manipulable — l'API des 7 composants ne change pas au-delà de
l'ajout de `revealMs` (fondation ci-dessus).

**Série disponible seulement quand le manipulable/mode a une notion de cible** —
même logique que le gating déjà construit en Lot A dans `ExerciseCreate`
(`RetryCycleFields` affiché seulement si `hasTarget`). Concrètement : Droite
numérique doit être en mode `placer`, Grille des 100 en mode `multiples`, Horloge
en mode `placer` (le mode `lire` reste mono-item pour l'instant — hors scope,
aucune demande dessus). Barres de fractions reste totalement hors périmètre
(aucune notion de correct, cf. spec du 14/07).

## Génération par manipulable

Chaque manipulable a une fonction génératrice `generateItem(kind, config)` →
override partiel de config. La distribution des `itemCount` items sur les `kind`
autorisés jusqu'à `difficulty` est un mélange (shuffle) couvrant si possible toutes
les catégories autorisées au moins une fois avant de répéter.

| Manipulable | `kind` (ordre croissant) | Génération |
|---|---|---|
| **Horloge** | `heure-pleine` → `demie` → `quart` → `cinq-min` | h aléatoire 1-12 ; m = 0 / 30 / {15,45} / multiple de 5 selon le kind |
| **Monnaie** (mode composer) | `euros-ronds` → `euros-et-50c` → `centimes` | montant multiple de 100 / de 50 non-multiple de 100 / quelconque, dans les bornes de `maxDenomination` |
| **Monnaie** (mode rendu) | `rendu` (catégorie unique) | prix + montant payé aléatoires, écart cohérent avec `maxDenomination` — la difficulté ne s'applique qu'en mode composer |
| **Blocs base 10** | `dizaines` → `centaines` | nombre à 2 chiffres / nombre à 3 chiffres, dans `maxNumber` |
| **Cadres à 10** | `jusqu-a-10` → `jusqu-a-20` | frames=1, cible 1-10 / frames=2, cible 11-20 |
| **Réglettes Cuisenaire** | `petit-total` → `grand-total` | cible 1-10 / cible 11-30 |
| **Droite numérique** | `entiers` → `avec-pas` → `relatifs` | step=1 dans [0,20] / step∈{2,5} / min négatif inclus |
| **Grille des 100** | `multiples-faciles` → `multiples-difficiles` | multipleOf ∈ {2,5,10} / multipleOf ∈ {3,4,6,7,8,9} |

Les plages numériques exactes ci-dessus sont des valeurs de départ raisonnables,
ajustables sans changer l'architecture — finalisées pendant l'implémentation comme
pour les tolérances du Lot A.

## ExerciseCreate — parcours enseignant

Après le choix du manipulable (et, si applicable, du mode `composer`/`rendu`,
`placer`/`multiples`…), un nouveau bloc **« Série »**, affiché seulement si le
manipulable/mode a une cible :

1. Toggle **Mono-item / Série**. Mono-item = comportement actuel exact,
   inchangé.
2. Si Série : `itemCount` (sélecteur 1 à 10), `difficulty` (menu déroulant, options
   ci-dessus par manipulable), et choix **Fixe / Aléatoire**.
3. **Mode fixe** : bouton « Générer les N items ». Affiche la liste des items
   générés, chacun avec le même champ de valeur cible que l'exercice mono-item
   (réutilisation directe des inputs déjà existants), pré-rempli et éditable.
   L'enseignant ajuste, puis publie.
4. **Mode aléatoire** : rien à prévisualiser. Les paramètres (`itemCount`,
   `difficulty`) sont enregistrés ; la génération se fait dans `StudentView` au
   chargement, avec une graine différente par élève (aucune persistance des items
   tirés dans `mathip_exercises` — seulement dans la session).
5. **CPA** : le toggle CPA est masqué/désactivé dès que le mode Série est actif
   (`itemCount > 1`), avec un texte d'aide : *« Le mode CPA (Concret-Pictural-
   Abstrait) n'est disponible que pour un exercice à un seul item — repassez en
   mono-item pour l'activer. »*

## StudentView — parcours élève

- État `currentItemIndex` (0-based), liste d'items résolue au montage (mode fixe :
  lue depuis `config.items` ; mode aléatoire : générée côté client par item, avec
  distribution identique à ExerciseCreate).
- En-tête « Item {i+1} / {itemCount} » affiché dès que la série est active.
- `ManipulativeComponent` reçoit `{ ...configBase, ...items[currentItemIndex] }`,
  monté avec `key={currentItemIndex}` — **remontage complet à chaque item**, pour
  que l'état interne du manipulable (tentatives, indice, espace de travail…) reparte
  à zéro. Sans ce `key`, l'état du composant survivrait entre deux items différents.
- À la résolution d'un item (`onValidate` appelé), la session accumule le résultat
  de l'item, puis attend `max(result.revealMs, 1200)` avant de passer à
  `currentItemIndex + 1` — le plancher de 1200 ms garantit que même une réponse
  juste immédiate (`revealMs: 0`) laisse le temps de voir le bandeau de succès
  avant l'item suivant. **Jamais avant que l'animation ne soit terminée**, sans
  jamais montrer de bouton.
- Dernier item résolu → écran de fin de série : score `{score}/{itemCount}`,
  détail dépliable par item (kind, réponse, juste/faux), bouton Recommencer.

## Session / Dashboard

`mathip_sessions.reponse`, pour une série, devient :

```js
{
  score: 6,
  total: 8,
  items: [
    { kind: 'heure-pleine', targetTime: {...}, correct: true, attempts: 1 },
    { kind: 'demie',        targetTime: {...}, correct: false, attempts: 3, solutionShown: true },
    // ...
  ],
}
```

`mathip_sessions.correct` (colonne existante) devient `score === total` pour une
série (booléen, cohérence avec les exercices mono-item existants qui l'utilisent
déjà comme filtre "réussite").

`Dashboard.jsx` : la ligne de résultat par élève affiche le score (`6/8`) au lieu
d'un badge correct/incorrect binaire quand `reponse.items` est présent ; un
disclosure (`<details>`) liste chaque item. Aucune agrégation par `kind` à travers
plusieurs élèves — ça reste le Lot C.

## Rétrocompatibilité

Absence de `seriesMode` dans `config` → comportement actuel strictement identique,
à tous les niveaux (ExerciseCreate, StudentView, Dashboard). Aucun exercice
existant ne change de comportement.

## Fichiers concernés

**Fondation (7 fichiers, ajout `revealMs`) :**
- `src/components/manipulatives/{Base10Blocks,TenFrames,CuisenaireRods,HundredChart,Money,NumberLine,Clock}.jsx`

**Génération (nouveaux fichiers ou fonctions) :**
- `src/lib/seriesGenerators.js` (nouveau) — une fonction génératrice par
  manipulable + la fonction de distribution `itemCount`/`difficulty` → liste de
  `kind`.

**Modifiés :**
- `src/pages/ExerciseCreate.jsx` — bloc Série, désactivation CPA conditionnelle.
- `src/pages/StudentView.jsx` — boucle sur les items, en-tête de progression,
  écran de fin de série, timing `revealMs`.
- `src/pages/Dashboard.jsx` — affichage score + détail dépliable.

**Inchangés :** `FractionBars.jsx` (hors périmètre), schéma de base de données
(colonnes jsonb déjà existantes).

## Vérification

Toujours pas de framework de test — `npx vite build` + test manuel navigateur.
Routes démo publiques existantes (`/exercice/demo-*`) restent mono-item ; la
vérification de série nécessitera de créer un exercice réel via `ExerciseCreate`
(authentification requise) ou d'ajouter temporairement un item `demo-serie-*` avec
`seriesMode` pour les tests, à retirer avant de committer.

## Hors périmètre

- Lot C : dashboard diagnostic agrégé par étiquette `kind` à travers plusieurs
  élèves.
- Mode CPA combiné à une série.
- Mode `lire` de l'Horloge en série (aucune demande dessus).
- `FractionBars` (aucune notion de correct).
- Bouton « régénérer un item », suppression, réordonnancement des items en mode
  fixe (décision 2).
