import { useState, useMemo, useCallback } from 'react'
import { Target, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const PERIODS = [
  { label: 'Jun 25 – Jul 2  (×2.25)', multiplier: 2.25 },
  { label: 'Jul 3–4  (×4.5 — peak)', multiplier: 4.5 },
  { label: 'Jul 5  (×3.0)', multiplier: 3.0 },
  { label: 'No event  (×1.5)', multiplier: 1.5 },
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
          <label className="block text-xs text-gray-400 mb-1">Creature name</label>
          <input
            type="text"
            value={creature}
            onChange={e => setCreature(e.target.value)}
            placeholder="e.g. Frazzlemaw"
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Spot raw XP/h (millions)</label>
          <input
            type="number"
            value={rawXph}
            onChange={e => setRawXph(e.target.value)}
            placeholder="e.g. 7.2"
            step="0.1"
            min="0"
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Kill rate (per hour)</label>
          <input
            type="number"
            value={killsPerH}
            onChange={e => setKillsPerH(e.target.value)}
            placeholder="e.g. 600"
            min="1"
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Kills required</label>
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

        <div>
          <label className="block text-xs text-gray-400 mb-1">Tier</label>
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
        </div>
      </div>

      {result && (
        <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-2 gap-2 text-xs text-gray-400">
          <div>Task time: <span className="text-white">{(result.T * 60).toFixed(0)} min</span></div>
          <div>Task XP reward: <span className="text-white">{(result.reward / 1e6).toFixed(3)}M</span></div>
          <div>Gap to cover: <span className="text-white">{(result.gapTotal / 1e6).toFixed(3)}M</span></div>
          <div>
            Net vs meta:{' '}
            <span className={result.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {result.delta >= 0 ? '+' : ''}{(result.delta / 1e6).toFixed(3)}M
            </span>
          </div>
          <div>Eff XP/h (with task): <span className="text-white">{(result.effPerHour / 1e6).toFixed(2)}M/h</span></div>
          <div>Meta XP/h: <span className="text-white">{(result.metaTotal / result.T / 1e6).toFixed(2)}M/h</span></div>
        </div>
      )}
    </div>
  )
}

function BountyCalculator() {
  const [periodIdx, setPeriodIdx] = useState(0)
  const multiplier = PERIODS[periodIdx].multiplier
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
    const allReady = results.every(r => r !== null)
    if (!allReady) return [null, null, null]

    const metaEffPerHour = metaRaw * multiplier
    const bestIdx = results.reduce((best, r, i) =>
      r.effPerHour > results[best].effPerHour ? i : best, 0)
    const bestBeatsMeta = results[bestIdx].effPerHour > metaEffPerHour

    return results.map((_, i) => {
      if (!bestBeatsMeta) return 'skip'
      return i === bestIdx ? 'take' : 'skip'
    })
  }, [results])

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <Target className="w-9 h-9 text-amber-400" />
          Bounty Calculator
        </h1>
        <p className="text-gray-400">
          Fill all 3 options, then the best one will be highlighted. Only one can be taken.
        </p>
      </div>

      <div className="mb-6 p-4 bg-gray-800 border border-gray-700 rounded-xl">
        <div className="flex items-center gap-3 flex-wrap">
          <RefreshCw className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-sm text-gray-300 font-medium">Active XP period:</span>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p, i) => (
              <button
                key={i}
                onClick={() => setPeriodIdx(i)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  periodIdx === i
                    ? 'bg-blue-600 text-white border border-blue-500'
                    : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
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
          <span className="text-gray-500">M/h</span>
          <span>→ effective: <span className="text-amber-400 font-bold">{(metaRaw * multiplier / 1e6).toFixed(2)}M XP/h</span></span>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <TaskSlot key={i} index={i} multiplier={multiplier} metaRaw={metaRaw} onResultChange={handleResultChange} verdict={verdicts[i]} />
          ))}
        </div>

        <div className="w-64 shrink-0 bg-gray-800 border border-gray-700 rounded-xl p-5 text-sm text-gray-300">
          <p className="font-bold text-white mb-4 text-base">How to use</p>
          <ol className="space-y-3 text-xs text-gray-400 list-none">
            <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center shrink-0">1</span><span>Pick the <span className="text-white font-medium">XP period</span> that matches today's event.</span></li>
            <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center shrink-0">2</span><span>Set your <span className="text-white font-medium">benchmark</span> — the raw XP/h of your best meta spot.</span></li>
            <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center shrink-0">3</span><span>Fill in all <span className="text-white font-medium">3 task options</span> from your current reroll: spot XP/h, kill rate, kills required, and tier.</span></li>
            <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center shrink-0">4</span><span>The tool picks the option with the <span className="text-white font-medium">highest effective XP/h</span> (spot rate + task bonus spread over session time).</span></li>
            <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center shrink-0">✓</span><span><span className="text-emerald-400 font-medium">TAKE IT</span> = that option beats your benchmark. <span className="text-red-400 font-medium">SKIP</span> = go back to meta / reroll.</span></li>
          </ol>
          <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500">
            <p className="mb-1 text-gray-400 font-medium">Tier XP rewards</p>
            <div className="space-y-1">
              <div className="flex justify-between"><span className="text-amber-700 font-medium">Bronze ×1</span><span>0.56M – 1.13M</span></div>
              <div className="flex justify-between"><span className="text-slate-400 font-medium">Silver ×2</span><span>1.13M – 2.25M</span></div>
              <div className="flex justify-between"><span className="text-yellow-400 font-medium">Gold ×4</span><span>2.25M – 4.50M</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BountyCalculator
