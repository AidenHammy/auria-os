# AuriaOS

A browser-based webOS built from scratch with vanilla HTML, CSS and JavaScript. No frameworks, no build step, just a desktop in a browser tab!

This is a personal learning project built as part of **Stardance**, hosted by Hack Club.

## Features

### Window Manager
- Open, close, minimize and maximize windows
- Drag windows freely around the desktop
- Bounds clamping prevents windows from being dragged fully off-screen
- Resize windows from every edge and corner
- Edge snapping with a live ghost preview
  - Snap left/right for a split view
  - Drag to the top to maximize
- Double-click a titlebar to maximize or restore
- Proper window focus and z-index management

### Desktop
- Desktop icons with double-click launching
- Live desktop clock
- Window state synchronized with the taskbar

### Start Menu
- Search across the full app catalog instantly not just pinned apps
- Pin/unpin apps via right-click with a real context menu
- Five core apps are locked as always-pinned so the menu can never end up empty
- Pinned apps grid with a colored icon badge for every app
- Recent section; tracking apps you've actually opened (real activity not placeholder data)
- "Show all" link straight into the Apps folder
- Quick toggles for Dark Mode, Sound, Wi-Fi and Bluetooth; Dark Mode and Sound are real saved settings shared with the Settings panel; Wi-Fi/Bluetooth are visual only since a browser tab has no actual hardware to control
- Personal greeting header with a time-aware message and the current date
- User profile footer
- Full keyboard support! Tab between items, Enter or Space to activate, Escape to close, Enter in search opens the top result
- "/" keyboard shortcut jumps straight into search from anywhere

### Taskbar
- Live taskbar buttons for every open window
- Active/minimized state indicators
- Click a taskbar button to focus or minimize its window
- System tray icons mirror current Wi-Fi and Sound state

### Settings
- Dark mode toggle
- Live accent color theming reflected across the taskbar, start menu and settings UI
- Animations toggle
- Sound toggle (a saved preference for now, no audio is wired up yet)
- All preferences persist automatically via `localStorage`

## Persistence

Using `localStorage`, AuriaOS remembers:
- Theme & settings
- Accent color
- Notepad contents
- Pinned applications
- Recently opened applications

## Apps

**Working**
- Notepad autosaves while typing, persists via `localStorage`
- Terminal is a real shell; command parsing, arrow-key history and commands that actually control the OS, not just printed text. `open`, `pin`/`unpin`, `theme`, `darkmode`, `sound`, `wifi`, `bluetooth`, `ls`, `history`, `closeall` and `shutdown` all do exactly what they say

**In Progress**
- Browser
- Calculator
- Mood Lamp
- Fortune Cookie

## Tech Stack

- HTML
- CSS
- Vanilla JavaScript
- LocalStorage API

No frameworks. No libraries. No dependencies. No build tools.

## Roadmap

Planned additions include:
- Browser with real navigation support
- Calculator implementation
- More desktop applications
- A simulated file system
- Notifications
- Persisting terminal command history across reloads, not just per-window
- Broader keyboard accessibility beyond the start menu
- More keyboard shortcuts
- Performance improvements

## Contributing

This is primarily a learning project but feedback, suggestions and bug reports are always welcome!