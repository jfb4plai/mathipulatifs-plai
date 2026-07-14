# Design — Séries d'exercices

Date : 2026-07-14
Projet : Mathipulatifs PLAI

## Problème

Aujourd'hui `1 exercice = 1 item`. La table `mathip_exercises` porte un `config`
unique (une seule heure cible, un seul montant, un seul nombre), l'élève fait une
manipulation, valide, et c'est terminé. On n'accède pas à une compétence avec un
seul exercice, et le résultat « correct / incorrect » sur un item unique est
inexploitable pour l'enseignant.

## Décisions déjà prises (ne pas re-débattre)

1. **Périmètre** : les 7 manipulables « notables » reçoivent le cycle complet
   (indice → réessai → correction → item suivant). Barres de fractions reste hors
   série (voir « Hors périmètre »).
2. **En cas d'erreur** : indice contextuel, l'élève réessaie ; après N échecs la
   réponse est montrée puis on avance. **On ne bloque jamais l'élève.**
3. **Génération des séries** : les deux modes, au choix de l'enseignant — série
   **fixe** (générée à la création, prévisualisable et éditable) ou série
   **aléatoire** (tirée à la volée, différente pour chaque élève).

## Deux constats issus de l'inspection du code

### Tous les manipulables ne savent pas dire « juste / faux »

| Manipulable | Notion de « correct » |
|---|---|
| Blocs base 10 | oui, si `targetNumber` défini |
| Droite numérique | oui, en mode `placer` |
| Réglettes Cuisenaire | oui, si `targetNumber` défini |
| Cadres à 10 | oui, si `targetNumber` défini |
| Grille des 100 | oui, en mode `multiples` |
| Horloge | oui, en mode `placer` ou `lire` |
| Monnaie | oui, si cible définie (`composer` ou `rendu`) |
| **Barres de fractions** | **non — n'émet jamais `correct`** |

`FractionBars` est un outil d'exploration/comparaison pur. L'intégrer à une série
notée exigerait de lui inventer une consigne cible (« colorie 3/4 », « trouve une
fraction égale à 1/2 ») : c'est une feature à part entière, hors de ce périmètre.

Corollaire : les modes « exploration libre » de n'importe quel manipulable n'ont
pas de cible — une série ne s'y applique pas.

### Deux contrats coexistent aujourd'hui

- **Contrat « item résolu »** (`Clock`, `Base10Blocks`) : le composant gère son
  propre cycle erreur → indice → réessai, et n'appelle `onValidate` **qu'une
  fois**, quand l'item est définitivement résolu (réussi, ou corrigé après N
  échecs). C'est exactement le contrat dont la boucle de série a besoin.
- **Contrat « validé une fois, verrouillé »** (`NumberLine`, `CuisenaireRods`,
  `TenFrames`, `HundredChart`, `Money`) : `onValidate` est appelé dès la première
  validation, juste ou fausse, et tout se verrouille. Pas d'indice, pas de
  seconde chance.

C'est ce second groupe que le Lot A vient corriger.

---

## Architecture générale (les 3 lots)

### L'étiquette `kind` — la clé du diagnostic

Chaque item porte une étiquette de type/difficulté. Le diagnostic **agrège par
étiquette**, jamais par identité d'item : c'est ce qui permet au tableau de bord
de fonctionner identiquement pour les séries fixes et aléatoires, et c'est de
toute façon la seule information didactiquement utile (« Léo rate les quarts
d'heure », pas « Léo rate l'item 3 »).

| Manipulable | Étiquettes |
|---|---|
| Horloge | `heure-pleine` · `demie` · `quart` · `cinq-min` |
| Monnaie | `euros-ronds` · `euros-et-50c` · `centimes` · `rendu` |
| Blocs base 10 | `dizaines` · `centaines` · `avec-echange` |
| Cadres à 10 | `jusqu-a-10` · `jusqu-a-20` |
| Réglettes Cuisenaire | `petit-total` · `grand-total` |
| Droite numérique | `entiers` · `avec-pas` · `relatifs` |
| Grille des 100 | `multiples-faciles` (2, 5, 10) · `multiples-difficiles` (3, 4, 7…) |

La progression graduée de l'Horloge (`heure-pleine` → `demie` → `quart` →
`cinq-min`) est ancrée RISS : Gangloff-Grateau (2023, `dumas-04649697`), déjà
citée dans le guide de l'app, établit que l'apprentissage de la lecture de
l'heure gagne à être « explicite et progressif — heure pleine, puis demi-heure,
puis quart d'heure ».

### Modèle de données (aucune migration bloquante)

`config` et `reponse` sont déjà des colonnes `jsonb`.

```js
config = {
  ...paramètres communs au manipulable (granularity, maxDenomination, ...),
  allowMultipleAttempts: true,       // Lot A
  showSolutionAfterAttempts: 2,      // Lot A ; 0 = ne jamais révéler

  seriesMode: 'fixe' | 'aleatoire',  // Lot B ; absent = exercice mono-item
  itemCount: 8,                      // Lot B
  difficulty: 'jusqu-aux-quarts',    // Lot B — borne haute de la progression
  items: [                           // Lot B — présent si seriesMode === 'fixe'
    { kind: 'heure-pleine', targetTime: { h: 3, m: 0 } },
    { kind: 'demie',        targetTime: { h: 7, m: 30 } },
  ],
}
```

Un item n'est **qu'un override de la config de base**. La vue élève fusionne
`{ ...configBase, ...item }` et passe le résultat au manipulable, dont l'API ne
change pas. C'est ce qui rend la boucle générique aux 7 manipulables.

**Rétrocompatibilité** : absence de `seriesMode` → exercice mono-item, comportement
actuel strictement identique. Aucun exercice existant ne casse.

### Découpage en lots

- **Lot A** — le cycle indice / réessai / révélation sur les manipulables qui en
  manquent. Indépendant du reste, et améliore l'app **dès aujourd'hui** en
  mono-item. **C'est l'objet du présent cycle d'implémentation.**
- **Lot B** — la boucle de série, les générateurs, l'écran de création.
- **Lot C** — le diagnostic par étiquette au tableau de bord (dépend de B pour les
  données).

Les lots B et C feront chacun l'objet de leur propre spec et de leur propre plan.

---

# LOT A — périmètre du présent cycle

## Le contrat unifié

`Base10Blocks` possède **déjà** exactement le mécanisme voulu, piloté par deux
réglages. Plutôt que d'inventer, on généralise ce contrat existant aux 6 autres
manipulables notables.

```js
config = {
  allowMultipleAttempts: true,    // défaut
  showSolutionAfterAttempts: 2,   // défaut ; 0 = ne jamais révéler automatiquement
}
```

Le défaut retenu est **2** pour les 7 manipulables. `Base10Blocks` utilise
aujourd'hui 3 (dans le composant et dans `ExerciseCreate`) : son défaut est aligné
sur 2 pour l'uniformité. Les valeurs proposées à l'enseignant restent celles déjà
en place pour `base10` : jamais / 2 / 3 / 5 échecs.

Comportement à la validation, quand une cible est définie :

- **Réponse juste** → `onValidate({ correct: true, attempts })`, verrouillage,
  message de réussite.
- **Réponse fausse** :
  - si `allowMultipleAttempts === false` →
    `onValidate({ correct: false, attempts: 1 })`, verrouillage, la bonne réponse
    est montrée. (Usage « évaluation ».)
  - sinon → `attempts++`, **un indice spécifique s'affiche**, rien n'est
    verrouillé, l'élève réessaie. `onValidate` **n'est pas appelé**.
    - dès que `showSolutionAfterAttempts > 0` et
      `attempts >= showSolutionAfterAttempts` → la solution est **révélée
      automatiquement** (voir « Révélation »), puis
      `onValidate({ correct: false, attempts, solutionShown: true })` et
      verrouillage.
- **Pas de cible** (mode exploration libre) → `onValidate({ correct: null })`,
  verrouillage. Comportement actuel, inchangé.

L'élève n'est jamais bloqué : soit il réussit, soit la réponse lui est montrée.

### La Droite numérique n'a pas de cible configurable

Découverte à l'inspection : `NumberLine` **tire sa cible au hasard au montage**
(`useState(() => ticks[Math.floor(Math.random() * ticks.length)])`). L'enseignant
ne peut donc pas décider quel nombre l'élève doit placer — contrairement à tous
les autres manipulables, dont la cible vient du `config`.

Le Lot B en aura impérativement besoin (un item de série *est* une cible imposée).
L'ajout d'un `targetValue` optionnel dans le `config` (repli sur le tirage
aléatoire actuel si absent) est trivial et sans risque : il est fait **dès le
Lot A**, et exposé dans `ExerciseCreate`.

### Changement de comportement sur l'Horloge

`Clock` affiche aujourd'hui un bouton **opt-in** « Montre-moi la réponse » après 2
tentatives ; l'élève peut réessayer indéfiniment sans jamais le cliquer. Pour se
conformer à la règle retenue (« après N échecs on montre la réponse ») et pour que
l'item se résolve toujours — condition nécessaire à la boucle du Lot B — la
révélation devient **automatique** au seuil. Le bouton opt-in disparaît.

## La révélation (« recalage »)

Le motif validé sur l'Horloge est repris partout : la réponse de l'élève reste
affichée ~2 s (il regarde ce qu'il a produit), puis la bonne réponse apparaît par
une transition **lente et visible**, jamais par un saut instantané.

- **Géométrique** (position animable) : `Clock` (aiguilles, déjà fait),
  `NumberLine` (le jeton glisse jusqu'à la cible).
- **Discret** (remplissage) : `TenFrames`, `HundredChart`, `CuisenaireRods`,
  `Money` — la bonne réponse se compose sous les yeux de l'élève, avec un léger
  décalage entre les éléments plutôt qu'en bloc.

Pour les manipulables à **solutions multiples** (`CuisenaireRods`, `Money`), on
révèle **une** solution valide (décomposition gloutonne, plus grandes valeurs
d'abord) en indiquant explicitement qu'il en existe d'autres.

## Les indices, manipulable par manipulable

Un indice générique (« ce n'est pas ça ») ne sert à rien. Chacun reçoit le sien.

| Manipulable | Indice |
|---|---|
| **Droite numérique** | Directionnel, sans donner la réponse : « Tu es sur 12. La cible 17 est plus à **droite**. » |
| **Cadres à 10** | « Tu as rempli 5 cercles. Il t'en manque **2**. » / « C'est **3** de trop. » |
| **Réglettes Cuisenaire** | « Ton total fait 8. Il te manque **2** pour atteindre 10. » / « C'est **3** de trop. » |
| **Grille des 100** | « Il te manque **2** multiples de 5. » et/ou « Tu as colorié **3** cases qui ne sont pas des multiples de 5. » |
| **Monnaie** | La jauge temps réel **est déjà** l'indice. À l'échec, on devient directif : « Il te manque 0,50 € — essaie d'ajouter une pièce de **50 centimes**. » (on suggère la plus grosse pièce disponible ≤ écart). |
| **Horloge** | Déjà fait (« La grande aiguille doit pointer sur le 6 »). |
| **Blocs base 10** | Déjà fait (rétroaction guidée + regroupement). |

Le principe : l'indice nomme **l'écart** et **la direction**, il ne donne pas la
réponse. Exception assumée pour la Monnaie et Cuisenaire, où l'écart chiffré *est*
le levier d'apprentissage (comme voir sa pile de pièces trop courte).

## Fichiers concernés

**Modifiés — les 5 composants à enrichir :**
- `src/components/manipulatives/NumberLine.jsx`
- `src/components/manipulatives/CuisenaireRods.jsx`
- `src/components/manipulatives/TenFrames.jsx`
- `src/components/manipulatives/HundredChart.jsx`
- `src/components/manipulatives/Money.jsx`

**Modifié — alignement de la révélation :**
- `src/components/manipulatives/Clock.jsx` (révélation automatique au seuil)

**Modifié — exposer les deux réglages pour les 7 manipulables :**
- `src/pages/ExerciseCreate.jsx` — aujourd'hui `allowMultipleAttempts` et
  `showSolutionAfterAttempts` ne sont proposés que pour `base10`. Ils deviennent
  un bloc commun affiché pour tout manipulable ayant une cible.

**Inchangés :** `Base10Blocks.jsx` (possède déjà le contrat), `FractionBars.jsx`
(hors périmètre), `StudentView.jsx`, `Dashboard.jsx`, la base de données.

## Vérification

Le projet n'a **pas** de framework de test (cf. `package.json`) — ne pas en
introduire. La vérification se fait par :
1. `npx vite build` sans erreur (obligatoire avant tout push, règle du projet).
2. Test manuel navigateur sur les routes démo publiques (pas d'authentification) :
   `/exercice/demo-cadres10`, `/exercice/demo-cuisenaire`, `/exercice/demo-monnaie`,
   `/exercice/demo-grille100`, `/exercice/demo-droite-numerique`, `/exercice/demo-horloge`.
   Pour chacun : réponse fausse → l'indice attendu s'affiche et rien ne se
   verrouille ; 2e échec → la solution se révèle lentement et l'item se verrouille ;
   réponse juste → succès immédiat.

Attention (piège rencontré dans ce dépôt) : les lanceurs de serveur par nom
peuvent servir un autre checkout. Démarrer `vite` explicitement depuis le
répertoire de travail et vérifier que les fichiers servis en proviennent bien.

## Hors périmètre

- `FractionBars` (aucune notion de « correct » — nécessiterait d'inventer une
  consigne cible : feature à part).
- La boucle de série, les générateurs, l'écran de création (Lot B).
- Le diagnostic par étiquette au tableau de bord (Lot C).
- Toute migration de base de données : aucune n'est nécessaire pour le Lot A.
- Les étiquettes `kind` : elles ne sont **pas** utilisées par le Lot A (elles ne
  servent qu'à partir du Lot B). Elles sont documentées ici pour mémoire.
