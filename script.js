// ------------ Persistence -----------------
// Settings and notepad text survive a refresh via localStorage
// Window positions/open apps are NOT persisted yet

const STORAGE_KEYS = {
  settings: "auriaos-settings",
  notepad: "auriaos-notepad",
  pinned: "auriaos-pinned-apps",
  recent: "auriaos-recent-apps",
};

const DEFAULT_SETTINGS = {
  darkmode: false,
  animations: true,
  sounds: false,
  accent: "#4ecdc4",
  // Cosmetic only, no real access to Wi-Fi/Bluetooh
  wifi: true,
  bluetooth: true,
};

function loadSettings(){
  try{
    const saved = localStorage.getItem(STORAGE_KEYS.settings);
    // Merging over the defaults rather than replacing them outright ensures that upon adding
    // a new setting in a future version, old data won't leave it as undefined
    return saved ? {...DEFAULT_SETTINGS, ...JSON.parse(saved)} : {...DEFAULT_SETTINGS};
  } catch(err){
    console.warn("Couldn't load saved settings using defaults.", err);
    return {...DEFAULT_SETTINGS};
  }
}

function saveSettings(){
  try{
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
  } catch(err){
    console.warn("Couldn't save settings.", err);
  }
}

// Apply settings to the actual page. Needed both at startup and whenever
// a setting changes, so it is its own function instead of being repeated

function applySettings(){
  document.body.style.filter = state.settings.darkmode ? "invert(1) hue-rotate(180deg)" : "";
  document.documentElement.style.setProperty("--accent", state.settings.accent);
  document.documentElement.style.setProperty("--accent-hover", state.settings.accent);
  document.documentElement.classList.toggle("no-animations", !state.settings.animations);
}

// Locked apps are always pinned no matter what's saved
// it will guarantee the start menu never ends up empty
function loadPinnedApps(){
  const lockedKeys = Object.keys(apps).filter((key) => apps[key].locked);
  try{
    const saved = localStorage.getItem(STORAGE_KEYS.pinned);
    const customPins = saved ? JSON.parse(saved) : [];
    return new Set([...lockedKeys, ...customPins]);
  } catch(err){
    console.warn("Couldn't load pinned apps using defaults.", err);
    return new Set(lockedKeys);
  }
}

function savePinnedApps(){
  try{
    // Only the custom (non-locked) pins need saving
    // locked ones get re-added automatically on load regardless
    const customPins = [...state.pinnedApps].filter((key) => !apps[key]?.locked);
    localStorage.setItem(STORAGE_KEYS.pinned, JSON.stringify(customPins));
  } catch(err){
    console.warn("Couldn't save pinned apps.", err);
  }
}

// ------- Recent Apps ---------
// Tracks apps that've actually been opened WITH a real timestamp

const MAX_RECENT = 5;

function loadRecentApps(){
  try{
    const saved = localStorage.getItem(STORAGE_KEYS.recent);
    return saved ? JSON.parse(saved) : [];
  } catch(err){
    console.warn("Couldn't load recent apps.", err);
    return [];
  }
}

function saveRecentApps(){
  try{
    localStorage.setItem(STORAGE_KEYS.recent, JSON.stringify(state.recentApps));
  } catch(err){
    console.warn("Couldn't save recent apps.", err);
  }
}

// Moves or adds an app to the front of the recent list, capped at
// MAX_RECENT entries. Called every time a window actually opens
function trackRecentApp(key){
  state.recentApps = state.recentApps.filter((entry) => entry.key !== key);
  state.recentApps.unshift({key, timestamp: Date.now()});
  state.recentApps = state.recentApps.slice(0, MAX_RECENT);
  saveRecentApps();
}

function formatRelativeTime(timestamp){
  const diffMin = Math.floor((Date.now() - timestamp) / 60000);
  if(diffMin < 1) return "Just now";
  if(diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if(diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr/ 24);
  return `${diffDay}d ago`;
}

// --- State ---
const state = {
  windows: new Map(),
  nextId: 1,
  activeWindow: null,
  settings: loadSettings(),
  pinnedApps: null,
  recentApps: loadRecentApps(),
};

applySettings();

// ------------------- DOM refs ------------------------
const desktop = document.getElementById("desktop");
const windowLayer = document.getElementById("window-layer");
const taskbarApps = document.getElementById("taskbar-apps");
const startBtn = document.getElementById("start-btn");
const startMenu = document.getElementById("start-menu");
const clockEl = document.getElementById("clock");

// -------------------- App definitions ------------------------
const apps = {
  browser: { title: "Browser", icon: "🌐", template: "content-browser", badge: "#1f6feb" },
  terminal: { title: "Terminal", icon: "💻", template: "content-terminal", locked: true, badge: "#1c1c24" },
  notepad: { title: "Notepad", icon: "📝", template: "content-notepad", badge: "#e8e8f0" },
  apps: { title: "Apps", icon: "🗂️", template: "app-apps", locked: true, badge: "#e3a627" },
  settings: { title: "Settings", icon: "⚙️", template: "app-settings", locked: true, badge: "#525a6b" },
  calculator: { title: "Calculator", icon: "🧮", template: "content-calculator", badge: "#e0574a" },
  moodlamp: { title: "Mood Lamp", icon: "🔮", template: "content-moodlamp", badge: "linear-gradient(135deg, #a06bff, #ff6bcb)" },
  fortune: { title: "Fortune", icon: "🥠", template: "content-fortune", badge: "#c9974a" },
};

state.pinnedApps = loadPinnedApps();

// Toggles whether an app shows up in the start menu
// Locked apps silently refuse. The context menu never even offers this 
// option for them but the check stays here too as a safety net

function togglePinned(key){
  if(apps[key]?.locked) return;
  if(state.pinnedApps.has(key)){
    state.pinnedApps.delete(key);
  } else{
    state.pinnedApps.add(key);
  }
  savePinnedApps();
  const currentQuery = document.getElementById("start-search-input")?.value || "";
  buildStartMenu(currentQuery);
}

// ------- Clock --------
function updateClock(){
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

setInterval(updateClock, 1000);
updateClock();

// ---------- Greeting & Date --------------
// A small personal touch in the start menu header
const USER_NAME = "Aiden";

const profileNameEl = document.getElementById("start-profile-name");
if(profileNameEl) profileNameEl.textContent = USER_NAME;

function updateGreeting(){
  const now = new Date();
  const hour = now.getHours();

  let greeting;
  if(hour < 5) greeting = "Good night";
  else if(hour < 12) greeting = "Good morning";
  else if(hour < 18) greeting = "Good afternoon";
  else greeting = "Good evening";

  const greetingE1 = document.getElementById("start-greeting-sub");
  if(greetingE1) greetingE1.textContent = `${greeting}, ${USER_NAME}.`;

  const dateE1 = document.getElementById("start-greeting-date");
  if(dateE1){
    const weekday = now.toLocaleDateString(undefined, {weekday: "long"});
    const monthDay = now.toLocaleDateString(undefined, {day: "numeric", month: "long"});
    dateE1.innerHTML = `${weekday}<br>${monthDay}`;
  }
}

updateGreeting();

// Clears the search box and rebuilds the grid back to the pinned-only view
// Called anywhere the menu closes so it doesn't reopen later still showing
// whatever you last searched for
function resetStartSearch(){
  const input = document.getElementById("start-search-input");
  if(input) input.value = "";
  buildStartMenu();
}

// Shared so both the Start button and the "/" shortcut behave identically
// instead of having two slightly different versions of opening the menu
function openStartMenu(){
  startMenu.classList.remove("hidden");
  updateGreeting();
  buildRecentList();
  syncQuickToggles();
  document.getElementById("start-search-input")?.focus();
}

function closeStartMenu(){
  startMenu.classList.add("hidden");
  resetStartSearch();
}

// ---------- Start Menu Toggle ------------
startBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if(startMenu.classList.contains("hidden")) openStartMenu();
  else closeStartMenu();
});

// Close start menu when clicking elsewhere
document.addEventListener("click", (e) => {
  if(!startMenu.contains(e.target) && e.target !== startBtn){
    if(!startMenu.classList.contains("hidden")) closeStartMenu();
  }
});

document.getElementById("start-search-input")?.addEventListener("input", (e) => {
  buildStartMenu(e.target.value);
});

document.getElementById("start-show-all")?.addEventListener("click", () => {
  openWindow("apps");
  closeStartMenu();
});

document.getElementById("start-show-all")?.addEventListener("keydown", (e) => {
  if(e.key === "Enter" || e.key === " "){
    e.preventDefault();
    e.target.click();
  }
});

// Pressing Enter opens the first search result
// Otherwise, search only filters the list
document.getElementById("start-search-input")?.addEventListener("keydown", (e) => {
  if(e.key !== "Enter") return;
  const firstTile = document.querySelector(".start-grid .start-app");
  if(firstTile) firstTile.click();
});

// Global "/" shortcut to jump straight into search, matching the kbd hint
// shown in the search bar. Skipped while typing in a real input or textarea
// so it doens't hijack typing a literal "/" in Notepad

// Escape closes the menu from anywhere, same listener since both are 
// just "global keys the start menu cares about"
document.addEventListener("keydown", (e) => {
  if(e.key === "Escape" && !startMenu.classList.contains("hidden")){
    closeStartMenu();
    return;
  }
  if(e.key !== "/") return;
  if(["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;

  e.preventDefault();
  if(startMenu.classList.contains("hidden")) openStartMenu();
  else document.getElementById("start-search-input")?.focus();
});

// ------ Open Window ------
function openWindow(appKey){
  const app = apps[appKey];
  if(!app) return;

  trackRecentApp(appKey);

  const id = state.nextId++;
  const template = document.getElementById("window-template");
  const win = template.content.cloneNode(true).querySelector(".window");

  win.dataset.id = id;
  win.dataset.app = appKey;
  win.style.left = 50 + ((id * 30) % 200) + "px";
  win.style.top = 30 + ((id * 30) % 150) + "px";
  win.style.zIndex = 1000 + id;

  // Set title
  win.querySelector(".window-title").textContent = app.icon + " " + app.title;

  // Set content
  const contentArea = win.querySelector(".window-content");
  if(app.template){
    const tmpl = document.getElementById(app.template);
    if(tmpl) contentArea.appendChild(tmpl.content.cloneNode(true));
  } 
  else{
    contentArea.innerHTML = app.content;
  }

  // Window controls
  win.querySelector(".close").addEventListener("click", () => closeWindow(id));
  win.querySelector(".minimize").addEventListener("click", () => minimizeWindow(id));
  win.querySelector(".maximize").addEventListener("click", () => toggleMaximize(id));

  // Focus on click
  win.addEventListener("mousedown", () => focusWindow(id));

  // Make draggable and resizable
  makeDraggable(win);
  makeResizable(win);

  // Add to layer
  windowLayer.appendChild(win);
  state.windows.set(id, win);

  // Add taskbar button
  const btn = document.createElement("div");
  btn.className = "taskbar-app";
  btn.dataset.winId = id;
  btn.innerHTML = `<span>${app.icon}</span><span>${app.title}</span>`;
  btn.addEventListener("click", () => {
    if(win.classList.contains("minimized")){
      restoreWindow(id);
    } else if(state.activeWindow === win){
      minimizeWindow(id);
    } else{
      focusWindow(id);
    }
  });
  taskbarApps.appendChild(btn);

  focusWindow(id);
  startMenu.classList.add("hidden");

  // Wire up app-specific interactions
  if(appKey === "apps") wireAppsFolder(contentArea);
  if(appKey === "settings") wireSettings(contentArea);
  if(appKey === "notepad") wireNotepad(contentArea);
}

function closeWindow(id){
  const win = state.windows.get(id);
  if(!win) return;
  win.remove();
  state.windows.delete(id);

  const btn = taskbarApps.querySelector(`[data-win-id="${id}"]`);
  if(btn) btn.remove();

  if(state.activeWindow === win){
    state.activeWindow = null;
    const remaining = Array.from(state.windows.values());
    if(remaining.length)
      focusWindow(parseInt(remaining[remaining.length - 1].dataset.id));
  }
}

function minimizeWindow(id){
  const win = state.windows.get(id);
  if(!win) return;
  win.classList.add("minimized");

  const btn = taskbarApps.querySelector(`[data-win-id="${id}"]`);
  if(btn) btn.classList.remove("active");

  if(state.activeWindow === win) state.activeWindow = null;
}

function restoreWindow(id){
  const win = state.windows.get(id);
  if(!win) return;
  win.classList.remove("minimized");
  focusWindow(id);
}

function focusWindow(id){
  const win = state.windows.get(id);
  if(!win) return;

  const maxZ = Math.max(...Array.from(state.windows.values()).map((w) => parseInt(w.style.zIndex) || 0));
  win.style.zIndex = maxZ + 1;
  state.activeWindow = win;

  document.querySelectorAll(".taskbar-app").forEach((b) => b.classList.remove("active"));
  const btn = taskbarApps.querySelector(`[data-win-id="${id}"]`);
  if(btn) btn.classList.add("active");
}

function toggleMaximize(id){
  const win = state.windows.get(id);
  if(!win) return;
  delete win.dataset.snapped;
  win.classList.toggle("maximized");
}

// --- Dragging (with bounds clamping and edge snapping) ---
const TASKBAR_HEIGHT = 48;
const SNAP_TRIGGER = 24; // px from screen edge that triggers a snap zone
const snapPreview = document.getElementById("snap-preview");

function makeDraggable(win){
  const titlebar = win.querySelector(".window-titlebar");
  let isDragging = false;
  let startX, startY, startLeft, startTop;

  titlebar.addEventListener("mousedown", (e) => {
    if(win.classList.contains("maximized")) return;
    if(e.target.closest(".window-controls")) return;

    isDragging = true;
    win.style.transition = "none";
    focusWindow(parseInt(win.dataset.id));

    // If this window is currently snapped, "pop" it back to the size it
    // had before snapping, keeping it anchored under the cursor.
    // Dragging a snapped window will feel more natural instead of janky.
    if(win.dataset.snapped){
      const prevWidth = parseFloat(win.dataset.prevWidth) || 600;
      const prevHeight = parseFloat(win.dataset.prevHeight) || 400;
      const ratio = (e.clientX - win.offsetLeft) / win.offsetWidth;

      win.style.width = prevWidth + "px";
      win.style.height = prevHeight + "px";
      win.style.left = e.clientX - ratio * prevWidth + "px";
      win.style.top = e.clientY - 18 + "px";
      delete win.dataset.snapped;
    }

    startX = e.clientX;
    startY = e.clientY;
    startLeft = win.offsetLeft;
    startTop = win.offsetTop;
  });

  // Double-click the titlebar to maximise/restore.
  titlebar.addEventListener("dblclick", (e) => {
    if(e.target.closest(".window-controls")) return;
    toggleMaximize(parseInt(win.dataset.id));
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // Clamp so the window always keeps enough of itself on-screen
    // to grab again. it can hang off an edge but never disappear
    const margin = 40;
    const minLeft = -(win.offsetWidth - margin);
    const maxLeft = window.innerWidth - margin;
    const minTop = 0;
    const maxTop = window.innerHeight - TASKBAR_HEIGHT - 10;

    const newLeft = Math.min(Math.max(startLeft + dx, minLeft), maxLeft);
    const newTop = Math.min(Math.max(startTop + dy, minTop), maxTop);

    win.style.left = newLeft + "px";
    win.style.top = newTop + "px";

    updateSnapPreview(e.clientX, e.clientY);
  });

  document.addEventListener("mouseup", (e) => {
    if(!isDragging) return;
    isDragging = false;
    win.style.transition = "";
    applySnapIfNeeded(win, e.clientX, e.clientY);
    hideSnapPreview(); 
  });
}

function getSnapZone(x, y){
  if(y <= 8) return "max";
  if(x <= SNAP_TRIGGER) return "left";
  if(x >= window.innerWidth - SNAP_TRIGGER) return "right";
  return null;
}

function getSnapRect(zone){
  const fullHeight = window.innerHeight - TASKBAR_HEIGHT;
  if(zone === "left")
    return {left: 0, top: 0, width: window.innerWidth / 2, height: fullHeight};
  if(zone === "right")
    return {left: window.innerWidth / 2, top: 0, width: window.innerWidth / 2, height: fullHeight};
  return {left: 0, top: 0, width: window.innerWidth, height: fullHeight}; // max
}

function updateSnapPreview(x, y){
  const zone = getSnapZone(x, y);
  if(!zone){
    snapPreview.classList.remove("active");
    return;
  }
  const rect = getSnapRect(zone);
  snapPreview.style.left = rect.left + "px";
  snapPreview.style.top = rect.top + "px";
  snapPreview.style.width = rect.width + "px";
  snapPreview.style.height = rect.height + "px";
  snapPreview.classList.add("active");
}

function hideSnapPreview(){
  snapPreview.classList.remove("active");
}

function applySnapIfNeeded(win, x, y){
  const zone = getSnapZone(x, y);
  if(!zone) return;

  // Remember the current size so we can restore it if the window
  // gets dragged away from the snapped position later

  win.dataset.prevWidth = win.offsetWidth;
  win.dataset.prevHeight = win.offsetHeight;

  const rect = getSnapRect(zone);
  win.style.left = rect.left + "px";
  win.style.top = rect.top + "px";
  win.style.width = rect.width + "px";
  win.style.height = rect.height + "px";
  win.dataset.snapped = zone;
}

// ----------- Resizing ---------------
function makeResizable(win){
  const minWidth = 280;
  const minHeight = 180;

  win.querySelectorAll(".resize-handle").forEach((handle) => {
    handle.addEventListener("mousedown", (e) => {
      if(win.classList.contains("maximized")) return;
      e.stopPropagation(); // doesn't let it bubble up and start a drag
      e.preventDefault();

      const dir = handle.dataset.dir;
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = win.offsetWidth;
      const startHeight = win.offsetHeight;
      const startLeft = win.offsetLeft;
      const startTop = win.offsetTop;

      win.style.transition = "none";
      focusWindow(parseInt(win.dataset.id));
      delete win.dataset.snapped; // resizing manually un-snaps it

      function onMove(e){
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let width = startWidth;
        let height = startHeight;
        let left = startLeft;
        let top = startTop;

        if(dir.includes("e")) width = Math.max(minWidth, startWidth + dx);
        if(dir.includes("s")) height = Math.max(minHeight, startHeight + dy);
        if(dir.includes("w")){
          width = Math.max(minWidth, startWidth - dx);
          left = startLeft + (startWidth - width);
        }
        if(dir.includes("n")){
          height = Math.max(minHeight, startHeight - dy);
          top = startTop + (startHeight - height);
        }
        
        win.style.width = width + "px";
        win.style.height = height + "px";
        win.style.left = left + "px";
        win.style.top = top + "px";
      }

      function onUp(){
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        win.style.transition = "";
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  });
}

// ----- Desktop Icons -------------------------
document.querySelectorAll(".icon[data-app]").forEach((icon) => {
  icon.addEventListener("dblclick", () => openWindow(icon.dataset.app));
});

// ----- Start Menu Items ------------------------
// Builds the start menu's tiles from state.pinnedApps (or with an active
// search query, the full apps catalog). Re-run on every keystroke and
// every pin/unpin so it clears the grid first to avoid duplicating tiles

function buildStartMenu(query=""){
  const grid = document.querySelector(".start-grid");
  if(!grid) return;

  grid.innerHTML = "";

  const trimmed = query.trim().toLowerCase();

  // No search text: show only the pinned apps like a normal start menu
  // With search text: search the FULL catalog not just the pinned ones

  const entries = trimmed
  ? Object.entries(apps).filter(([, app]) => app.title.toLowerCase().includes(trimmed))
  : Object.entries(apps).filter(([key]) => state.pinnedApps.has(key));

  // Nothing matched the search
  if(entries.length === 0){
    const empty = document.createElement("div");
    empty.className = "start-grid-empty";
    empty.textContent = "No apps found";
    grid.appendChild(empty);
    return;
  }

  entries.forEach(([key, app]) => {

    const tile = document.createElement("div");
    tile.className = "start-app";
    tile.dataset.app = key;
    tile.innerHTML = `
    <div class="start-app-icon-badge" style="background: ${app.badge || "rgba(255, 255, 255, 0.08)"}">
      <span class="start-app-icon">${app.icon}</span>
    </div>
    <span class="start-app-label">${app.title}</span>
    `;
    
    tile.tabIndex = 0;
    tile.setAttribute("role", "button");
    tile.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        tile.click();
      }
    });

    tile.addEventListener("click", () => {
      openWindow(key);
      startMenu.classList.add("hidden");
      resetStartSearch();
    });

    tile.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if(app.locked){
        showContextMenu(e.clientX, e.clientY, [
          { label: "📌 Always pinned", disabled: true },
        ]);
      } else{
        // A search result might not be pinned at all
        const isPinned = state.pinnedApps.has(key);
        showContextMenu(e.clientX, e.clientY, [
          {label: isPinned? "📌 Unpin from Start" : "📌 Pin to Start", onClick: () => togglePinned(key)},
        ]);
      }
    });

    grid.appendChild(tile);
  });
}

buildStartMenu();

// Recent apps, built from from real activity tracked in openWindow() not invented data
function buildRecentList(){
  const list = document.querySelector(".start-recent-list");
  if(!list) return;

  list.innerHTML = "";

  if(state.recentApps.length === 0){
    const empty = document.createElement("div");
    empty.className = "start-recent-empty";
    empty.textContent = "Nothing opened yet";
    list.appendChild(empty);
    return;
  }

  state.recentApps.forEach(({key, timestamp}) => {
    const app = apps[key];
    if(!app) return; // in case an app gets removed from `apps` later

    const row = document.createElement("div");
    row.className = "start-recent-item";
    row.innerHTML = `
    <div class="start-recent-icon-badge" style="background: ${app.badge || "rgba(255, 255, 255, 0.08)"}">
      <span>${app.icon}</span>
    </div>
    <div class="start-recent-text">
      <div class="start-recent-title">${app.title}</div>
      <div class="start-recent-sub">App</div>
    </div>
    <span class="start-recent-time">${formatRelativeTime(timestamp)}</span>
    `;
    row.tabIndex = 0;
    row.setAttribute("role", "button");
    row.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        row.click();
      }
    });

    row.addEventListener("click", () => {
      openWindow(key);
      startMenu.classList.add("hidden");
      resetStartSearch();
    });
    
    list.appendChild(row);
  });
}

// Quick toggles, Dark Mode/Sound are real settings shared with the
// settings panel. Wi-Fi/Bluetooth are purely cosmetic
const QUICK_TOGGLES = [
  { key: "wifi", icon: "📶", label: "Wi-Fi" },
  { key: "bluetooth", icon: "🔷", label: "Bluetooth" },
  { key: "darkmode", icon: "🌙", label: "Dark Mode" },
  { key: "sounds", icon: "🔊", label: "Sound" },
];

function buildQuickToggles(){
  const container = document.querySelector(".start-toggles");
  if(!container) return;

  container.innerHTML = "";

  QUICK_TOGGLES.forEach(({key, icon, label}) => {
    const pill = document.createElement("div");
    pill.className = "start-toggle";
    pill.dataset.toggle = key;
    pill.innerHTML = `
    <span class="start-toggle-icon">${icon}</span>
    <div class="start-toggle-text">
      <div class="start-toggle-label">${label}</div>
      <div class="start-toggle-sub" data-sub="${key}"></div>
    </div>
    `;
    pill.tabIndex = 0;
    pill.setAttribute("role", "button");
    pill.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault();
        pill.click();
      }
    });

    pill.addEventListener("click", () => {
      state.settings[key] = !state.settings[key];
      saveSettings();
      if(key === "darkmode"){
        applySettings(); // has a real visual effect to apply
      }
      syncQuickToggles();
      syncOpenSettingsPanels();
    });
    container.appendChild(pill);
  });
  
  syncQuickToggles();
}

// Keeps the quick-toggle row's ON/OFF labels and active matching state.settings called at
// startup after any toggle click and whenever the settings panel changes the same setting
function syncQuickToggles(){
  QUICK_TOGGLES.forEach(({key}) => {
    const pill = document.querySelector(`.start-toggle[data-toggle="${key}"]`);
    const sub = document.querySelector(`[data-sub="${key}"]`);
    const isOn = !!state.settings[key];
    if(sub) sub.textContent = isOn ? "On" : "Off";
    if(pill) pill.classList.toggle("active", isOn);
  });
  syncSystemTray();
}

// Mirrors wifi/sound state into the taskbar tray so it's visible even
// without opening the start menu. Called every time syncQuickToggles()
// runs since they should never visually disagree
function syncSystemTray(){
  const wifiEl = document.getElementById("tray-wifi");
  const soundEl = document.getElementById("tray-sound");
  if(wifiEl) wifiEl.textContent = state.settings.wifi ? "📶" : "📵";
  if(soundEl) soundEl.textContent = state.settings.sounds ? "🔊" : "🔇";
}

// If a settings window happen to be open while a quick toggle changes,
// this keeps that window's own toggle buttons in sync
function syncOpenSettingsPanels(){
  state.windows.forEach((win) => {
    if(win.dataset.app === "settings"){
      const content = win.querySelector(".window-content");
      if(content) syncSettingsUI(content);
    }
  });
}

buildStartMenu();
buildRecentList();
buildQuickToggles();

// Shutdown
document.querySelector('[data-action="shutdown"]')?.addEventListener("click", () => {
    startMenu.classList.add("hidden");
    document.body.innerHTML =
      `<div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #000; color: #fff;
        font-size: 24px">Shutting down...</div>`;
    setTimeout(() => location.reload(), 5000);
  });

// ----- Apps Folder Wiring -----------------
function wireAppsFolder(container){
  container.querySelectorAll(".folder-item[data-app]").forEach((item) => {
    item.addEventListener("dblclick", () => openWindow(item.dataset.app));

    item.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const key = item.dataset.app;
      const app = apps[key];
      if(!app) return;

      if(app.locked){
        showContextMenu(e.clientX, e.clientY, [
          { label: "📌 Always pinned", disabled: true },
        ]);
        return;
      }

      const isPinned = state.pinnedApps.has(key);
      showContextMenu(e.clientX, e.clientY, [
        { label: isPinned ? "📌 Unpin from Start" : "📌 Pin to Start", onClick: () => togglePinned(key) },
      ]);
    });
  });
}

// ----- Settings Wiring ---------------------
function wireSettings(container){
  // The template's markup always starts at hardcoded defaults (OFF, teal, etc.)
  // this overwrites that with whatever's actually in state.settings 
  // which may have come from localStorage
  syncSettingsUI(container);

  container.querySelectorAll(".toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const setting = btn.dataset.setting;
      const isActive = btn.classList.toggle("active");
      btn.textContent = isActive ? "ON" : "OFF";
      state.settings[setting] = isActive;
      saveSettings();

      if(setting === "darkmode"){
        document.body.style.filter = isActive ? "invert(1) hue-rotate(180deg)" : "";
      }
      if(setting === "animations"){
        document.documentElement.classList.toggle("no-animations", !isActive);
      }
    });
  });

  container.querySelectorAll(".accent-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".accent-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const color = btn.dataset.accent;
      state.settings.accent = color;
      saveSettings();
      document.documentElement.style.setProperty("--accent", color);
      document.documentElement.style.setProperty("--accent-hover", color);
    });
  });
}

// Makes a freshly opened settings panel match whatever's actually saved 
// instead of always showing the template's hardcoded starting markup

function syncSettingsUI(container){
  container.querySelectorAll(".toggle").forEach((btn) => {
    const isActive = !!state.settings[btn.dataset.setting];
    btn.classList.toggle("active", isActive);
    btn.textContent = isActive ? "ON" : "OFF";
  });

  container.querySelectorAll(".accent-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.accent === state.settings.accent);
  });
}

// ----- Notepad Wiring -------
function wireNotepad(container){
  const textarea = container.querySelector("textarea");
  if(!textarea) return;

  try{
    textarea.value = localStorage.getItem(STORAGE_KEYS.notepad) || "";
  } catch(err){
    console.warn("Couldn't load saved notes.", err);
  }

  // Saving on every keystroke is fine
  textarea.addEventListener("input", () => {
    try{
      localStorage.setItem(STORAGE_KEYS.notepad, textarea.value);
    } catch(err){
      console.warn("Couldn't save notes.", err);
    }
  });
}

// -------- Context Menu ---------------
// Generic right-click menu built fresh each time it's shown
// and torn down on close, can be reused for anything

let activeContextMenu = null;

function showContextMenu(x, y, items){
  closeContextMenu();

  const menu = document.createElement("div");
  menu.className = "context-menu";

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "context-menu-item" + (item.disabled ? " disabled" : "");
    row.textContent = item.label;

    if(!item.disabled){
      row.addEventListener("click", () => {
        item.onClick();
        closeContextMenu();
      });
    }
    menu.appendChild(row);
  });

  document.body.appendChild(menu);

  // Clamp position so the menu can't render partially off-screen
  // same idea as the window-dragging bounds clamp just for a smaller box
  const rect = menu.getBoundingClientRect();
  const clampedX = Math.min(x, window.innerWidth - rect.width - 8);
  const clampedY = Math.min(y, window.innerHeight - rect.height - 8);
  menu.style.left = Math.max(8, clampedX) + "px";
  menu.style.top = Math.max(8, clampedY) + "px";

  activeContextMenu = menu;
}

function closeContextMenu(){
  if(activeContextMenu){
    activeContextMenu.remove();
    activeContextMenu = null;
  }
}

// CLose on a left-click anywhere or Escape. Deliberately NOT closing on every
// right-click globally, that would also suppress the browser's native context
// menu in places like the Notepad textarea where I still want the right-click 
// paste to work normally

document.addEventListener("click", closeContextMenu);
document.addEventListener("keydown", (e) => {
  if(e.key === "Escape") closeContextMenu();
});