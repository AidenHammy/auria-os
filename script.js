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
  browser: {title: "Browser", icon: '', template: 'content-browser'},
  terminal: {title: "Terminal", icon: '', template: 'content-terminal'},
  notepad: {title: "Notepad", icon: '', template: 'content-notepad'},
  apps: {title: "Apps", icon: '', template: 'app-apps'},
  settings: {title: "Settings", icon: '', template: 'app-settings'},
  calculator: {title: "Calculator", icon: '', template: 'content-calculator'},
  moodlamp: {title: "Mood Lamp", icon: '', template: 'content-moodlamp'},
  fortune: {title: "Fortune", icon: '', template: 'content-fortune'}
};

// ─── Clock ───
function updateClock() {
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
  if (!startMenu.contains(e.target) && e.target !== startBtn) {
    startMenu.classList.add("hidden");
  }
});

// ─── Open Window ───
function openWindow(appKey) {
  const app = apps[appKey];
  if (!app) return;

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
  if (app.template) {
    const tmpl = document.getElementById(app.template);
    if (tmpl) contentArea.appendChild(tmpl.content.cloneNode(true));
  } else {
    contentArea.innerHTML = app.content;
  }

  // Window controls
  win.querySelector(".close").addEventListener("click", () => closeWindow(id));
  win
    .querySelector(".minimize")
    .addEventListener("click", () => minimizeWindow(id));
  win
    .querySelector(".maximize")
    .addEventListener("click", () => toggleMaximize(id));

  // Focus on click
  win.addEventListener("mousedown", () => focusWindow(id));

  // Make draggable
  makeDraggable(win);

  // Add to layer
  windowLayer.appendChild(win);
  state.windows.set(id, win);

  // Add taskbar button
  const btn = document.createElement("div");
  btn.className = "taskbar-app";
  btn.dataset.winId = id;
  btn.innerHTML = `<span>${app.icon}</span><span>${app.title}</span>`;
  btn.addEventListener("click", () => {
    if (win.classList.contains("minimized")) {
      restoreWindow(id);
    } else if (state.activeWindow === win) {
      minimizeWindow(id);
    } else {
      focusWindow(id);
    }
  });
  taskbarApps.appendChild(btn);

  focusWindow(id);
  startMenu.classList.add("hidden");

  // Wire up app-specific interactions
  if (appKey === "apps") wireAppsFolder(contentArea);
  if (appKey === "settings") wireSettings(contentArea);
}

function closeWindow(id) {
  const win = state.windows.get(id);
  if (!win) return;
  win.remove();
  state.windows.delete(id);

  const btn = taskbarApps.querySelector(`[data-win-id="${id}"]`);
  if (btn) btn.remove();

  if (state.activeWindow === win) {
    state.activeWindow = null;
    const remaining = Array.from(state.windows.values());
    if (remaining.length)
      focusWindow(parseInt(remaining[remaining.length - 1].dataset.id));
  }
}

function minimizeWindow(id) {
  const win = state.windows.get(id);
  if (!win) return;
  win.classList.add("minimized");

  const btn = taskbarApps.querySelector(`[data-win-id="${id}"]`);
  if (btn) btn.classList.remove("active");

  if (state.activeWindow === win) state.activeWindow = null;
}

function restoreWindow(id) {
  const win = state.windows.get(id);
  if (!win) return;
  win.classList.remove("minimized");
  focusWindow(id);
}

function focusWindow(id) {
  const win = state.windows.get(id);
  if (!win) return;

  const maxZ = Math.max(
    ...Array.from(state.windows.values()).map(
      (w) => parseInt(w.style.zIndex) || 0,
    ),
  );
  win.style.zIndex = maxZ + 1;
  state.activeWindow = win;

  document
    .querySelectorAll(".taskbar-app")
    .forEach((b) => b.classList.remove("active"));
  const btn = taskbarApps.querySelector(`[data-win-id="${id}"]`);
  if (btn) btn.classList.add("active");
}

function toggleMaximize(id) {
  const win = state.windows.get(id);
  if (!win) return;
  win.classList.toggle("maximized");
}

// ─── Dragging ───
function makeDraggable(win) {
  const titlebar = win.querySelector(".window-titlebar");
  let isDragging = false;
  let startX, startY, startLeft, startTop;

  titlebar.addEventListener("mousedown", (e) => {
    if (win.classList.contains("maximized")) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = win.offsetLeft;
    startTop = win.offsetTop;
    win.style.transition = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    win.style.left = startLeft + dx + "px";
    win.style.top = startTop + dy + "px";
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      win.style.transition = "";
    }
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
    setTimeout(() => location.reload(), 2000);
  });

// ─── Apps Folder Wiring ───
function wireAppsFolder(container) {
  container.querySelectorAll(".folder-item[data-app]").forEach((item) => {
    item.addEventListener("dblclick", () => openWindow(item.dataset.app));
  });
}

// ─── Settings Wiring ───
function wireSettings(container) {
  container.querySelectorAll(".toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const setting = btn.dataset.setting;
      const isActive = btn.classList.toggle("active");
      btn.textContent = isActive ? "ON" : "OFF";
      state.settings[setting] = isActive;

      if (setting === "darkmode") {
        document.body.style.filter = isActive
          ? "invert(1) hue-rotate(180deg)"
          : "";
      }
    });
  });

  container.querySelectorAll(".accent-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      container
        .querySelectorAll(".accent-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const color = btn.dataset.accent;
      document.documentElement.style.setProperty("--accent", color);
      document.documentElement.style.setProperty("--accent-hover", color);
    });
  });
}
