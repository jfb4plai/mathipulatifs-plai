import test from 'node:test'
import assert from 'node:assert/strict'
import { addMinutes, subMinutes, formatDuration, generateTimeProblem, buildOptions, generateSchedule, scheduleEnds, toMinutes } from './clockProblems.js'

test('addition de minutes avec passage de l\'heure et de minuit', () => {
  assert.deepEqual(addMinutes({ h: 10, m: 15 }, 50), { h: 11, m: 5 })
  assert.deepEqual(addMinutes({ h: 23, m: 30 }, 45), { h: 0, m: 15 })
  assert.deepEqual(subMinutes({ h: 0, m: 10 }, 20), { h: 23, m: 50 })
})

test('formatage des durées', () => {
  assert.equal(formatDuration(50), '50 min')
  assert.equal(formatDuration(60), '1 h')
  assert.equal(formatDuration(75), '1 h 15 min')
})

test('P4 : la durée reste dans la même heure', () => {
  for (let i = 0; i < 300; i++) {
    const { startTime, duration } = generateTimeProblem({ kind: 'cinq-min', level: 'meme-heure', bounds: { min: 0, max: 23 } })
    assert.ok(startTime.m + duration <= 60, `${startTime.m}+${duration}`)
  }
})

test('P5 : durée <= 60 ; P6 : peut dépasser 60', () => {
  let over = false
  for (let i = 0; i < 400; i++) {
    assert.ok(generateTimeProblem({ kind: 'cinq-min', level: 'une-heure' }).duration <= 60)
    if (generateTimeProblem({ kind: 'cinq-min', level: 'plus-heure' }).duration > 60) over = true
  }
  assert.ok(over)
})

test('durée fixe (50 min) respectée, même en « même heure »', () => {
  for (let i = 0; i < 100; i++) {
    const p = generateTimeProblem({ kind: 'cinq-min', level: 'meme-heure', fixedDuration: 50 })
    assert.equal(p.duration, 50)
    assert.ok(p.startTime.m <= 10)
  }
})

test('options : 4 distinctes, la bonne présente, bornes respectées', () => {
  for (const [sens, bounds] of [['a2d', { min: 12, max: 23 }], ['d2a', { min: 0, max: 23 }], ['a2d', { min: 0, max: 11 }], ['d2a', { min: 1, max: 12 }]]) {
    for (let i = 0; i < 200; i++) {
      const target = { h: bounds.min + (i % (bounds.max - bounds.min + 1)), m: [0, 15, 30, 45, 5, 50][i % 6] }
      const opts = buildOptions(target, { sens, bounds })
      assert.equal(opts.length, 4)
      assert.equal(new Set(opts.map((o) => `${o.h}:${o.m}`)).size, 4)
      assert.ok(opts.some((o) => o.h === target.h && o.m === target.m))
      assert.ok(opts.every((o) => o.h >= bounds.min && o.h <= bounds.max))
      if (sens === 'd2a') assert.equal(new Set(opts.map((o) => `${o.h % 12}:${o.m}`)).size, 4)
    }
  }
})

test('horaire : fins enchaînées', () => {
  const s = generateSchedule({ kind: 'quart' })
  assert.equal(s.activities.length, 4)
  const ends = scheduleEnds(s.startTime, s.activities)
  const total = s.activities.reduce((n, a) => n + a.duration, 0)
  assert.equal(toMinutes(ends[3]), toMinutes(s.startTime) + total)
})
