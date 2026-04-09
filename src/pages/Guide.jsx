import { Link } from 'react-router-dom'
import { useAccessibility } from '../contexts/AccessibilityContext.jsx'

const RISS_REFS = [
  {
    id: 'jolivel2023',
    citation: 'Jolivel, P. (2023). La manipulation en mathématiques. DUMAS.',
    riss: 'dumas-04324162',
    content:
      "Le triptyque manipulation–verbalisation–abstraction est au cœur de l'enseignement explicite en mathématiques. La manipulation libère l'élève de la tâche graphique et l'aide à utiliser un canal sensoriel privilégié. Elle doit être placée dans la phase d'acquisition et suivie d'une phase de verbalisation puis d'institutionnalisation.",
  },
  {
    id: 'bergeron2021',
    citation:
      "Bergeron, L. & Barallobres, G. (2021). Processus d'abstraction et difficultés d'apprentissage en mathématiques.",
    riss: 'W4410891703',
    content:
      "Rester dans le concret matériel sans progresser vers l'abstrait structurant éloigne l'élève de l'activité mathématique. Les manipulables doivent accompagner — et non remplacer — la montée vers l'abstraction symbolique.",
  },
  {
    id: 'dubar2022',
    citation:
      'Dubar, H. (2022). La manipulation en grandeurs et mesures au cycle 3. DUMAS.',
    riss: 'dumas-03790385',
    content:
      "Il est essentiel de marquer explicitement le passage du concret à l'abstrait et de laisser les élèves s'éloigner progressivement du matériel. La manipulation seule ne suffit pas : c'est le va-et-vient guidé entre les représentations qui construit la compréhension.",
  },
  {
    id: 'najjar2015',
    citation:
      "Najjar, N. (2015). L'impact de l'usage des TICE sur l'apprentissage des enfants et jeunes dyslexiques, dysorthographiques et dyscalculiques. Thèse de doctorat.",
    riss: 'tel-01358006',
    content:
      "Les outils numériques interactifs améliorent l'autonomie et l'estime de soi des élèves dys. L'appropriation progressive de l'outil, disponible à tout moment, réduit l'écart ressenti avec les pairs et favorise l'engagement.",
  },
  {
    id: 'ochsenbein2024',
    citation:
      "Ochsenbein, J. (2024). Favoriser la motivation et réduire l'anxiété en mathématiques dans les réseaux d'éducation prioritaires. DUMAS.",
    riss: 'dumas-04794253',
    content:
      "L'enseignement explicite réduit l'anxiété mathématique en rendant transparents les objectifs, les critères de réussite et les étapes de résolution. Particulièrement efficace en contexte prioritaire, il structure l'environnement cognitif et affectif.",
  },
  {
    id: 'vergoni2018',
    citation:
      "Vergoni, A. (2018). Les apports de la manipulation des réglettes Cuisenaire en mathématiques. DUMAS.",
    riss: 'dumas-01939040',
    content:
      "La manipulation des réglettes Cuisenaire facilite le passage à l'abstraction et rend plus efficace la construction des savoirs mathématiques. La progression du concret vers l'abstrait — caractéristique de cet outil — soutient durablement la compréhension des relations numériques.",
  },
  {
    id: 'lacombe2021',
    citation:
      "Lacombe, N., de Chambrier, A.-F. & Dias, T. (2021). Des données probantes au service de l'enseignement différencié des mathématiques.",
    riss: 'W4312556943',
    content:
      "L'approche CPA (Concret–Pictural–Abstrait), héritée des travaux de Bruner, propose un travail ancré dans le concret, puis la représentation en images, avant le passage à l'abstraction. Les données probantes confirment son efficacité pour l'enseignement différencié des mathématiques.",
  },
]

const HOWTO = [
  {
    num: '1',
    title: 'Explorer sans compte (mode démo)',
    color: 'blue',
    items: [
      "Sur la page d'accueil, cliquer « Essayer » sous le manipulable choisi.",
      'Aucune inscription requise — accès immédiat pour tester en classe ou en formation.',
      "Blocs de base 10 : cliquer Centaine / Dizaine / Unité pour ajouter des blocs à l'espace de travail. Cliquer un bloc dans l'espace pour le retirer.",
      'Droite numérique : glisser le jeton pour se déplacer sur la droite graduée.',
      'Barres de fractions : cliquer les parties des barres pour les colorier et découvrir les équivalences.',
      "Réglettes Cuisenaire : cliquer une réglette dans la banque pour l'ajouter, cliquer dans l'espace pour la retirer. Cible par défaut : 10.",
    ],
  },
  {
    num: '2',
    title: 'Créer un compte enseignant',
    color: 'green',
    items: [
      "Cliquer « Accéder à l'espace enseignant » → « Créer un compte ».",
      'Renseigner : nom, école (optionnel), niveau ciblé (primaire / secondaire / les deux).',
      'Connexion sécurisée via Supabase Auth. Aucune donnée élève nominative stockée côté serveur.',
    ],
  },
  {
    num: '3',
    title: 'Créer un exercice paramétré',
    color: 'purple',
    items: [
      'Tableau de bord → « Créer un exercice ».',
      "Saisir un titre et une consigne (lue à voix haute si l'élève active le mode audio).",
      'Choisir le manipulable et paramétrer :',
      '— Blocs base 10 : nombre cible optionnel, bouton Valider activé.',
      '— Droite numérique : min, max, pas, mode libre ou placer.',
      '— Barres de fractions : choisir les dénominateurs, mode libre ou comparer.',
      "— Réglettes Cuisenaire : total cible optionnel (ex. 10).",
      "Option « Mode CPA guidé » : après la manipulation, l'élève est guidé vers le dessin (Pictural) puis la notation (Abstrait).",
      'Valider → un lien unique (token) est généré automatiquement.',
    ],
  },
  {
    num: '4',
    title: 'Partager avec les élèves',
    color: 'orange',
    items: [
      'Copier le lien depuis le tableau de bord (bouton Copier).',
      'Les élèves accèdent via ce lien — aucun compte requis, juste leur prénom.',
      "Projeter le lien ou l'afficher via QR code pour les tablettes / iPads.",
      "La barre d'accessibilité est disponible pour chaque élève indépendamment.",
    ],
  },
  {
    num: '5',
    title: 'Consulter les résultats',
    color: 'red',
    items: [
      'Tableau de bord → chaque exercice affiche le nombre de sessions complétées.',
      "Détail par session : prénom de l'élève, réponse soumise, résultat, durée.",
    ],
  },
]

const ACCESSIBILITY = [
  { icon: '👁', label: 'Police Dyslexie', desc: 'Bascule vers OpenDyslexic — réduit les inversions de lettres perçues.' },
  { icon: '🔤', label: 'Grand texte', desc: 'Augmente la taille de tous les textes de ~25 %.' },
  { icon: '🎯', label: 'Mode Focus', desc: 'Grise les éléments non essentiels — réduit la distraction (TDAH).' },
  { icon: '🔊', label: 'Audio (TTS)', desc: 'Lit les consignes à voix haute via la synthèse vocale du navigateur (français).' },
]

const MANIPULATIVES = [
  {
    emoji: '🟦',
    name: 'Blocs de base 10',
    levels: 'P2–P6 · S1–S2 en difficulté',
    skills: 'Valeur positionnelle, numération, décomposition, échanges',
    desc: "Des unités (1), dizaines (10) et centaines (100) à composer dans un espace de travail. L'enseignant peut fixer un nombre cible — l'élève valide sa représentation.",
    cpa: "Concret : blocs → Semi-concret : schéma dessiné → Abstrait : écriture positionnelle",
  },
  {
    emoji: '↔️',
    name: 'Droite numérique',
    levels: 'P1–P5 · S1 en difficulté',
    skills: 'Ordre, comparaison, addition, soustraction, nombres relatifs',
    desc: 'Un jeton draggable sur une droite graduée SVG. Paramètres configurables : minimum, maximum, pas, mode libre ou placer un nombre cible.',
    cpa: 'Concret : déplacement du jeton → Semi-concret : flèche tracée → Abstrait : calcul symbolique',
  },
  {
    emoji: '🟩',
    name: 'Barres de fractions',
    levels: 'P4–P6 · S1–S3 en difficulté',
    skills: 'Fractions, équivalences, comparaison, ordre',
    desc: "Des barres horizontales divisées en N parts colorables. Détection automatique des équivalences (ex. 2/4 = 1/2). Dénominateurs configurables : 2, 3, 4, 5, 6, 8, 10, 12.",
    cpa: "Concret : coloration des parts → Semi-concret : dessin de la fraction → Abstrait : notation a/b",
  },
  {
    emoji: '🌈',
    name: 'Réglettes Cuisenaire',
    levels: 'P1–P5 · S1–S2 en difficulté',
    skills: "Décomposition additive, compléments, multiplication, fractions (introduction)",
    desc: "10 réglettes colorées de valeur 1 (blanche) à 10 (orange). L'élève compose un nombre cible en combinant des réglettes. Chaque couleur est unique — la couleur encode la valeur.",
    cpa: "Concret : assemblage des réglettes → Semi-concret : schéma en barres → Abstrait : égalité additive",
  },
]

export default function Guide() {
  const { dyslexicFont, largeText } = useAccessibility()

  return (
    <div className={`max-w-4xl mx-auto px-4 py-8 ${dyslexicFont ? 'font-dyslexic' : ''} ${largeText ? 'text-lg' : ''}`}>

      {/* En-tête */}
      <div className="mb-8">
        <Link to="/" className="text-blue-600 hover:underline text-sm">← Retour à l'accueil</Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">
          🧮 Mode d'emploi — Mathipulatifs PLAI
        </h1>
        <p className="text-gray-600 mt-2">
          Manipulables mathématiques virtuels pour la classe inclusive · Fédération Wallonie-Bruxelles
        </p>
      </div>

      {/* Les 3 manipulables */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Les 4 manipulables</h2>
        <div className="space-y-4">
          {MANIPULATIVES.map((m) => (
            <div key={m.name} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{m.emoji}</span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                    <h3 className="font-bold text-gray-900">{m.name}</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{m.levels}</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{m.desc}</p>
                  <div className="text-sm">
                    <span className="font-medium text-gray-600">Compétences FWB : </span>
                    <span className="text-gray-600">{m.skills}</span>
                  </div>
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                    <span className="font-semibold">Progression CPA : </span>{m.cpa}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Accessibilité */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Barre d'accessibilité</h2>
        <p className="text-sm text-gray-600 mb-4">
          Disponible en haut de chaque page, accessible à chaque élève indépendamment.
          Conçue pour les élèves présentant une dyslexie, un TDAH, une dyscalculie ou une anxiété mathématique.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACCESSIBILITY.map((a) => (
            <div key={a.label} className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg p-4">
              <span className="text-2xl">{a.icon}</span>
              <div>
                <div className="font-semibold text-gray-800 text-sm">{a.label}</div>
                <div className="text-xs text-gray-600 mt-0.5">{a.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mode d'emploi */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Mode d'emploi pas à pas</h2>
        <div className="space-y-4">
          {HOWTO.map((step) => (
            <div key={step.num} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <span className={`w-8 h-8 rounded-full bg-${step.color}-100 text-${step.color}-700 flex items-center justify-center font-bold text-sm`}>
                  {step.num}
                </span>
                <h3 className="font-semibold text-gray-800">{step.title}</h3>
              </div>
              <ul className="space-y-1.5">
                {step.items.map((item, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span className="text-gray-400 mt-0.5 shrink-0">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">💡 Conseil pédagogique CPA : </span>
            Après la manipulation, demander à l'élève de dessiner ce qu'il a construit (Pictural), puis d'écrire la notation mathématique (Abstrait). Ce va-et-vient est particulièrement efficace pour les élèves dyscalculiques.
          </p>
        </div>
      </section>

      {/* Ancrage scientifique RISS */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-800 mb-2 border-b pb-2">Ancrage scientifique</h2>
        <p className="text-xs text-gray-500 mb-4">
          Toutes les références ci-dessous ont été vérifiées dans le corpus RISS (522 627 articles scientifiques francophones).
        </p>
        <div className="space-y-4">
          {RISS_REFS.map((ref) => (
            <div key={ref.id} className="bg-white border-l-4 border-blue-500 rounded-r-xl p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-gray-800">{ref.citation}</p>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                  RISS : {ref.riss}
                </span>
              </div>
              <p className="text-sm text-gray-700 italic">{ref.content}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 mt-8 pb-4">
        Mathipulatifs PLAI · Pôle Liégeois d'Accompagnement vers une École Inclusive · FWB
      </div>
    </div>
  )
}
