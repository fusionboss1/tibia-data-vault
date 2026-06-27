import { useState, useMemo, useCallback } from 'react'
import { Target, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const EVENTS = [
  { label: 'No event', multiplier: 1 },
  { label: 'Bewitched (×1.5)', multiplier: 1.5 },
  { label: 'Double XP (×2)', multiplier: 2.0 },
  { label: 'Bewitched + Double XP (×3)', multiplier: 3.0 },
]

const STAMINA = [
  { label: 'Green stamina (×1.5)', multiplier: 1.5, boostBonus: 0.75 },
  { label: 'Orange stamina (×1)', multiplier: 1.0, boostBonus: 0.50 },
]

const TIERS = [
  { label: 'Bronze', value: 1 },
  { label: 'Silver', value: 2 },
  { label: 'Gold',   value: 4 },
]


function taskXp(kills, tierMult) {
  return (562_500 + (kills - 300) * 1_875) * tierMult
}

function TaskSlot({ index, multiplier, metaRaw, onResultChange, verdict }) {
  const [creature, setCreature]       = useState('')
  const [rawXph, setRawXph]           = useState('')
  const [killsPerH, setKillsPerH]     = useState('')
  const [kills, setKills]             = useState(300)
  const [tier, setTier]               = useState(1)

  const result = useMemo(() => {
    const raw  = parseFloat(rawXph)
    const kph  = parseFloat(killsPerH)
    const k    = parseInt(kills)
    if (!raw || !kph || !k || raw <= 0 || kph <= 0 || k < 300 || k > 600) return null

    const metaEff   = metaRaw * multiplier
    const spotEff   = raw * 1_000_000 * multiplier
    const T         = k / kph
    const gapTotal  = (metaEff - spotEff) * T
    const reward    = taskXp(k, tier)
    const delta     = reward - gapTotal
    const spotTotal = spotEff * T + reward
    const metaTotal = metaEff * T
    const effPerHour = spotTotal / T  // XP/h including task bonus — fair cross-option comparison

    return { gapTotal, reward, delta, spotTotal, metaTotal, T, effPerHour }
  }, [rawXph, killsPerH, kills, tier, multiplier, metaRaw])

  useMemo(() => { onResultChange(index, result) }, [result])

  return (
    <div className={`rounded-xl border p-5 transition-colors ${
      verdict === 'take'
        ? 'bg-emerald-900/20 border-emerald-600'
        : verdict === 'skip'
        ? 'bg-red-900/20 border-red-700'
        : 'bg-gray-800 border-gray-700'
    }`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
          {index + 1}
        </div>
        <span className="text-sm font-medium text-gray-300">Option {index + 1}</span>
        {verdict === 'take' && (
          <span className="ml-auto flex items-center gap-1 text-emerald-400 font-bold text-sm">
            <TrendingUp className="w-4 h-4" /> TAKE IT
          </span>
        )}
        {verdict === 'skip' && (
          <span className="ml-auto flex items-center gap-1 text-red-400 font-bold text-sm">
            <TrendingDown className="w-4 h-4" /> SKIP
          </span>
        )}
        {!verdict && (
          <span className="ml-auto flex items-center gap-1 text-gray-500 text-sm">
            <Minus className="w-4 h-4" /> —
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Creature name <span className="text-gray-500">(optional, for your reference)</span></label>
          <input
            type="text"
            value={creature}
            onChange={e => setCreature(e.target.value)}
            placeholder="e.g. Frazzlemaw"
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Spot XP/h <span className="text-gray-500">(kk = millions)</span></label>
          <input
            type="number"
            value={rawXph}
            onChange={e => setRawXph(e.target.value)}
            placeholder="e.g. 7.2 for 7.2kk"
            step="0.1"
            min="0"
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Kill rate <span className="text-gray-500">(kills/hour)</span></label>
          <input
            type="number"
            value={killsPerH}
            onChange={e => setKillsPerH(e.target.value)}
            placeholder="how many kills/h at this spot"
            min="1"
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Kills required <span className="text-gray-500">(from the task)</span></label>
          <input
            type="number"
            value={kills}
            onChange={e => setKills(e.target.value)}
            min="300"
            max="600"
            step="1"
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Tier <span className="text-gray-500">(color shown in-game)</span></label>
          <div className="flex gap-1">
            {TIERS.map(t => (
              <button
                key={t.value}
                onClick={() => setTier(t.value)}
                className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${
                  tier === t.value
                    ? t.label === 'Bronze' ? 'bg-amber-700 text-white border border-amber-600'
                      : t.label === 'Silver' ? 'bg-slate-400 text-gray-900 border border-slate-300'
                      : 'bg-yellow-500 text-gray-900 border border-yellow-400'
                    : 'bg-gray-700 text-gray-400 border border-gray-600 hover:bg-gray-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500 px-0.5">
            <span>0.56 – 1.13 kk XP</span>
            <span>1.13 – 2.25 kk XP</span>
            <span>2.25 – 4.50 kk XP</span>
          </div>
        </div>
      </div>

      {result && (
        <div className="mt-3 pt-3 border-t border-gray-700 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Eff. XP/h with task</span>
            <span className="text-white font-medium">{(result.effPerHour / 1e6).toFixed(2)} kk/h</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Task duration</span>
            <span className="text-white font-medium">{(result.T * 60).toFixed(0)} min</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Net vs benchmark</span>
            <span className={`font-medium ${result.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {result.delta >= 0 ? '+' : ''}{(result.delta / 1e6).toFixed(2)} kk
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function BountyCalculator() {
  const [eventIdx, setEventIdx] = useState(0)
  const [staminaIdx, setStaminaIdx] = useState(0)
  const [boost, setBoost] = useState(false)
  const multiplier = EVENTS[eventIdx].multiplier * STAMINA[staminaIdx].multiplier + (boost ? STAMINA[staminaIdx].boostBonus : 0)
  const [metaInput, setMetaInput] = useState('7.2')
  const metaRaw = (parseFloat(metaInput) || 7.2) * 1_000_000
  const [results, setResults] = useState([null, null, null])

  const handleResultChange = useCallback((index, result) => {
    setResults(prev => {
      const next = [...prev]
      next[index] = result
      return next
    })
  }, [])

  const verdicts = useMemo(() => {
    const filled = results.map((r, i) => r ? i : -1).filter(i => i >= 0)
    if (filled.length === 0) return [null, null, null]

    const metaEffPerHour = metaRaw * multiplier
    const bestIdx = filled.reduce((best, i) =>
      results[i].effPerHour > results[best].effPerHour ? i : best, filled[0])
    const bestBeatsMeta = results[bestIdx].effPerHour > metaEffPerHour

    return results.map((r, i) => {
      if (!r) return null
      if (!bestBeatsMeta) return 'skip'
      return i === bestIdx ? 'take' : 'skip'
    })
  }, [results, metaRaw, multiplier])

  return (
    <div className="p-4 md:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <Target className="w-7 h-7 md:w-9 md:h-9 text-amber-400" />
          Bounty Calculator
        </h1>
        <p className="text-sm text-gray-400">
          Fill any card to get an instant verdict. Fill multiple to compare — the best one wins.
        </p>
      </div>

      <div className="mb-6 p-4 bg-gray-800 border border-gray-700 rounded-xl">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <span className="text-sm text-gray-300 font-medium">Event:</span>
          <div className="flex flex-wrap gap-2">
            {EVENTS.map((e, i) => (
              <button
                key={i}
                onClick={() => setEventIdx(i)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  eventIdx === i
                    ? 'bg-blue-600 text-white border border-blue-500'
                    : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-gray-300 font-medium">Stamina:</span>
          <div className="flex flex-wrap gap-2">
            {STAMINA.map((s, i) => (
              <button
                key={i}
                onClick={() => setStaminaIdx(i)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  staminaIdx === i
                    ? 'bg-emerald-700 text-white border border-emerald-600'
                    : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap mt-2">
          <span className="text-sm text-gray-300 font-medium">Boost XP:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setBoost(true)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                boost
                  ? 'bg-purple-700 text-white border border-purple-600'
                  : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
              }`}
            >
              Active (+{STAMINA[staminaIdx].boostBonus})
            </button>
            <button
              onClick={() => setBoost(false)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                !boost
                  ? 'bg-purple-700 text-white border border-purple-600'
                  : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
              }`}
            >
              Inactive
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-gray-400">Active XP multiplier:</span>
          <span className="px-4 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold text-lg tracking-wide">
            {(multiplier * 100).toFixed(0)}%
          </span>
        </div>

        <div className="mt-3 flex items-center gap-3 flex-wrap text-xs text-gray-400">
          <span className="shrink-0">Benchmark raw XP/h:</span>
          <input
            type="number"
            value={metaInput}
            onChange={e => setMetaInput(e.target.value)}
            step="0.1"
            min="0"
            className="w-24 bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
          />
          <span className="text-gray-500">kk/h</span>
          <span>→ effective XP rate after multipliers: <span className="text-amber-400 font-bold">{(metaRaw * multiplier / 1e6).toFixed(2)}kk XP/h</span></span>
        </div>
      </div>

      <p className="mb-3 text-sm text-gray-400">
        Fill in the task options the game is offering you below.
        Each card tells you instantly if that option is worth taking — <span className="text-emerald-400 font-medium">TAKE IT</span> means it beats your benchmark, <span className="text-red-400 font-medium">SKIP</span> means go back to meta or reroll.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <TaskSlot key={i} index={i} multiplier={multiplier} metaRaw={metaRaw} onResultChange={handleResultChange} verdict={verdicts[i]} />
        ))}
      </div>
    </div>
  )
}

export default BountyCalculator
