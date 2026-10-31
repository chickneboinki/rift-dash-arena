# RIFT ARENA

A browser-based third-person build-and-shoot arena prototype built with Vite and Three.js.

## Run locally

```bash
npm install
npm run dev
```

## Current playable features

- Lobby navigation with Play, Locker, and Item Shop views
- Six local playlists with mode-specific bot counts
- Sixteen original outfit presets, including the Xo Beta character palette roster, with unlock/equip flow
- Rift Coins wallet, cosmetic purchases, and elimination rewards
- Third-person movement, mouse aiming, and bot target practice
- Authored skinned SWAT character model loaded from Xo Beta (Quaternius CC0), retaining all bundled animation clips and crossfading idle, walk/run, jump and action states
- Secondary Quaternius soldier GLTF model from the FPS repo is loaded as an alternate bot archetype when its upstream asset is available
- Grid-snapped wall, floor, ramp, and pyramid placement with a raycast placement preview
- Wood, stone, and metal build tiers with separate durability, rotation, tile edits, and scroll-wheel edit reset
- Settings for sensitivity, FOV, graphics quality, and performance mode

## Current limitations

This is still a local browser prototype. The profile, coins, purchases, and outfit unlocks are saved in this browser's local storage only. Public matchmaking, authoritative online multiplayer, cross-device accounts, real payment processing, team-aware 2v2, and production-grade combat/build collision are not implemented. The 1v1 and 2v2 playlists currently run local bot practice rather than online human matches.


## Third-party code and asset notices

- Xo Beta character model and authored animation source: Quaternius Universal Modular Characters / Universal Animation Library, CC0 1.0. The runtime currently loads the SWAT modular GLB from the upstream Xo Beta public asset path.
- Adapted modular building geometry and placement concepts: `cass-agency/fortnite-clone`, MIT License (2024 Voxel Royale). The RIFT implementation is adapted to the existing local scene and is not its multiplayer server integration.
- Xo Beta repository source: `TKY-27/Xo-Beta`, MIT License. Asset provenance is separately documented by that repository; the Quaternius character model is CC0.
- The third candidate FPS repository provides a Quaternius CC0 soldier model and weapon pack, but those files have not been integrated into this RIFT branch yet.
