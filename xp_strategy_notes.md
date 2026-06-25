# XP Strategy Notes

## Goal
Build a tool to determine optimal hunting spots during XP boost events,
factoring in Bounty Tasks as a secondary (tiebreaker) consideration.

---

## Bounty Task System

- You get 3 random creature options to choose from per task.
- Each task requires killing between **300 and 600** of the chosen creature.
- Tasks have **3 tiers**: Bronze, Silver, Gold.

### XP Reward Formula (Bronze)
- Base reward at 300 kills: **562,500 XP**
- Each kill beyond 300 adds: **+1,875 XP**
- Formula: `562,500 + (kills - 300) × 1,875`

### Tier Multipliers
| Tier   | Multiplier | Min XP (300 kills) | Max XP (600 kills) |
|--------|------------|--------------------|--------------------|
| Bronze | ×1         | 562,500            | 1,125,000          |
| Silver | ×2         | 1,125,000          | 2,250,000          |
| Gold   | ×4         | 2,250,000          | 4,500,000          |

### Key Rule
> **Bounty Task XP is NOT affected by the XP gain multiplier.**
> The higher the active XP multiplier, the less relevant Bounty Tasks become
> relative to kill XP — but they are never zero value.

### Design Principle
> Tasks should act as a **tiebreaker** when two hunting spots are otherwise equal,
> not as the primary driver of spot selection during XP events.

---

## Character & Playstyle

- Plays **premium stamina hours only** (first 3h/day at ×1.5 base), unless exceptional circumstances.
- So only these multiplier rows apply: **×2.25** (June 25–July 2), **×4.5** (July 3–4), **×3.0** (July 5).
- Hunts **bounty-driven**: session ends when the task is complete, then picks the next task.

---

## Bounty Task Mechanics

- 3 random creature options per roll (from Hard + Challenging bestiary pool).
- Random kills (300–600), random tier (Bronze / Silver / Gold — Silver and Gold are rarer).
- Completing a task grants **1 reroll**. Using a reroll costs **1 reroll**.
- Reroll cap: **10**. You earn **1 free reroll per day**.
- **Preferred List**: 5 slots. Creatures on the list have **5× higher roll chance** than non-listed creatures.

> Strategy goal: fill the Preferred List with creatures whose spots have the highest raw XP/h,
> so that any task roll is likely to land on a top-tier hunting spot.

---

## Hunting Spots

All XP values are **raw hourly rates** (before multiplier). Kill counts are hourly estimates of the most-killed creature at that spot.

> ★ = current meta/benchmark spot (personally measured session)
> Spots sharing a location name are the same place — different creatures listed for Bounty Task matching.

| Spot | Raw XP/h | Main Creature | Kills/h | Bestiary Tier |
| --- | --- | --- | --- | --- |
| Flimsy Lost Souls Venore | 7,000,000 | Flimsy Lost Soul | 1000 | Hard |
| Iksupan Last Stand | 5,000,000 | Iks Yapunac | 950 | Hard |
| Warzone 6 | 4,500,000 | Diremaw | 900 | Hard |
| Book Chapter IV | 4,500,000 | Crusader | 900 | Hard |
| Bounacean Lion | 6,800,000 | Crypt Warrior | 900 | Hard |
| Iksupan Occupied Sanctuary | 5,500,000 | Mitmah Seer | 900 | ? (not found in wiki) |
| Book Chapter IV | 4,500,000 | Headwalker | 850 | Hard |
| Warzone 5 | 4,500,000 | Tunnel Tyrant | 800 | Hard |
| Roshamuul West ★ | 7,200,000 | Frazzlemaw | 600 | Hard |
| Deathlings | 5,000,000 | Deathling Scout | 550 | Hard |
| Nimersatt Dragons | 5,250,000 | Dragolisk | 550 | Hard |
| Upper Roshamuul | 6,800,000 | Retching Horror | 550 | Hard |
| Falcon's Eagle | 6,000,000 | Falcon Knight | 500 | Hard |
| Upper Roshamuul | 6,800,000 | Choking Fear | 500 | Hard |
| Naga's Temple | 5,250,000 | Naga Warrior | 450 | ? (not found in wiki) |
| Flimsy Lost Souls Venore | 7,000,000 | Mean Lost Soul | 450 | ? (not found in wiki) |
| Buried Cathedral -8 | 6,500,000 | Burster Spectre | 400 | Hard |
| Buried Cathedral -8 | 6,500,000 | Arachnophobica | 400 | Hard |
| Azzilon Castle | 6,000,000 | Broodrider Inferniarch | 400 | Hard |

---

## Threshold Analysis

> For each spot, what is the **minimum Bounty Task** (tier + kills) needed to make that spot competitive with Roshamuul West (meta benchmark)?
> "ALWAYS WORTH" = spot beats meta on raw XP alone. "SKIP" = no task can cover the gap. "CONDITIONAL" = shows minimum qualifying task.

### Jun 25 – Jul 2 | ×2.25 | Meta effective XP/h: 16.20M

| Creature | Eff XP/h | Min Task to Match Meta | Verdict |
| --- | --- | --- | --- |
| Flimsy Lost Soul | 15.75M | Bronze 300k | CONDITIONAL |
| Crypt Warrior | 15.30M | Bronze 300k | CONDITIONAL |
| Retching Horror | 15.30M | Bronze 300k | CONDITIONAL |
| Choking Fear | 15.30M | Bronze 300k | CONDITIONAL |
| Mean Lost Soul | 15.75M | Bronze 300k | CONDITIONAL |
| Burster Spectre | 14.62M | Gold 300k | CONDITIONAL |
| Arachnophobica | 14.62M | Gold 300k | CONDITIONAL |
| Falcon Knight | 13.50M | Gold 300k | CONDITIONAL |
| Broodrider Inferniarch | 13.50M | Gold 300k | CONDITIONAL |
| Mitmah Seer | 12.38M | Gold 300k | CONDITIONAL |
| Iks Yapunac | 11.25M | Gold 300k | CONDITIONAL |
| Diremaw | 10.12M | Gold 300k | CONDITIONAL |
| Crusader | 10.12M | Gold 300k | CONDITIONAL |
| Headwalker | 10.12M | Gold 300k | CONDITIONAL |
| Tunnel Tyrant | 10.12M | No task covers gap | SKIP |
| Deathling Scout | 11.25M | No task covers gap | SKIP |
| Dragolisk | 11.81M | No task covers gap | SKIP |
| Naga Warrior | 11.81M | No task covers gap | SKIP |

### Jul 3–4 | ×4.5 | Meta effective XP/h: 32.40M

| Creature | Eff XP/h | Min Task to Match Meta | Verdict |
| --- | --- | --- | --- |
| Flimsy Lost Soul | 31.50M | Bronze 300k | CONDITIONAL |
| Mean Lost Soul | 31.50M | Silver 300k | CONDITIONAL |
| Crypt Warrior | 30.60M | Silver 300k | CONDITIONAL |
| Retching Horror | 30.60M | Silver 300k | CONDITIONAL |
| Choking Fear | 30.60M | Silver 300k | CONDITIONAL |
| Burster Spectre | 29.25M | No task covers gap | SKIP |
| Arachnophobica | 29.25M | No task covers gap | SKIP |
| Falcon Knight | 27.00M | No task covers gap | SKIP |
| Broodrider Inferniarch | 27.00M | No task covers gap | SKIP |
| Mitmah Seer | 24.75M | No task covers gap | SKIP |
| Dragolisk | 23.62M | No task covers gap | SKIP |
| Naga Warrior | 23.62M | No task covers gap | SKIP |
| Deathling Scout | 22.50M | No task covers gap | SKIP |
| Iks Yapunac | 22.50M | No task covers gap | SKIP |
| Diremaw | 20.25M | No task covers gap | SKIP |
| Crusader | 20.25M | No task covers gap | SKIP |
| Headwalker | 20.25M | No task covers gap | SKIP |
| Tunnel Tyrant | 20.25M | No task covers gap | SKIP |

### Jul 5 | ×3.0 | Meta effective XP/h: 21.60M

| Creature | Eff XP/h | Min Task to Match Meta | Verdict |
| --- | --- | --- | --- |
| Flimsy Lost Soul | 21.00M | Bronze 300k | CONDITIONAL |
| Mean Lost Soul | 21.00M | Bronze 300k | CONDITIONAL |
| Crypt Warrior | 20.40M | Bronze 300k | CONDITIONAL |
| Retching Horror | 20.40M | Silver 300k | CONDITIONAL |
| Choking Fear | 20.40M | Silver 300k | CONDITIONAL |
| Burster Spectre | 19.50M | Gold 300k | CONDITIONAL |
| Arachnophobica | 19.50M | Gold 300k | CONDITIONAL |
| Falcon Knight | 18.00M | Gold 300k | CONDITIONAL |
| Broodrider Inferniarch | 18.00M | No task covers gap | SKIP |
| Mitmah Seer | 16.50M | Gold 300k | CONDITIONAL |
| Iks Yapunac | 15.00M | Gold 300k | CONDITIONAL |
| Dragolisk | 15.75M | No task covers gap | SKIP |
| Naga Warrior | 15.75M | No task covers gap | SKIP |
| Deathling Scout | 15.00M | No task covers gap | SKIP |
| Diremaw | 13.50M | No task covers gap | SKIP |
| Crusader | 13.50M | No task covers gap | SKIP |
| Headwalker | 13.50M | No task covers gap | SKIP |
| Tunnel Tyrant | 13.50M | No task covers gap | SKIP |

---

## Events & Multipliers

### Base Stamina Rules (no events)
- First 3 hours/day = **150% XP** (×1.5) — "premium stamina"
- After 3 hours = **100% XP** (×1.0) — "normal stamina"

### Active Events
| Event | Dates | Effect |
|---|---|---|
| +50% XP from all creatures | June 25 – July 4 (10 days) | Adds to base, then multiplied by everything else |
| Double XP | July 3 – July 5 (3 days) | ×2 on top of everything |

> The +50% event raises the base from 100% → 150% before stamina applies.
> The Double XP event then doubles the full result.

### Resulting Multipliers by Period

| Period | Stamina | Multiplier |
|---|---|---|
| June 25 – July 2 | Premium (first 3h) | ×2.25 |
| June 25 – July 2 | Normal | ×1.5 |
| July 3–4 (both events) | Premium (first 3h) | ×4.5 |
| July 3–4 (both events) | Normal | ×3.0 |
| July 5 (Double XP only) | Premium (first 3h) | ×3.0 |
| July 5 (Double XP only) | Normal | ×2.0 |
