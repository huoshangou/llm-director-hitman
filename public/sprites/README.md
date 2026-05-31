# Sprites Archive

This folder is the Web demo asset archive.

```text
sprites/
  sheets/       AI-generated source sheets and crop manifest
  map/          full map background and location highlight overlays
  characters/   transparent character cutouts
  objects/      transparent tool target objects
  overlays/     transparent state overlays and UI status icons
  manifest.json runtime-facing asset index
```

Rules:

- Keep generated source sheets in `sheets/`; do not edit them in place.
- Cropped runtime assets use lowercase snake_case filenames.
- Character and object anchors default to bottom center: `{ "x": 0.5, "y": 1 }`.
- Overlay anchors default to center: `{ "x": 0.5, "y": 0.5 }`.
- UI panels stay CSS/Tailwind unless a real bitmap is needed.
