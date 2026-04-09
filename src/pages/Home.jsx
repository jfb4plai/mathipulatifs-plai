import { Link, useNavigate } from 'react-router-dom'
import { useAccessibility } from '../contexts/AccessibilityContext.jsx'

const manipulatives = [
  {
    id: 'base10',
    emoji: '🟦',
    titre: 'Blocs de base 10',
    description: 'Comprendre la valeur positionnelle des nombres. Manipule des unités, dizaines et centaines pour composer et décomposer des nombres.',
    couleur: 'blue',
    demoToken: 'demo-base10',
  },
  {
    id: 'droite-numerique',
    emoji: '📏',
    titre: 'Droite numérique',
    description: 'Situer et comparer des nombres sur une droite graduée. Glisse le jeton pour trouver la bonne position.',
    couleur: 'green',
    demoToken: 'demo-droite-numerique',
  },
  {
    id: 'fractions',
    emoji: '🍕',
    titre: 'Barres de fractions',
    description: 'Visualiser et comparer des fractions. Colorie les parties pour découvrir les équivalences entre fractions.',
    couleur: 'purple',
    demoToken: 'demo-fractions',
  },
]

const colorMap = {
  blue: {
    card: 'border-blue-200 hover:border-blue-400',
    badge: 'bg-blue-100 text-blue-700',
    btn: 'bg-blue-500 hover:bg-blue-600 text-white',
  },
  green: {
    card: 'border-green-200 hover:border-green-400',
    badge: 'bg-green-100 text-green-700',
    btn: 'bg-green-500 hover:bg-green-600 text-white',
  },
  purple: {
    card: 'border-purple-200 hover:border-purple-400',
    badge: 'bg-purple-100 text-purple-700',
    btn: 'bg-purple-500 hover:bg-purple-600 text-white',
  },
}

export default function Home() {
  const { dyslexicFont, largeText, focusMode, speak, ttsEnabled } = useAccessibility()
  const navigate = useNavigate()

  const fontClass = dyslexicFont ? 'font-dyslexic' : ''
  const textClass = largeText ? 'text-xl' : 'text-base'

  return (
    <div className={`${fontClass} ${textClass} min-h-screen`}>
      {/* Hero Header */}
      <header className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-6xl mb-4" aria-hidden="true">🧮</div>
          <h1 className="text-4xl font-bold mb-3">Mathipulatifs PLAI</h1>
          <p className={`text-blue-100 max-w-2xl mx-auto ${largeText ? 'text-2xl' : 'text-xl'}`}>
            Manipulables mathématiques interactifs pour la classe inclusive
          </p>
          {!focusMode && (
            <p className="text-blue-200 mt-2 text-sm">
              Conçu pour les enseignant·e·s de la Fédération Wallonie-Bruxelles
            </p>
          )}
        </div>
      </header>

      {/* Manipulatives cards */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          Choisissez un manipulable
        </h2>
        {!focusMode && (
          <p className="text-gray-500 text-center mb-8">
            Explorez librement ou créez des exercices pour vos élèves
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {manipulatives.map((m) => {
            const c = colorMap[m.couleur]
            return (
              <div
                key={m.id}
                className={`bg-white rounded-2xl border-2 ${c.card} p-6 shadow-sm hover:shadow-md transition-all flex flex-col`}
              >
                <div className="text-4xl mb-3" aria-hidden="true">{m.emoji}</div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{m.titre}</h3>
                {!focusMode && (
                  <p className="text-gray-600 text-sm flex-1 mb-4">{m.description}</p>
                )}
                <button
                  onClick={() => {
                    if (ttsEnabled) speak(`Essayer ${m.titre}`)
                    navigate(`/exercice/${m.demoToken}`)
                  }}
                  className={`w-full py-3 rounded-xl font-bold transition-colors min-h-[44px] ${c.btn}`}
                >
                  Essayer
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* Teacher CTA */}
      <section className={`py-12 px-4 ${focusMode ? '' : 'bg-gray-50'}`}>
        <div className="max-w-2xl mx-auto text-center bg-white rounded-2xl border border-blue-200 p-8 shadow-sm">
          <div className="text-3xl mb-3" aria-hidden="true">👩‍🏫</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Vous êtes enseignant·e ?
          </h2>
          {!focusMode && (
            <p className="text-gray-600 mb-6 text-sm">
              Créez des exercices personnalisés avec vos consignes, partagez un lien unique à vos élèves, et consultez leurs résultats.
            </p>
          )}
          <Link
            to="/connexion"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl transition-colors min-h-[44px]"
          >
            Accéder à l'espace enseignant
          </Link>
        </div>
      </section>

      {/* Footer */}
      {!focusMode && (
        <footer className="py-8 px-4 text-center text-xs text-gray-400 border-t border-gray-100">
          <p className="mb-1">
            <strong>Mathipulatifs PLAI</strong> — Pôle Liégeois d'Accompagnement vers une École Inclusive
          </p>
          <p className="mb-1">
            Fédération Wallonie-Bruxelles · Outil de différenciation pour élèves en difficulté
          </p>
          <p className="mb-2">
            Ancrage scientifique : Jolivel (2023, corpus RISS) · Najjar (2015, corpus RISS)
          </p>
          <Link to="/guide" className="text-blue-500 hover:underline font-medium">
            📖 Mode d'emploi &amp; références scientifiques complètes
          </Link>
        </footer>
      )}
    </div>
  )
}
