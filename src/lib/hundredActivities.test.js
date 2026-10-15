import test from 'node:test'
import assert from 'node:assert/strict'
import { runSequence, validateGapSetup, checkGap, expectedGap, gridBounds } from './hundredActivities.js'

test('bornes selon le départ de la grille', () => {
  assert.deepEqual(gridBounds(1), { min: 1, max: 100 })
  assert.deepEqual(gridBounds(0), { min: 0, max: 99 })
  assert.deepEqual(gridBounds('0'), { min: 0, max: 99 })
})

test('séquence : 34 +10 -3 +1 = 42', () => {
  const r = runSequence(34, [{ sign: '+', value: 10 }, { sign: '-', value: 3 }, { sign: '+', value: 1 }])
  assert.equal(r.ok, true)
  assert.equal(r.end, 42)
  assert.deepEqual(r.path, [34, 44, 41, 42])
})

test('séquence : sortie de grille refusée, même en étape intermédiaire', () => {
  assert.equal(runSequence(95, [{ sign: '+', value: 10 }, { sign: '-', value: 10 }]).ok, false)
  assert.equal(runSequence(5, [{ sign: '-', value: 5 }]).ok, false) // 0 interdit si grille 1-100
  assert.equal(runSequence(5, [{ sign: '-', value: 5 }], 0).end, 0) // 0 permis si grille 0-99
  assert.equal(runSequence(99, [{ sign: '+', value: 1 }], 0).ok, false) // 100 interdit si grille 0-99
})

test('séquence : entrées invalides', () => {
  assert.equal(runSequence(34, []).ok, false)
  assert.equal(runSequence(34, [{ sign: '+', value: 0 }]).ok, false)
  assert.equal(runSequence(34, [{ sign: '+', value: 2.5 }]).ok, false)
  assert.equal(runSequence(NaN, [{ sign: '+', value: 1 }]).ok, false)
  assert.equal(runSequence(101, [{ sign: '+', value: 1 }]).ok, false)
})

test('écart : réglage', () => {
  assert.equal(validateGapSetup(34, 61).ok, true)
  assert.equal(validateGapSetup(34, 34).ok, false)
  assert.equal(validateGapSetup(34, 101).ok, false)
  assert.equal(validateGapSetup(0, 50).ok, false) // 0 hors grille 1-100
  assert.equal(validateGapSetup(0, 50, 0).ok, true)
})

test('écart : réponse', () => {
  assert.deepEqual(expectedGap(34, 61), { sign: '+', value: 27 })
  assert.deepEqual(expectedGap(61, 34), { sign: '-', value: 27 })
  assert.equal(checkGap(34, 61, { sign: '+', value: 27 }).correct, true)
  assert.equal(checkGap(61, 34, { sign: '-', value: 27 }).correct, true)
  assert.equal(checkGap(34, 61, { sign: '-', value: 27 }).problem, 'signe')
  assert.equal(checkGap(34, 61, { sign: '+', value: 26 }).problem, 'valeur')
  assert.equal(checkGap(34, 61, { sign: null, value: 27 }).problem, 'choix')
  assert.equal(checkGap(34, 61, { sign: '+', value: null }).problem, 'valeur-absente')
  // signe ET valeur faux : le signe est signalé en premier
  assert.equal(checkGap(34, 61, { sign: '-', value: 5 }).problem, 'signe')
})
