spots = [
    ('Flimsy Lost Souls Venore', 7_000_000, 'Flimsy Lost Soul',       1000),
    ('Iksupan Last Stand',       5_000_000, 'Iks Yapunac',             950),
    ('Warzone 6',                4_500_000, 'Diremaw',                 900),
    ('Book Chapter IV',          4_500_000, 'Crusader',                900),
    ('Bounacean Lion',           6_800_000, 'Crypt Warrior',           900),
    ('Iksupan Occ. Sanctuary',   5_500_000, 'Mitmah Seer',             900),
    ('Book Chapter IV',          4_500_000, 'Headwalker',              850),
    ('Warzone 5',                4_500_000, 'Tunnel Tyrant',           800),
    ('Roshamuul West',           7_200_000, 'Frazzlemaw',              600),
    ('Deathlings',               5_000_000, 'Deathling Scout',         550),
    ('Nimersatt Dragons',        5_250_000, 'Dragolisk',               550),
    ('Upper Roshamuul',          6_800_000, 'Retching Horror',         550),
    ('Falcons Eagle',            6_000_000, 'Falcon Knight',           500),
    ('Upper Roshamuul',          6_800_000, 'Choking Fear',            500),
    ('Nagas Temple',             5_250_000, 'Naga Warrior',            450),
    ('Flimsy Lost Souls Venore', 7_000_000, 'Mean Lost Soul',          450),
    ('Buried Cathedral -8',      6_500_000, 'Burster Spectre',         400),
    ('Buried Cathedral -8',      6_500_000, 'Arachnophobica',          400),
    ('Azzilon Castle',           6_000_000, 'Broodrider Inferniarch',  400),
]

META_RAW = 7_200_000

def task_xp(kills, tier_mult):
    return (562_500 + (kills - 300) * 1_875) * tier_mult

tiers = [('Bronze', 1), ('Silver', 2), ('Gold', 4)]
kill_options = [300, 400, 500, 600]

periods = [
    ('Jun25-Jul2', 2.25),
    ('Jul3-4',     4.5),
    ('Jul5',       3.0),
]

print('=' * 120)
print('BENCHMARK: Roshamuul West | 7.2M raw XP/h | Frazzlemaw 600/h')
print('=' * 120)

for period_name, mult in periods:
    meta_eff = META_RAW * mult
    print()
    print(f'### Period: {period_name} | Multiplier: x{mult} | Meta effective XP/h: {meta_eff/1e6:.2f}M')
    print(f'  {"Creature":<28} {"K/h":<6} {"Raw/h":<8} {"Eff/h":<10} {"Min task to match meta":<45} {"Verdict"}')
    print(f'  {"-"*28} {"-"*6} {"-"*8} {"-"*10} {"-"*45} {"-"*20}')

    for spot, raw_xp, creature, kills_per_h in spots:
        if creature == 'Frazzlemaw':
            continue

        spot_eff = raw_xp * mult

        if spot_eff >= meta_eff:
            verdict = 'ALWAYS WORTH'
            min_task = 'Beats meta on raw XP alone'
        else:
            xp_gap_per_hour = meta_eff - spot_eff
            found = []
            for tier_name, tier_mult in tiers:
                for kills in kill_options:
                    T = kills / kills_per_h
                    needed = xp_gap_per_hour * T
                    reward = task_xp(kills, tier_mult)
                    if reward >= needed:
                        found.append(f'{tier_name} {kills}k ({reward/1e6:.2f}M >= {needed/1e6:.2f}M gap)')
                        break
            if found:
                min_task = ' | '.join(found)
                verdict = 'CONDITIONAL'
            else:
                min_task = 'No task covers the gap'
                verdict = 'SKIP'

        raw_str = f'{raw_xp/1e6:.1f}M'
        eff_str = f'{spot_eff/1e6:.2f}M'
        print(f'  {creature:<28} {kills_per_h:<6} {raw_str:<8} {eff_str:<10} {min_task:<45} {verdict}')

print()

# --- Guzzlemaw vs Retching Horror / Choking Fear for Preferred List slot 5 ---
print('=' * 90)
print('SLOT 5 COMPARISON: Guzzlemaw (Roshamuul West) vs Retching Horror / Choking Fear (Upper Roshamuul)')
print('Metric: total XP earned during a Bronze 300-kill task vs staying at meta the whole time')
print('=' * 90)

slot5_candidates = [
    ('Guzzlemaw (250/h)',   7_200_000, 250),
    ('Guzzlemaw (320/h)',   7_200_000, 320),
    ('Retching Horror',     6_800_000, 550),
    ('Choking Fear',        6_800_000, 500),
]

for period_name, mult in periods:
    meta_eff = META_RAW * mult
    print(f'\n  Period: {period_name} | x{mult} | Meta eff/h: {meta_eff/1e6:.2f}M')
    print(f'  {"Creature":<24} {"K/h":<6} {"Eff/h":<10} {"Task time":<12} {"Total XP (Bronze 300k)":<26} {"vs Meta (same time)"}')
    print(f'  {"-"*24} {"-"*6} {"-"*10} {"-"*12} {"-"*26} {"-"*22}')
    for creature, raw_xp, kph in slot5_candidates:
        eff = raw_xp * mult
        T = 300 / kph
        total = eff * T + task_xp(300, 1)
        meta_total = meta_eff * T
        diff = total - meta_total
        diff_pct = diff / meta_total * 100
        sign = '+' if diff >= 0 else ''
        print(f'  {creature:<24} {kph:<6} {eff/1e6:<10.2f} {T*60:<12.1f} {total/1e6:<26.3f} {sign}{diff/1e6:.3f}M ({sign}{diff_pct:.1f}%)')
print()

# --- Hypothetical: what if Lost Souls, Upper Rosha, Crypt Warriors all hit 7M raw? ---
print('=' * 90)
print('HYPOTHETICAL: All top spots at 7M raw XP/h')
print('=' * 90)

hypo_candidates = [
    ('Flimsy Lost Soul',    7_000_000, 1000),
    ('Mean Lost Soul',      7_000_000,  450),
    ('Crypt Warrior',       7_000_000,  900),
    ('Retching Horror',     7_000_000,  550),
    ('Choking Fear',        7_000_000,  500),
    ('Guzzlemaw (mid)',     7_200_000,  285),
]

for period_name, mult in periods:
    meta_eff = META_RAW * mult
    print(f'\n  Period: {period_name} | x{mult} | Meta eff/h: {meta_eff/1e6:.2f}M')
    print(f'  {"Creature":<22} {"Eff/h":<10} {"Gap/h":<10} {"Min task to cover gap"}')
    print(f'  {"-"*22} {"-"*10} {"-"*10} {"-"*35}')
    for creature, raw_xp, kph in hypo_candidates:
        eff = raw_xp * mult
        gap_per_h = meta_eff - eff
        if gap_per_h <= 0:
            print(f'  {creature:<22} {eff/1e6:<10.2f} {"—":<10} ALWAYS WORTH (beats meta)')
            continue
        results = []
        for tname, tm in [('Bronze', 1), ('Silver', 2), ('Gold', 4)]:
            for k in [300, 400, 500, 600]:
                T = k / kph
                needed = gap_per_h * T
                reward = task_xp(k, tm)
                if reward >= needed:
                    results.append(f'{tname} {k}k ({reward/1e6:.2f}M >= {needed/1e6:.2f}M)')
                    break
        min_task = ' | '.join(results) if results else 'No task covers gap — SKIP'
        print(f'  {creature:<22} {eff/1e6:<10.2f} {gap_per_h/1e6:<10.2f} {min_task}')
print()
