// persistence

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
  accent: "#d1893f",
  // Cosmetic only, no real access to Wi-Fi/Bluetooh
  wifi: true,
  bluetooth: true,
  moodOn: false,
  moodColor: "#d1893f",
  moodIntensity: 0.3
};

function loadSettings(){
  try{
    const saved = localStorage.getItem(STORAGE_KEYS.settings);
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

function applySettings(){
  document.body.style.filter = state.settings.darkmode ? "invert(1) hue-rotate(180deg)" : "";
  document.documentElement.style.setProperty("--accent", state.settings.accent);
  document.documentElement.style.setProperty("--accent-hover", state.settings.accent);
  document.documentElement.classList.toggle("no-animations", !state.settings.animations);
}

function applyMoodLamp(){
  const overlay = document.getElementById("mood-overlay");
  if(!overlay) return;
  overlay.style.background = state.settings.moodColor;
  overlay.style.setProperty("--mood-intensity", state.settings.moodIntensity);
  overlay.classList.toggle("active", state.settings.moodOn);
}

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
    const customPins = [...state.pinnedApps].filter((key) => !apps[key]?.locked);
    localStorage.setItem(STORAGE_KEYS.pinned, JSON.stringify(customPins));
  } catch(err){
    console.warn("Couldn't save pinned apps.", err);
  }
}

// recent apps 

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

// state 
const state = {
  windows: new Map(),
  nextId: 1,
  activeWindow: null,
  settings: loadSettings(),
  pinnedApps: null,
  recentApps: loadRecentApps(),
};

applySettings();
applyMoodLamp();

// dom refs 
const desktop = document.getElementById("desktop");
const windowLayer = document.getElementById("window-layer");
const taskbarApps = document.getElementById("taskbar-apps");
const startBtn = document.getElementById("start-btn");
const startMenu = document.getElementById("start-menu");
const clockEl = document.getElementById("clock");
const taskbarEl = document.getElementById("taskbar");
const clockPopover = document.getElementById("clock-popover");

// app registry
const apps = {
  browser: { title: "Browser", icon: "🌐", template: "content-browser", badge: "#6a8caf" },
  terminal: { title: "Terminal", icon: "💻", template: "content-terminal", locked: true, badge: "#2c2519" },
  notepad: { title: "Notepad", icon: "📝", template: "content-notepad", badge: "#ede4d0" },
  apps: { title: "Apps", icon: "🗂️", template: "app-apps", locked: true, badge: "#d1893f" },
  settings: { title: "Settings", icon: "⚙️", template: "app-settings", locked: true, badge: "#6b6355" },
  calculator: { title: "Calculator", icon: "🧮", template: "content-calculator", badge: "#b8503f" },
  moodlamp: { title: "Mood Lamp", icon: "🔮", template: "content-moodlamp", badge: "linear-gradient(135deg, #d1893f, #b8503f)" },
  fortune: { title: "Fortune", icon: "🥠", template: "content-fortune", badge: "#7a9b5c" },
};

state.pinnedApps = loadPinnedApps();

// locked apps can't be unpinned

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

// clock 
function updateClock() {
  if (!clockEl) return; // Safety net!
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  
  // live-update calendar if open
  
  if (clockPopover && !clockPopover.classList.contains("hidden")) {
    buildClockCalendar();
  }
}

setInterval(updateClock, 1000);
updateClock();

// Clock Calendar Popover

function buildClockCalendar(){
  const weekdayEl = document.getElementById("clock-popover-weekday");
  const daynumEl = document.getElementById("clock-popover-daynum");
  const monthEl = document.getElementById("clock-popover-month");
  const calEl = document.getElementById("clock-popover-calendar");
  if(!weekdayEl || !daynumEl || !monthEl || !calEl) return;
 
  const now = new Date();
  weekdayEl.textContent = now.toLocaleDateString(undefined, {weekday: "long"});
  daynumEl.textContent = now.getDate();
  monthEl.textContent = now.toLocaleDateString(undefined, {month: "long", year: "numeric"});
 
  calEl.innerHTML = "";
  ["S", "M", "T", "W", "T", "F", "S"].forEach((label) => {
    const cell = document.createElement("div");
    cell.className = "clock-cal-weekday";
    cell.textContent = label;
    calEl.appendChild(cell);
  });
 
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
 
  const startOffset = new Date(year, month, 1).getDay(); // 0 = sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
 
  // leading + trailing days to fill the grid
  for(let i = startOffset - 1; i >= 0; i--){
    const cell = document.createElement("div");
    cell.className = "clock-cal-day other-month";
    cell.textContent = daysInPrevMonth - i;
    calEl.appendChild(cell);
  }
 
  for(let d = 1; d <= daysInMonth; d++){
    const cell = document.createElement("div");
    cell.className = "clock-cal-day" + (d === today ? " today" : "");
    cell.textContent = d;
    calEl.appendChild(cell);
  }

  const trailing = (7 - ((startOffset + daysInMonth) % 7)) % 7;
  for(let d = 1; d <= trailing; d++){
    const cell = document.createElement("div");
    cell.className = "clock-cal-day other-month";
    cell.textContent = d;
    calEl.appendChild(cell);
  }
}

function openClockPopover(){
  if (!clockPopover) return;
  buildClockCalendar();
  clockPopover.classList.remove("hidden");
}
 
function closeClockPopover(){
  if (!clockPopover) return;
  clockPopover.classList.add("hidden");
}
 
if (clockEl){
  clockEl.addEventListener("click", (e) => {
    e.stopPropagation();
    if(!startMenu.classList.contains("hidden")) closeStartMenu();
    if(clockPopover.classList.contains("hidden")) openClockPopover();
    else closeClockPopover();
  });
}
 
document.addEventListener("click", (e) => {
  if(!clockPopover) return;
  if(!clockPopover.classList.contains("hidden") && !clockPopover.contains(e.target) && e.target !== clockEl){
    closeClockPopover();
  }
});
 
document.addEventListener("keydown", (e) => {
  if(e.key === "Escape") closeClockPopover();
});

// greeting
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
  if(greetingE1) greetingE1.textContent = `${greeting}, ${USER_NAME}`;

  const dateE1 = document.getElementById("start-greeting-date");
  if(dateE1){
    const weekday = now.toLocaleDateString(undefined, {weekday: "long"});
    const monthDay = now.toLocaleDateString(undefined, {day: "numeric", month: "long"});
    dateE1.innerHTML = `${weekday}<br>${monthDay}`;
  }
}

updateGreeting();

// reset search on close

function resetStartSearch(){
  const input = document.getElementById("start-search-input");
  if(input) input.value = "";
  buildStartMenu();
}

// shared open logic

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

// show desktop
function showDesktop(){
  state.windows.forEach((win, id) => minimizeWindow(id));
}

// shared by taskbar + terminal
function closeAllWindows(){
  const ids = [...state.windows.keys()];
  ids.forEach((id) => closeWindow(id));
  return ids.length;
}

// right-click empty taskbar
[taskbarEl, taskbarApps].forEach((el) => {
  if (!el) return;
  el.addEventListener("contextmenu", (e) => {
    if(e.target !== el) return;
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, [
      { label: "🪟 Show Desktop", onClick: showDesktop },
      { label: "✖ Close All Windows", onClick: closeAllWindows },
      { label: "⚙️ Settings", onClick: () => openWindow("settings") },
    ]);
  });
});

// start menu
if(startBtn) startBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  closeClockPopover();
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

// enter opens first result
document.getElementById("start-search-input")?.addEventListener("keydown", (e) => {
  if(e.key !== "Enter") return;
  const firstTile = document.querySelector(".start-grid .start-app");
  if(firstTile) firstTile.click();
});

// "/" focuses search, esc closes
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

// window management
function openWindow(appKey){
  const app = apps[appKey];
  if(!app) return;

  trackRecentApp(appKey);

  const id = state.nextId++;
  const template = document.getElementById("window-template");
  const win = template.content.cloneNode(true).querySelector(".window");

  win.dataset.id = id;
  win.dataset.app = appKey;
  win.style.left = 40 + ((id * 47) % 220) + "px";
  win.style.top = 25 + ((id * 31) % 120) + "px";
  win.style.zIndex = 1000 + id;

  win.querySelector(".window-title").textContent = app.icon + " " + app.title;

  const contentArea = win.querySelector(".window-content");
  if(app.template){
    const tmpl = document.getElementById(app.template);
    if(tmpl) contentArea.appendChild(tmpl.content.cloneNode(true));
  } 
  else{
    contentArea.innerHTML = app.content;
  }

  win.querySelector(".close").addEventListener("click", () => closeWindow(id));
  win.querySelector(".minimize").addEventListener("click", () => minimizeWindow(id));
  win.querySelector(".maximize").addEventListener("click", () => toggleMaximize(id));

  win.addEventListener("mousedown", () => focusWindow(id));

  // Right-click -> titlebar gets a real menu

  win.addEventListener("contextmenu", (e) => {
    if(["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
    e.preventDefault();
    e.stopPropagation();

    if(e.target.closest(".window-titlebar")){
      const isMax = win.classList.contains("maximized");
      const isPinned = win.dataset.alwaysOnTop === "true";
      showContextMenu(e.clientX, e.clientY, [
        { label: "− Minimize", onClick: () => minimizeWindow(id) },
        { label: isMax ? "□ Restore" : "□ Maximize", onClick: () => toggleMaximize(id) },
        { label: isPinned ? "📌 Always on Top ✓" : "📌 Always on Top", onClick: () => toggleAlwaysOnTop(id) },
        { label: "× Close", onClick: () => closeWindow(id) },
      ]);
    }
  });

  // Making it draggable and resizable
  makeDraggable(win);
  makeResizable(win);

  windowLayer.appendChild(win);
  state.windows.set(id, win);

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
  btn.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isMin = win.classList.contains("minimized");
    showContextMenu(e.clientX, e.clientY, [
      { label: isMin ? "Restore" : "Minimize", onClick: () => (isMin ? restoreWindow(id) : minimizeWindow(id)) },
      { label: "× Close", onClick: () => closeWindow(id) },
    ]);
  });
  taskbarApps.appendChild(btn);

  focusWindow(id);
  startMenu.classList.add("hidden");

  if(appKey === "apps") wireAppsFolder(contentArea);
  if(appKey === "settings") wireSettings(contentArea);
  if(appKey === "notepad") wireNotepad(contentArea);
  if(appKey === "terminal") wireTerminal(contentArea);
  if(appKey === "calculator") wireCalculator(contentArea);
  if(appKey === "moodlamp") wireMoodLamp(contentArea);
  if(appKey === "fortune") wireFortune(contentArea);
  if(appKey === "browser") wireBrowser(contentArea);
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

// two z-index bands: pinned windows stay above normal ones

const NORMAL_Z_BASE = 1000;
const PINNED_Z_BASE = 5000;

function focusWindow(id){
  const win = state.windows.get(id);
  if(!win) return;
 
  const isPinned = win.dataset.alwaysOnTop === "true";
  const base = isPinned ? PINNED_Z_BASE : NORMAL_Z_BASE;

  const sameBand = Array.from(state.windows.values())
    .filter((w) => w !== win && (w.dataset.alwaysOnTop === "true") === isPinned);
  const maxZ = Math.max(base, ...sameBand.map((w) => parseInt(w.style.zIndex) || base));
  win.style.zIndex = maxZ + 1;
  state.activeWindow = win;
 
  document.querySelectorAll(".taskbar-app").forEach((b) => b.classList.remove("active"));
  const btn = taskbarApps.querySelector(`[data-win-id="${id}"]`);
  if(btn) btn.classList.add("active");
}

// Right-click-only feature

function toggleAlwaysOnTop(id){
  const win = state.windows.get(id);
  if(!win) return;
  win.dataset.alwaysOnTop = win.dataset.alwaysOnTop === "true" ? "false" : "true";
  focusWindow(id);
}

function toggleMaximize(id){
  const win = state.windows.get(id);
  if(!win) return;
  delete win.dataset.snapped;
  win.classList.toggle("maximized");
}

// Dragging (with bounds clamping and edge snapping)
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

    // un-snap on drag, keep under cursor

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

  // dblclick to toggle maximize
  titlebar.addEventListener("dblclick", (e) => {
    if(e.target.closest(".window-controls")) return;
    toggleMaximize(parseInt(win.dataset.id));
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

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

  // save pre-snap size

  win.dataset.prevWidth = win.offsetWidth;
  win.dataset.prevHeight = win.offsetHeight;

  const rect = getSnapRect(zone);
  win.style.left = rect.left + "px";
  win.style.top = rect.top + "px";
  win.style.width = rect.width + "px";
  win.style.height = rect.height + "px";
  win.dataset.snapped = zone;
}

// resize
function makeResizable(win){
  const minWidth = 280;
  const minHeight = 180;

  win.querySelectorAll(".resize-handle").forEach((handle) => {
    handle.addEventListener("mousedown", (e) => {
      if(win.classList.contains("maximized")) return;
      e.stopPropagation();
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
      delete win.dataset.snapped;

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

// desktop icons
document.querySelectorAll(".icon[data-app]").forEach((icon) => {
  icon.addEventListener("dblclick", () => openWindow(icon.dataset.app));
  icon.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e.clientX, e.clientY, [
      { label: "Open", onClick: () => openWindow(icon.dataset.app) },
    ]);
  });
});

// right-click empty desktop
if(desktop) desktop.addEventListener("contextmenu", (e) => {
  if (e.target !== desktop && !e.target.classList.contains("desktop-icons"))
    return;
  e.preventDefault();
  showContextMenu(e.clientX, e.clientY, [
    { label: "🎨 Personalize", onClick: () => openWindow("settings") },
    { label: "💻 Open in Terminal", onClick: () => openWindow("terminal") },
    { label: "🔄 Refresh", onClick: () => location.reload() },
  ]);
});

// start menu grid

function buildStartMenu(query=""){
  const grid = document.querySelector(".start-grid");
  if(!grid) return;

  grid.innerHTML = "";

  const trimmed = query.trim().toLowerCase();

  // no query = pinned only, query = full catalog

  const entries = trimmed
  ? Object.entries(apps).filter(([, app]) => app.title.toLowerCase().includes(trimmed))
  : Object.entries(apps).filter(([key]) => state.pinnedApps.has(key));

  // Nothing matched the search
  if(entries.length === 0){
    const empty = document.createElement("div");
    empty.className = "start-grid-empty";
    empty.textContent = "No matches";
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

// recent apps
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
    if(!app) return;

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

// wifi + bluetooth are cosmetic, darkmode + sound are real
const QUICK_TOGGLES = [
  { key: "wifi", icon: "📶", label: "Wi-Fi" },
  { key: "bluetooth", icon: "🔷", label: "Bluetooth" },
  { key: "darkmode", icon: "🌙", label: "Light Mode" },
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

// sync toggle row to state
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

// mirror toggle state to tray
function syncSystemTray(){
  const wifiEl = document.getElementById("tray-wifi");
  const soundEl = document.getElementById("tray-sound");
  if(wifiEl) wifiEl.textContent = state.settings.wifi ? "📶" : "📵";
  if(soundEl) soundEl.textContent = state.settings.sounds ? "🔊" : "🔇";
}

// keep open settings panels in sync
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

// shutdown (also used by terminal)
function shutdownOS(){
  startMenu.classList.add("hidden");
  document.body.innerHTML = 
  `<div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #000; color: #fff;
   font-size: 24px">Shutting down. Be right back.</div>`;
  
  setTimeout(() => location.reload(), 5000);
}

document.querySelector('[data-action="shutdown"]')?.addEventListener("keydown", (e) => {
  if(e.key === "Enter" || e.key === " "){
    e.preventDefault();
    e.target.closest('[data-action="shutdown"]').click();
  }
});

document.querySelector('[data-action="shutdown"]')?.addEventListener("click", shutdownOS);

// apps folder
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

// Settings Wiring 
function wireSettings(container){
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
      syncQuickToggles();
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

// Notepad Wiring
function wireNotepad(container){
  const textarea = container.querySelector("textarea");
  if(!textarea) return;

  try{
    textarea.value = localStorage.getItem(STORAGE_KEYS.notepad) || "";
  } catch(err){
    console.warn("Couldn't load saved notes.", err);
  }

  textarea.addEventListener("input", () => {
    try{
      localStorage.setItem(STORAGE_KEYS.notepad, textarea.value);
    } catch(err){
      console.warn("Couldn't save notes.", err);
    }
  });
}

// Browser wiring
const BROWSER_HOME_SRCDOC = `
  <!DOCTYPE html>
  <html>
    <head>
      <style>
        body{
          margin: 0;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #17140f; 
          color: #ece4d2;
          font-family: 'Plus Jakarta Sans',system-ui,sans-serif;
          text-align: center;
          padding: 24px; 
          box-sizing: border-box
        }

        h1{
          font-size: 18px;
          margin: 0 0 10px
        }
        p {
          font-size: 12px;
          color: #9a8f79;
          max-width: 320px;
          line-height: 1.6;
          margin:0
        }
      </style>
    </head>
    <body>
      <h1>🌐 Browser</h1>
      <p>Type a web address to load it here. A plain search opens in a new tab instead since search engines block being shown
        inside another page but oh well some regular sites do too.
      </p>
    </body>
  </html>
`;

const EMBED_BLOCKLIST = [
  "roblox.com",
  "linkedin.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "google.com",
  "youtube.com",
  "accounts.google.com",
  "github.com",
  "reddit.com",
];

function isLikelyBlocked(url){
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return EMBED_BLOCKLIST.some(d => host === d || host.endsWith("." + d));
  } catch { return false; }
}

function wireBrowser(container){
  const urlInput = container.querySelector(".browser-url");
  const iframe = container.querySelector(".browser-frame");
  const toastEl = container.querySelector("#browser-toast");

  if(!urlInput || !iframe) return;

  let toastTimeout = null;
  let loadTimeout = null;

  function showToast(msg){
    if(!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("visible");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toastEl.classList.remove("visible"), 2800);
  }

  function goHome(){
    if(loadTimeout){ clearTimeout(loadTimeout); loadTimeout = null; }
    iframe.removeAttribute("src");
    iframe.srcdoc = BROWSER_HOME_SRCDOC;
    urlInput.value = "";
  }

  function loadUrl(url){
    if(isLikelyBlocked(url)){
      const ok = window.open(url, "_blank", "noopener,noreferrer");
      if(ok){
        urlInput.value = "";
        showToast("Can't be embedded, opened in new tab");
      } else {
        showToast("Pop-up blocked, allow pop-ups for this site");
      }
      return;
    }

    if(loadTimeout){ clearTimeout(loadTimeout); loadTimeout = null; }

    iframe.removeAttribute("srcdoc");
    iframe.src = url;
    urlInput.value = url;

    let loaded = false;
    loadTimeout = setTimeout(() => {
      if(!loaded){
        iframe.src = "about:blank";
        iframe.srcdoc = BROWSER_HOME_SRCDOC;
        urlInput.value = "";
        const ok = window.open(url, "_blank", "noopener,noreferrer");
        showToast(ok ? "Embed failed, opened in new tab" : "Embed failed and pop-up blocked");
      }
    }, 4000);

    iframe.onload = () => {
      loaded = true;
      if(loadTimeout){ clearTimeout(loadTimeout); loadTimeout = null; }
    };
  }

  function navigate(raw){
    const trimmed = raw.trim();
    if(!trimmed){ goHome(); return; }

    if(/^https?:\/\//i.test(trimmed)) {
      loadUrl(trimmed);
    } else if(/^\S+\.\S+$/.test(trimmed)) {
      loadUrl("https://" + trimmed);
    } else {
      const searchUrl = "https://duckduckgo.com/?q=" + encodeURIComponent(trimmed);
      window.open(searchUrl, "_blank", "noopener,noreferrer");
      urlInput.value = "";
      showToast("Opened search in a new tab");
    }
  }

  container.querySelector('[data-nav="back"]')?.addEventListener("click", () => {
    try{ iframe.contentWindow.history.back(); } catch(err){}
  });

  container.querySelector('[data-nav="forward"]')?.addEventListener("click", () => {
    try{ iframe.contentWindow.history.forward(); } catch(err){}
  });

  container.querySelector('[data-nav="reload"]')?.addEventListener("click", () => {
    if(iframe.getAttribute("src")) iframe.src = iframe.src;
    else iframe.srcdoc = BROWSER_HOME_SRCDOC;
  });

  container.querySelector('[data-nav="home"]')?.addEventListener("click", goHome);

  container.querySelector('[data-nav="go"]')?.addEventListener("click", () => navigate(urlInput.value));

  urlInput.addEventListener("keydown", (e) => {
    if(e.key === "Enter") navigate(urlInput.value);
  });

  goHome();
}

// fortune cookie wiring 
const FORTUNES = [
  "A closed mouth gathers no foot.",
  "The bug you fear most is the one already fixed.",
  "Someone will laugh at your joke tomorrow.",
  "A great idea is currently disguised as a bad one.",
  "Patience is a resource, not a virtue. Spend it wisely.",
  "You will find what you stopped looking for.",
  "The next email you send will be read twice.",
  "Good things come to those who ship.",
  "A small kindness today compounds by Friday.",
  "Your best work happens right after you almost gave up.",
  "The shortest path is rarely the most interesting one.",
  "Someone is grateful for something you don't remember doing.",
  "Tonight's rest will solve tomorrow's problem.",
  "A stranger's advice will be more useful than expected.",
  "The thing you're avoiding is smaller than you think.",
  "Your curiosity will open a door someone else walked past.",
  "Three good decisions are hiding inside one hard one.",
  "The next question you ask matters more than the last answer.",
  "You are exactly one conversation away from good news.",
  "What feels like a delay is actually preparation.",
  "The plan will change. The direction will not.",
  "Someone remembers your kindness longer than you do.",
  "A quiet week precedes a loud one.",
  "You will fix something without realizing you fixed it.",
];
 
function wireFortune(container){
  const cookie = container.querySelector("#fortune-cookie");
  const hint = container.querySelector("#fortune-hint");
  const slip = container.querySelector("#fortune-slip");
  const textEl = container.querySelector("#fortune-text");
  const numbersEl = container.querySelector("#fortune-numbers");
  const againBtn = container.querySelector("#fortune-again");
  if(!cookie || !hint || !slip || !textEl || !numbersEl || !againBtn) return;
 
  let lastIndex = -1;
 
  function pickFortune(){
    let i;
    do{
      i = Math.floor(Math.random() * FORTUNES.length);
    } while(FORTUNES.length > 1 && i === lastIndex);
    lastIndex = i;
    return FORTUNES[i];
  }
 
  // 6 unique numbers like a real slip
  function pickLuckyNumbers(){
    const pool = Array.from({length: 49}, (_, i) => i + 1);
    const picked = [];
    for(let n = 0; n < 6; n++){
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    return picked.sort((a, b) => a - b);
  }
 
  function renderSlip(){
    textEl.textContent = pickFortune();
    numbersEl.innerHTML = "";
    pickLuckyNumbers().forEach((n) => {
      const chip = document.createElement("span");
      chip.className = "fortune-num";
      chip.textContent = n;
      numbersEl.appendChild(chip);
    });
  }
 
  function crack(){
    const isFirstCrack = !cookie.classList.contains("cracked");
    cookie.classList.add("cracked");
    hint.classList.add("hidden");
    againBtn.classList.remove("hidden");
 
    if(isFirstCrack){
      slip.classList.remove("hidden");
      renderSlip();
      requestAnimationFrame(() => slip.classList.add("visible"));
    } else{
      // fade transition on re-crack
      slip.classList.remove("visible");
      setTimeout(() => {
        renderSlip();
        slip.classList.add("visible");
      }, 150);
    }
  }
 
  cookie.addEventListener("click", () => {
    if(!cookie.classList.contains("cracked")) crack();
  });
  cookie.addEventListener("keydown", (e) => {
    if((e.key === "Enter" || e.key === " ") && !cookie.classList.contains("cracked")){
      e.preventDefault();
      crack();
    }
  });
  againBtn.addEventListener("click", crack);
}

// immediate execution, like a real calculator
function wireCalculator(container){
  const valueEl = container.querySelector("#calc-value");
  const subEl = container.querySelector("#calc-sub");
  const winEl = container.closest(".window");
  if(!valueEl || !subEl) return;
 
  let current = "0";
  let previous = null;
  let operator = null;
  let overwrite = true; // overwrite = next digit replaces display
 
  // kills float noise (0.1 + 0.2 = 0.3 not 0.30000000000000004)
  function formatNum(n){
    return Number(n.toPrecision(12)).toString();
  }
 
  function updateDisplay(){
    valueEl.textContent = current;
    subEl.textContent = (previous !== null && operator) ? `${formatNum(previous)} ${operator}` : "";
  }
 
  function inputDigit(d){
    if(current === "Error") clearAll();
    if(overwrite || current === "0"){
      current = d === "." ? "0." : d;
      overwrite = false;
    } else{
      if(d === "." && current.includes(".")) return;
      current += d;
    }
    updateDisplay();
  }
 
  function clearAll(){
    current = "0";
    previous = null;
    operator = null;
    overwrite = true;
    updateDisplay();
  }
 
  function backspace(){
    if(overwrite) return;
    current = current.slice(0, -1);
    if(current === "" || current === "-") current = "0";
    if(current === "0") overwrite = true;
    updateDisplay();
  }
 
  function percent(){
    current = formatNum(parseFloat(current) / 100);
    updateDisplay();
  }
 
  function compute(a, op, b){
    switch(op){
      case "+": return a + b;
      case "−": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? NaN : a / b;
      default: return b;
    }
  }
 
  function chooseOperator(op){
    if(current === "Error") return;
    const value = parseFloat(current);
    if(previous !== null && operator && !overwrite){
      const result = compute(previous, operator, value);
      if(Number.isNaN(result)){
        current = "Error";
        previous = null;
        operator = null;
        overwrite = true;
        updateDisplay();
        return;
      }
      previous = result;
      current = formatNum(result);
    } else{
      previous = value;
    }
    operator = op;
    overwrite = true;
    updateDisplay();
  }
 
  function equals(){
    if(operator === null || previous === null || current === "Error") return;
    const result = compute(previous, operator, parseFloat(current));
    current = Number.isNaN(result) ? "Error" : formatNum(result);
    previous = null;
    operator = null;
    overwrite = true;
    updateDisplay();
  }
 
  container.querySelectorAll(".calc-btn[data-digit]").forEach((btn) => {
    btn.addEventListener("click", () => inputDigit(btn.dataset.digit));
  });
  container.querySelectorAll(".calc-btn[data-op]").forEach((btn) => {
    btn.addEventListener("click", () => chooseOperator(btn.dataset.op));
  });
  container.querySelector('[data-action="decimal"]')?.addEventListener("click", () => inputDigit("."));
  container.querySelector('[data-action="clear"]')?.addEventListener("click", clearAll);
  container.querySelector('[data-action="backspace"]')?.addEventListener("click", backspace);
  container.querySelector('[data-action="percent"]')?.addEventListener("click", percent);
  container.querySelector('[data-action="equals"]')?.addEventListener("click", equals);
 
  // keyboard works only when this calc is focused
  const KEY_OPS = {"+": "+", "-": "−", "*": "×", "/": "÷"};
  function handleKey(e){
    if(!document.body.contains(winEl)){
      document.removeEventListener("keydown", handleKey);
      return;
    }
    if(state.activeWindow !== winEl) return;
 
    if(/^[0-9]$/.test(e.key)) inputDigit(e.key);
    else if(e.key === ".") inputDigit(".");
    else if(KEY_OPS[e.key]) chooseOperator(KEY_OPS[e.key]);
    else if(e.key === "Enter" || e.key === "=" ){ e.preventDefault(); equals(); }
    else if(e.key === "Backspace") backspace();
    else if(e.key === "Escape") clearAll();
  }
  document.addEventListener("keydown", handleKey);
 
  updateDisplay();
}

// global setting, survives window close

function wireMoodLamp(container){
  const toggleBtn = container.querySelector("#mood-toggle");
  const colorInput = container.querySelector("#mood-color-input");
  const intensityInput = container.querySelector("#mood-intensity-input");
  if(!toggleBtn || !colorInput || !intensityInput) return;
 
  function syncUI(){
    toggleBtn.classList.toggle("active", state.settings.moodOn);
    toggleBtn.textContent = state.settings.moodOn ? "ON" : "OFF";
    colorInput.value = state.settings.moodColor;
    intensityInput.value = Math.round(state.settings.moodIntensity * 100);
    container.querySelectorAll(".mood-preset").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.color === state.settings.moodColor);
    });
  }
 
  toggleBtn.addEventListener("click", () => {
    state.settings.moodOn = !state.settings.moodOn;
    saveSettings();
    applyMoodLamp();
    syncUI();
  });
 
  container.querySelectorAll(".mood-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.settings.moodColor = btn.dataset.color;
      state.settings.moodOn = true;
      saveSettings();
      applyMoodLamp();
      syncUI();
    });
  });
 
  colorInput.addEventListener("input", () => {
    state.settings.moodColor = colorInput.value;
    state.settings.moodOn = true;
    saveSettings();
    applyMoodLamp();
    syncUI();
  });
 
  intensityInput.addEventListener("input", () => {
    state.settings.moodIntensity = intensityInput.value / 100;
    saveSettings();
    applyMoodLamp();
  });
 
  syncUI();
}

// terminal
// shared on/off handler
function toggleBooleanSetting(key, arg, label = key){
  if(arg !== "on" && arg!== "off") return `Usage: ${label} <on/off>`;
  state.settings[key] = arg === "on";
  saveSettings();
  if(key === "darkmode") applySettings(); // real visual effect
  syncQuickToggles();
  syncOpenSettingsPanels();
  return `${label} turned ${arg}`;
}

const TERMINAL_COMMANDS = {
  help(){
    return [
      "Available commands:",
      "  help                 show this list",
      "  clear                clear the screen",
      "  date                 show the current date and time",
      "  whoami               show the current user",
      "  echo <text>          print text back",
      "  ls                   list installed apps",
      "  open <app>           launch an app by name",
      "  pin <app>            pin an app to the start menu",
      "  unpin <app>          unpin an app from the start menu",
      "  theme <#hex>         change the accent color",
      "  lightmode <on/off>   toggle light mode",
      "  sound <on/off>       toggle the sound settings",
      "  wifi <on/off>        toggle wifi (cosmetic)",
      "  bluetooth <on/off>   toggle bluetooth (cosmetic)",
      "  history              show command history",
      "  closeall             close every open window",
      "  shutdown             shut down AuriaOS"
    ];
  },

  clear(){
    return{clear: true}
  },

  date(){
    return new Date().toString();
  },

  whoami(){
    return USER_NAME;
  },

  echo(args){
    return args.join(" ") || "";
  },

  ls(){
    return Object.entries(apps).map(([key, app]) => `${app.icon}  ${key.padEnd(12)} ${app.title}`);
  },

  open(args){
    const key = args[0];
    if(!key) return "Usage: open <app>";
    if(!apps[key]) return `open: app not found: ${key}`;
    openWindow(key);
    return `Opening ${apps[key].title}...`; 
  },

  pin(args){
    const key = args[0];
    if(!key) return "Usage: pin <app>";
    if(!apps[key]) return `pin: app not found ${key}`;
    if(apps[key].locked) return `${apps[key].title} is already always pinned.`;
    if(state.pinnedApps.has(key)) return `${apps[key].title} is already pinned.`;
    togglePinned(key);
    return `Pinned ${apps[key].title}.`;
  },

  unpin(args){
    const key = args[0];
    if(!key) return "Usage unpin <app>";
    if(!apps[key]) return `unpin: app not found: ${key}`;
    if(apps[key].locked) return `${apps[key].title} can't be unpinned, it's a default app.`;
    if(!state.pinnedApps.has(key)) return `${apps[key].title} isn't pinned.`;
    togglePinned(key);
    return `Unpinned ${apps[key].title}.`;
  },

  theme(args){
    const color = args[0];
    if(!color || !/^#[0-9a-fA-F]{3,8}$/.test(color)) return "Usage: theme <#hexcolor>";
    state.settings.accent = color;
    saveSettings();
    document.documentElement.style.setProperty("--accent", color);
    document.documentElement.style.setProperty("--accent-hover", color);
    return `Accent color set to ${color}.`;
  },

  lightmode(args){
    return toggleBooleanSetting("darkmode", args[0], "lightmode");
  },

  sound(args){
    return toggleBooleanSetting("sounds", args[0]);
  },

  wifi(args){
    return toggleBooleanSetting("wifi", args[0]);
  },

  bluetooth(args){
    return toggleBooleanSetting("bluetooth", args[0]);
  },

  closeall(){
    const count = closeAllWindows();
    return `Closed ${count} window(s).`;
  },
  
  shutdown(){
    shutdownOS();
    return "Shutting down...";
  }
};

function wireTerminal(container){
  const output = container.querySelector(".terminal-output");
  const input = container.querySelector(".terminal-input");
  if(!output || !input) return;

  const history = [];
  let historyIndex = -1;

  function printLine(text, className=""){
    const line = document.createElement("div");
    line.className = "terminal-line" + (className ? " " + className : "");
    line.textContent = text;
    output.appendChild(line);
  }

  function printCommandLine(command){
    const line = document.createElement("div");
    line.className = "terminal-line command";
    line.innerHTML = `<span class="terminal-prompt-inline">user@auriaos:~$</span>${command}`;
    output.appendChild(line);
  }

  function scrollToBottom(){
    output.scrollTop = output.scrollHeight;
  }

  function runCommand(raw){
    const trimmed = raw.trim();
    if(!trimmed) return;

    printCommandLine(trimmed);
    history.push(trimmed);
    historyIndex = history.length;

    const [cmdRaw, ...args] = trimmed.split(/\s+/);
    const cmd = cmdRaw.toLowerCase();

    // history lives in the closure, not TERMINAL_COMMANDS
    
    if(cmd === "history"){
      if(history.length === 0) printLine("No commands yet.");
      else history.forEach((h, i) => printLine(`${i + 1}  ${h}`));
      scrollToBottom();
      return;
    }

    const handler = TERMINAL_COMMANDS[cmd];
    if(!handler){
      printLine(`command not found: ${cmd}`, "error");
      scrollToBottom();
      return;
    }

    const result = handler(args);
    if(result && result.clear){
      output.innerHTML = "";
      return;
    }
    if(Array.isArray(result)) result.forEach((line) => printLine(line));
    else if(result) printLine(String(result));

    scrollToBottom();
  }

  input.addEventListener("keydown", (e) => {
    if(e.key === "Enter"){
      runCommand(input.value);
      input.value = "";
    }
    else if(e.key === "ArrowUp"){
      e.preventDefault();
      if(history.length === 0) return;
      historyIndex = Math.max(0, historyIndex - 1);
      input.value = history[historyIndex] || "";
    }
    else if(e.key === "ArrowDown"){
      e.preventDefault();
      if(history.length === 0) return;
      historyIndex = Math.min(history.length, historyIndex + 1);
      input.value = history[historyIndex] || "";
    }
  });

  // refocus unless selecting text
  container.addEventListener("click", () => {
    if(window.getSelection().toString() === "") input.focus();
  });

  printLine("auriaos terminal. type 'help' if you get stuck.");
  input.focus();
}

// context menu

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

// close on click/esc, not on right-click (let native menu work in textareas)

document.addEventListener("click", closeContextMenu);
document.addEventListener("keydown", (e) => {
  if(e.key === "Escape") closeContextMenu();
});