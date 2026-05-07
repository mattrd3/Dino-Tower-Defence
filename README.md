# Jurassic Outpost

A standalone Phaser-based browser tower defense MVP.

## What is included

- `index.html` — the complete playable MVP
- Phaser loaded from CDN
- Jungle Perimeter map
- 3 tower types: Ranger, Cannon, Cryo
- 5 enemy types: Compy, Raptor, Triceratops, Dilophosaur, Rex Alpha
- 10 waves
- Credits, lives, upgrades, selling, pause and speed controls

## Run locally

Open `index.html` in a browser.

Because Phaser is loaded from CDN, you need an internet connection.

## Cloudflare Pages

Create a new GitHub repo, for example `jurassic-outpost`, and add these files at the repo root.

Recommended Cloudflare Pages settings:

- Framework preset: None
- Build command: `exit 0`
- Build output directory: `/`
- Production branch: `main`

The app will then load from the Pages project root.
