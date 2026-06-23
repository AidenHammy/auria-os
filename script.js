// ─── State ───
const state = {
  windows: new Map(),
  nextId: 1,
  activeWindow: null,
  settings: {
    darkmode: false,
    animations: true,
    sounds: false,
    accent: "#4ecdc4",
  },
};

// ─── DOM refs ───
const desktop = document.getElementById("desktop");
const windowLayer = document.getElementById("window-layer");
const taskbarApps = document.getElementById("taskbar-apps");
const startBtn = document.getElementById("start-btn");
const startMenu = document.getElementById("start-menu");
const clockEl = document.getElementById("clock");

// ─── App definitions ───
const apps = {
  browser: { title: "Browser", icon: "🌐", template: "content-browser" },
  terminal: { title: "Terminal", icon: "💻", template: "content-terminal" },
  notepad: { title: "Notepad", icon: "📝", template: "content-notepad" },
  apps: { title: "Apps", icon: "🗂️", template: "app-apps" },
  settings: { title: "Settings", icon: "⚙️", template: "app-settings" },
  calculator: { title: "Calculator", icon: "🧮", template: "content-calculator" },
  moodlamp: { title: "Mood Lamp", icon: "🔮", template: "content-moodlamp" },
  fortune: { title: "Fortune", icon: "🥠", template: "content-fortune" },
};

// ─── Clock ───
function updateClock(){
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
setInterval(updateClock, 1000);
updateClock();

// ─── Start Menu Toggle ───
startBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  startMenu.classList.toggle("hidden");
});

// Close start menu when clicking elsewhere
document.addEventListener("click", (e) => {
  if(!startMenu.contains(e.target) && e.target !== startBtn){
    startMenu.classList.add("hidden");
  }
});

// ─── Open Window ───
function openWindow(appKey){
  const app = apps[appKey];
  if(!app) return;

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

// -- Resizing --
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

// ─── Desktop Icons ───
document.querySelectorAll(".icon[data-app]").forEach((icon) => {
  icon.addEventListener("dblclick", () => openWindow(icon.dataset.app));
});

// ─── Start Menu Items ───
document.querySelectorAll(".start-app[data-app]").forEach((item) => {
  item.addEventListener("click", () => {
    openWindow(item.dataset.app);
    startMenu.classList.add("hidden");
  });
});

// Shutdown
document.querySelector('[data-action="shutdown"]')?.addEventListener("click", () => {
    startMenu.classList.add("hidden");
    document.body.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-size:24px">Shutting down...</div>';
    setTimeout(() => location.reload(), 5000);
  });

// ─── Apps Folder Wiring ───
function wireAppsFolder(container){
  container.querySelectorAll(".folder-item[data-app]").forEach((item) => {
    item.addEventListener("dblclick", () => openWindow(item.dataset.app));
  });
}

// ─── Settings Wiring ───
function wireSettings(container){
  container.querySelectorAll(".toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const setting = btn.dataset.setting;
      const isActive = btn.classList.toggle("active");
      btn.textContent = isActive ? "ON" : "OFF";
      state.settings[setting] = isActive;

      if(setting === "darkmode"){
        document.body.style.filter = isActive ? "invert(1) hue-rotate(180deg)" : "";
      }
    });
  });

  container.querySelectorAll(".accent-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".accent-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const color = btn.dataset.accent;
      state.settings.accent = color;
      document.documentElement.style.setProperty("--accent", color);
      document.documentElement.style.setProperty("--accent-hover", color);
    });
  });
}
