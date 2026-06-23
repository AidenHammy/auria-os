# AuriaOS

A browser-based webOS, built from scratch with vanilla HTML, CSS and JavaScript! No frameworks, no build step, just a desktop in a browser tab.

This is a personal learning project, built as part of an event, namely Stardance hosted by HackClub.

## Why AuriaOS?

This project is an experiment in understanding how operating system-like behavior works at a UI level—window management, state handling and interactions without relying on abstractions.

The goal isn’t to build something that works but to understand why it works.

## Features

**Window Manager**
- Open, close, minimize, and maximize windows
- Drag windows anywhere on the desktop, with bounds clamping so they can't get lost off-screen
- Resize from any edge or corner
- Edge snapping (drag to a screen edge to snap to half-screen, drag to the top to maximize) with a live ghost preview while dragging
- Double-click a titlebar to maximize/restore

**Desktop & Taskbar**
- Desktop icons, double-click to launch
- Start menu for launching apps
- Taskbar buttons that reflect each window's live state (active/minimized)
- Click taskbar buttons to focus or minimize windows

**Settings**
- Dark mode toggle
- Live accent color theming (affects the taskbar, start menu, and settings UI, not just a CSS variable that does nothing)
- Animations/sounds toggles

**Apps**
- **Notepad** — basic placeholder (functionality expanding)
- **Browser, Terminal, Calculator, Mood Lamp, Fortune Cookie** — currently placeholder shells, real functionality in progress

## Tech Stack

Plain HTML, CSS and JavaScript. No frameworks, no dependencies, no build tools required.

## Running Locally

Since there's no build step, you can just open `index.html` directly in a browser. If you'd rather serve it (recommended, some browsers restrict certain APIs on `file://` URLs):

```bash
# Python
python3 -m http.server

# or Node
npx serve
```

Then visit `http://localhost:8000` (or whatever port your server reports).

## Contributing

This is primarily a learning project but feedback, ideas and issues are always welcome!