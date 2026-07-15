# MedDoc Companion 🩺🫧

A desktop wellness buddy for people who sit at a laptop all day. A little companion
(you pick: Bubbles 🫧, Miso 🐱, or Beep 🤖) walks onto your screen to remind you to:

- 💧 Drink water (every N minutes)
- 🍱 Eat lunch (at your lunch time)
- 💊 Take your medicines (at the exact times you set)
- 🚶 Move after long sitting (detects real keyboard/mouse activity — won't nag an empty chair)

**Login-gated:** you can only use it with a MedDoc account (same Clerk login as the website).

## Setup

1. `cd companion`
2. `npm install`
3. Copy `.env.example` to `.env` and fill in:
   - `CLERK_PUBLISHABLE_KEY` — same as `VITE_CLERK_PUBLISHABLE_KEY` in `client/.env`
   - `MEDDOC_API_URL` — your MedDoc server (default `http://localhost:5000/api`)
4. Make sure the MedDoc server is running (`cd server && npm run dev`) — login verifies against it.
5. `npm start`

## How it behaves

- Sign in with your MedDoc account → dashboard opens.
- First run asks: "Do you take any medicines?" — add name + times (stored locally only).
- Pressing ✕ hides to the **system tray** — the companion keeps running and reminding.
- Tray menu: open dashboard, pause reminders 1 hour, quit.
- "Start with Windows" checkbox makes it auto-launch on login.
- Reminders (except medicine) stay quiet outside your set work hours.
- Use the 🧪 test buttons on the dashboard to see the companion immediately.

## Architecture (for future us)

- `main/reminderEngine.js` — pure scheduling logic, no UI. Portable to a website/PWA version.
- `main/main.js` — Electron shell: windows, tray, local static server (Clerk needs an http origin).
- `renderer/` — plain HTML/CSS/JS pages: `login` (Clerk gate), `dashboard` (settings), `companion` (the transparent walking-character window).
- Settings live in a local JSON file under the OS user-data dir — nothing leaves the machine except Clerk login verification.
