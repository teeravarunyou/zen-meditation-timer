# Still — Zen Meditation Timer

A quiet, nighttime-friendly meditation timer with an original Enso-inspired interface, a single selected Zen-bowl sound used for start/end chimes, and a monthly meditation habit tracker.

## Design direction

- Matte black / charcoal interface for low distraction in a dark room
- Original Enso-style brush ring around the timer
- Minimal off-white typography and low-contrast controls
- No interval chimes during meditation
- Responsive: timer + habit side-by-side on desktop, tabbed views on mobile

## Meditation timer

- Presets: 15, 20, 30, 45, and 60 minutes
- Start bell: one gentle bowl strike from `assets/start_bowl.wav`
- End bell: the exact same original-pitch bowl sound twice, 3 seconds apart at equal volume
- **No interval bell** — the session stays silent between start and finish
- Start / pause / resume / reset
- Wake Lock support on compatible browsers
- Completed sessions are saved automatically

## Monthly habit tracker

Completed sessions are stored in `localStorage` and summarized by month:

- Meditation days this month
- 20-day monthly habit goal and progress ring
- Total meditation minutes
- Number of completed sessions
- Current streak
- Longest streak
- Monthly calendar with practiced days highlighted
- Multiple sessions on one day are indicated on the calendar
- JSON backup export

Only a timer that reaches zero is added to history. Reset or abandoned sessions are not counted.

## Files

- `index.html` — app structure
- `styles.css` — dark Zen / Enso visual design
- `app.js` — timer and habit logic
- `assets/start_bowl.wav` — original synthetic opening chime
- `generate_sounds.py` — Python generator for the two bowl sounds
- `serve.py` — local development server

## Preview locally

```bash
python3 serve.py
```

Then open `http://localhost:8000`.

## Regenerate the sounds

```bash
python3 generate_sounds.py
```

The Python script uses only the standard library.

## Publish with GitHub Pages

1. Create a GitHub repository, for example `still-meditation-timer`.
2. Upload all project files, keeping the `assets` folder.
3. Open **Settings → Pages** in the repository.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select **main** and **/(root)**, then save.
6. GitHub Pages will provide the public app URL.

GitHub Pages serves the deployed app as static HTML/CSS/JavaScript. Python is used only to generate the original audio files and to run a local development server.

## Privacy / storage note

Habit history stays in the browser on that device. It does not automatically sync between a phone and a computer. Clearing browser/site data can remove the history, so the app includes **Backup** to export the sessions as JSON.
