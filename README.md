# Open World Game

3D open-world survival prototype in a **single HTML file**. Three.js, no build step, runs on mobile and desktop. Built iteratively in a Claude chat.

**Play:** open `index.html` in a browser, or enable GitHub Pages (Settings → Pages → branch `main`, folder `/`) and play at `https://<user>.github.io/open-world-game/`.

## Features

- Procedural terrain (value noise), water with waves, day/night cycle with sun/moon/stars
- Resource gathering: chop trees (wood), mine rocks (stone), respawn timers
- Building system with grid snapping (Rust-style):
  - Foundation (raised, half wall height), floor slabs, stairs (indoor + outdoor), wood/stone walls, window, door with auto-opening leaf, campfire
  - Wall-on-wall stacking, multi-storey support, snap prefers the storey at the player's feet level
  - Continuous build mode (piece stays selected)
- Physics: segment wall collision with a walkable doorway, walkable wall tops, stair collision, head-bump ceilings, step-up logic
- Controls:
  - **Mobile:** left joystick, right side swipe = camera, JUMP / 🪓 / 🔨 buttons
  - **Desktop:** WASD + mouse (pointer lock), Space jump, E hit, C craft panel, V camera toggle, 1–8 recipe hotkeys, click/Enter to place, Esc cancel
- First-person (default) and third-person camera

## Notes

- Start inventory is set to 500/500 for testing (`const inv` in `index.html`)
- Known simplifications: no world persistence, no cascade destruction, buildings currently indestructible (hammer tool planned)
- Next ideas: structural stability calc (foundation height groundwork already in), inventory & tools, saving via storage, mobs

## Dev

Everything lives in `index.html` (~1500 lines): terrain, resources, building/snapping/collision, controls, day-night, game loop. Three.js r128 from cdnjs.
