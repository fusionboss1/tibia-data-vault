# Character World Transfer Rules

Reference for Tibia's character world transfer restrictions, relevant to the export/transfer use case.

- **Source:** <https://tibia.fandom.com/wiki/Character_World_Transfer>
- **Official manual:** <https://www.tibia.com/gameguides/?subtopic=manual&section=products>

## Cost

| Type | Price | Cooldown |
| ---- | ----- | -------- |
| Regular transfer | 750 Tibia Coins | Once per 6 months |
| Express transfer | 1500 Tibia Coins | No cooldown (can bypass 6-month limit) |

## PvP Transfer Rules

Destination must be same or **less permissive** PvP type. The project uses this ordering (most to least permissive), implemented in `src/hooks/useServerBrowser.js`:

```text
Retro Hardcore PvP > Hardcore PvP > Retro Open PvP > Open PvP > Optional PvP
```

A character can transfer from any type to the same type or any type **below** it in this list. Transfers to a more permissive type are not allowed.

| From ↓ \ To → | Retro Hardcore | Hardcore | Retro Open | Open | Optional |
| -------------- | -------------- | -------- | ---------- | ---- | -------- |
| Retro Hardcore | yes* | yes | yes | yes | yes |
| Hardcore | yes* | yes | yes | yes | yes |
| Retro Open | no | no | yes | yes | yes |
| Open | no | no | no | yes | yes |
| Optional | no | no | no | no | yes |

\* Unless the character has been in Calva or Calvera in the past (Hardcore PvP only). Not currently relevant — no pure Hardcore PvP servers exist in the DB.

### PvP Types in the Database

Current servers in the DB use these PvP/BattlEye combinations:

| PvP Type | BattlEye | Notes |
| -------- | -------- | ----- |
| Retro Hardcore PvP | Green | — |
| Retro Open PvP | Green, Yellow | some blocked |
| Open PvP | Green, Yellow | some blocked, one premium |
| Optional PvP | Green, Yellow | some blocked |

Note: `Hardcore PvP` (non-retro) has no servers in the DB currently, but the code handles it correctly if one is added.

## BattlEye Restriction

Characters can only move to a game world which has been initially protected by BattlEye if they also come from a game world which has been protected by BattlEye **right from the start**.

In practice: if your source server has Green BattlEye (protected from the start), you can transfer to any server. If your source server has Yellow BattlEye (added later), you can only transfer to other Yellow BattlEye servers.

## Server Lock States

| State | Can transfer **to** it? | Can transfer **from** it? |
| ----- | ----------------------- | ------------------------- |
| Normal | yes (if compatible) | yes |
| Blocked/Closed | no | yes |
| Locked (e.g. Experimental) | yes (from any world) | only to other locked worlds |

## General Requirements

- Character must not have a red or black skull at time of transfer
- Must give up rented house and guild leadership before transferring
- No open Tibia Coin offers in the market (buy or sell)
- All other open market offers are cancelled on transfer (items sent to inbox)
- Character must be on the main continent (not Dawnport or Rookgard)
- Guild membership is removed (items in guildhall stay with the guild)
- Marriage is dissolved
- Pending house bids/transfers are cancelled
- Everything else on the character (items, stash, etc.) transfers with them
- To transfer **to** a premium server (e.g. Premia), the account must be premium at time of transfer

## What This Means for the Project

The transfer compatibility logic is implemented in `src/hooks/useServerBrowser.js` and covers all rules above:

1. **PvP filter**: `canTransfer()` checks that destination PvP index is >= source PvP index in the `PVP_ORDER` array
2. **BattlEye filter**: Yellow → Green is blocked; Green → Yellow is allowed
3. **Blocked servers**: excluded as targets when `excludeBlocked` is enabled (filters on `notes = 'blocked'`)
4. **Bidirectional check**: `isTransferCompatible()` checks both directions — useful for showing servers you could transfer to OR from
5. **Cost**: 750 Tibia Coins per transfer (regular) — factor into profitability
6. **Cooldown**: 6 months between regular transfers — plan accordingly

### Not Handled by the Code

- **Calva/Calvera restriction**: Hardcore PvP characters who have visited those servers can't transfer to other Hardcore PvP worlds. Moot since no pure Hardcore PvP servers exist in the DB.
- **Premium server requirement**: one Open PvP server has `notes = 'premium'` — the code doesn't filter this, but it's an account-level check, not a server compatibility issue.
- **Experimental/locked worlds**: no experimental servers exist in the DB. The code would need to handle these separately if added.
