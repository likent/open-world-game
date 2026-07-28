# Open World Game

3D open-world survival prototype in a **single HTML file**. Three.js, no build step, runs on mobile and desktop. Built iteratively in a Claude chat.

**Play:** open `index.html` in a browser, or enable GitHub Pages (Settings → Pages → branch `main`, folder `/`) and play at `https://<user>.github.io/open-world-game/`.

## Vision

The goal is a **survival game**: gather → craft → build → stay alive. The player fights hunger, night, and danger, and turns the world into shelter and tools. The systems below are being added toward that loop.

## Roadmap

Rough order, most foundational first:

1. **Survival stats** — health + hunger (later thirst/stamina). Hunger drains over time; eating restores it, starving hurts. Makes `type: "food"` items (apples) actually edible. *(core survival loop)*
2. **Persistence** — save inventory, buildings and player state to `localStorage`; reload continues the world.
3. **Crafting screen & tools** — recipe UI filtered by ingredient (reuses `itemUses(id)`), craftable tools (axe/pickaxe speed up gathering), a workbench to unlock recipes.
4. **World item drops** — items lying on the ground as `{ id, count, x, z }` entities; walk over to pick up (`addItem`). Felled trees/rocks drop pickups instead of auto-adding.
5. **Mobs** — passive animals to hunt for food, hostile creatures at night → a reason to wall yourself in. Then combat + weapons.
6. **Environment pressure** — cold nights, campfire warmth; building durability + a hammer to repair/remove.

Data-driven where possible: items live in `data/items.json`; recipes and drop tables can move into JSON next so content is editable without touching code.

## Features

- Procedural terrain (value noise), water with waves, day/night cycle with sun/moon/stars
- Resource gathering: chop trees (wood, sometimes apples), mine rocks (stone, sometimes coal), respawn timers
- Slot-based inventory (backpack): 24 slots, stacking, drag & drop to arrange (mouse + touch); hold an item to see its name & description (open with 🎒 / `I`)
- Item database in `data/items.json` — a table of records keyed by `id` (name, icon, type, stack size, description); loaded at startup and referenced everywhere by `id`
- Building system with grid snapping (Rust-style):
  - Foundation (raised, half wall height), floor slabs, stairs (indoor + outdoor), wood/stone walls, window, door with auto-opening leaf, campfire
  - Wall-on-wall stacking, multi-storey support, snap prefers the storey at the player's feet level
  - Continuous build mode (piece stays selected)
- Physics: segment wall collision with a walkable doorway, walkable wall tops, stair collision, head-bump ceilings, step-up logic
- Belt (hotbar): holds **any** item — drag from the backpack. The active item drives the action button by type: a **tool** gathers/attacks (you hit what you look at — aim-based, no chopping with your back; matching tool fast, bare fists slower), **food** is eaten, anything else is just held. Backpack items and belt items both count toward recipes.
- Mobs respect the world: building walls block them, and they can't hit you from far below (build up to stay safe).
- Controls:
  - **Mobile:** left joystick, right side swipe = camera, big action button (tool/fist) bottom-right, JUMP above it, belt across the bottom (tap to select), 🎒/🔨 top-left
  - **Desktop:** WASD + mouse (pointer lock), Space jump, E hit, C craft panel, I inventory, V camera toggle, 1–4 belt select (or recipe 1–8 while the craft panel is open), click/Enter to place, Esc cancel
- First-person (default) and third-person camera

## Notes

- Starting backpack is stocked for testing (`addItem(...)` calls at the bottom of `js/inventory.js`)
- Known simplifications: no world persistence, no cascade destruction, buildings currently indestructible (hammer tool planned); apples/coal are collectible flavor items for now (no eat/smelt yet)
- Next ideas: structural stability calc (foundation height groundwork already in), tools & item uses (eat/smelt), saving via storage, mobs

## Dev

No build step — `index.html` loads Three.js r128 from cdnjs, then the game modules from `js/` in order. They're plain (non-module) scripts that share one global scope, so opening `index.html` over `file://` still works.

- `styles.css` — all UI/HUD styling
- `js/scene.js` — renderer, camera, lights, stars
- `js/noise.js` — value noise + `terrainHeight`
- `js/terrain.js` — terrain mesh & water
- `js/resources.js` — trees, rocks, clouds (instanced)
- `js/character.js` — player character model
- `js/player.js` — player state, spawn
- `js/inventory.js` — loads the item DB, slot inventory, stacking, drag & drop + hold-to-inspect UI
- `data/items.json` — item table (id, name, icon, type, stack, desc)
- `js/building.js` — recipes, builders, snapping/placement
- `js/gather.js` — gathering, hits, respawns
- `js/controls.js` — touch + keyboard/mouse input, camera view
- `js/daynight.js` — day/night cycle
- `js/main.js` — physics/collision, camera, game loop

**Cache busting:** CSS/JS are linked with a `?v=N` query in `index.html`. Bump `N` on every change you deploy, otherwise browsers keep serving stale cached files (and can mix old + new, which breaks the page).
