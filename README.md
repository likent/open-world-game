# Open World Game

3D open-world survival prototype in a **single HTML file**. Three.js, no build step, runs on mobile and desktop. Built iteratively in a Claude chat.

**Play:** open `index.html` in a browser, or enable GitHub Pages (Settings → Pages → branch `main`, folder `/`) and play at `https://<user>.github.io/open-world-game/`.

## Features

- Procedural terrain (value noise), water with waves, day/night cycle with sun/moon/stars
- Resource gathering: chop trees (wood, sometimes apples), mine rocks (stone, sometimes coal), respawn timers
- Slot-based inventory (backpack): 24 slots, stacking, drag & drop and stack-splitting that work with mouse and touch (open with 🎒 / `I`)
- Building system with grid snapping (Rust-style):
  - Foundation (raised, half wall height), floor slabs, stairs (indoor + outdoor), wood/stone walls, window, door with auto-opening leaf, campfire
  - Wall-on-wall stacking, multi-storey support, snap prefers the storey at the player's feet level
  - Continuous build mode (piece stays selected)
- Physics: segment wall collision with a walkable doorway, walkable wall tops, stair collision, head-bump ceilings, step-up logic
- Controls:
  - **Mobile:** left joystick, right side swipe = camera, JUMP / 🪓 / 🔨 buttons
  - **Desktop:** WASD + mouse (pointer lock), Space jump, E hit, C craft panel, I inventory, V camera toggle, 1–8 recipe hotkeys, click/Enter to place, Esc cancel
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
- `js/inventory.js` — item registry, slot inventory, stacking, drag & drop UI
- `js/building.js` — recipes, builders, snapping/placement
- `js/gather.js` — gathering, hits, respawns
- `js/controls.js` — touch + keyboard/mouse input, camera view
- `js/daynight.js` — day/night cycle
- `js/main.js` — physics/collision, camera, game loop
