# AuriaOS

A browser-based webOS built from scratch with vanilla HTML, CSS and JavaScript. No frameworks, no build step, it's just a desktop in a browser tab!

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
- Right-click a titlebar for a real context menu: Minimize, Maximize/Restore, Always on Top, Close
- **Always on Top** - pin a window and it stays above every other window no matter what else you click, using its own dedicated z-index band
- Right-click a taskbar button to restore/minimize or close that window directly

### Desktop
- Desktop icons with double-click launching
- Right-click a desktop icon for a quick Open
- Right-click empty desktop space for Personalize, Open in Terminal and Refresh. A real OS-style desktop menu conventions but it's not a restated app launcher
- Live desktop clock that's actually interactive! Click it to open a calendar popover for the current month with today marked and correct handling of month length and leap years
- Window state synchronized with the taskbar

### Start Menu
- Search across the full app catalog instantly and not just pinned apps
- Pin/unpin apps via right-click with a real context menu
- Five core apps are locked as always-pinned so the menu can never end up empty
- Pinned apps grid with a colored icon badge for every app
- Recent section which includes tracking apps you've actually opened
- "Show all" link straight into the Apps folder
- Quick toggles for Dark Mode, Sound, Wi-Fi and Bluetooth. Dark Mode and Sound are real saved settings shared with the Settings panel, although I haven't worked on sound just yet. Wi-Fi/Bluetooth are visual only.
- Personal greeting header with a time-aware message and the current date
- User profile footer
- Full keyboard support! Tab between items, Enter or Space to activate, Escape to close, Enter in search opens the top result
- "/" keyboard shortcut jumps straight into search from anywhere

### Taskbar
- Live taskbar buttons for every open window
- Active/minimized state indicators
- Click a taskbar button to focus or minimize its window
- Right-click empty taskbar space for Show Desktop, Close All Windows and Settings
- System tray icons mirror current Wi-Fi and Sound state

### Right-Click Everywhere
Context menus aren't limited to one corner of the OS. Right-clicking does something real in every part of the desktop: titlebars, taskbar buttons, empty taskbar space, empty desktop space and desktop icons each get their own menu built for that specific context, reusing one shared context-menu system under the hood.

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
- Ambient light (Mood Lamp) color and intensity
- Notepad contents
- Pinned applications
- Recently opened applications

## Apps

**Working**
- **Notepad** : autosaves while typing, persists via `localStorage`
- **Terminal** : a real shell with command parsing, arrow-key history and commands that actually control the OS. `open`, `pin`/`unpin`, `theme`, `lightmode`, `sound`, `wifi`, `bluetooth`, `ls`, `history`, `closeall` and `shutdown` all do exactly what they say
- **Calculator** : immediate-execution arithmetic (the way a real desk calculator works), full keyboard input, proper divide by zero handling
- **Mood Lamp** : an ambient color wash applied across the whole desktop with four presets plus a full custom color picker and intensity control
- **Fortune Cookie** : click to crack, reveals a real paper slip with one of 24 written fortunes and six unique "lucky numbers" the same way an actual fortune-cookie slip works
- **Browser** : a real address bar with back/forward/reload/home, loading pages in an embedded view. Typed searches open in a new tab instead since search engines universally block being shown inside another page's frame. Well good thing is direct URLs still load inline where the target site allows it

## Tech Stack

- HTML
- CSS
- JavaScript
- LocalStorage 

## Contributing

This is primarily a learning project but feedback, suggestions and bug reports are always welcome!