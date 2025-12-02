// DOM Elements
const searchInput = document.getElementById("search");
const engineSelector = document.getElementById("engineSelector");
const selectedEngineIcon = document.getElementById("selectedEngineIcon");
const engineDropdown = document.getElementById("engineDropdown");

// Settings Elements
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const closeSettings = document.getElementById("closeSettings");
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");
const wallpaperUpload = document.getElementById("wallpaperUpload");
const resetWallpaper = document.getElementById("resetWallpaper");
const enginesList = document.getElementById("enginesList");
const addEngineBtn = document.getElementById("addEngineBtn");
const shortcutsList = document.getElementById("shortcutsList");
const addShortcutBtn = document.getElementById("addShortcutBtn");
const shortcutsGrid = document.getElementById("shortcuts");

// Default Configuration
const defaultEngines = {
    google: {
        name: "Google",
        url: "https://www.google.com/search?q=%s",
        icon: "https://www.google.com/favicon.ico"
    },
    bing: {
        name: "Bing",
        url: "https://www.bing.com/search?q=%s",
        icon: "https://www.bing.com/favicon.ico"
    },
    duckduckgo: {
        name: "DuckDuckGo",
        url: "https://duckduckgo.com/?q=%s",
        icon: "https://duckduckgo.com/favicon.ico"
    }
};

// State
let engines = JSON.parse(localStorage.getItem("engines")) || defaultEngines;
let currentEngine = localStorage.getItem("preferredEngine") || "google";
let shortcuts = JSON.parse(localStorage.getItem("shortcuts")) || [];

// --- Helper Functions ---
function saveEngines() {
    localStorage.setItem("engines", JSON.stringify(engines));
    renderEnginesList();
    renderEngineDropdown();
}

function saveShortcuts() {
    localStorage.setItem("shortcuts", JSON.stringify(shortcuts));
    renderShortcutsList();
    renderShortcutsGrid();
}

function getFavicon(url) {
    try {
        const domain = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch (e) {
        return "icon.png";
    }
}

// --- Icon Caching Logic ---
async function cacheIcon(key, url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
            localStorage.setItem(`icon_cache_${key}`, reader.result);
            updateUI();
        };
        reader.readAsDataURL(blob);
    } catch (error) {
        console.warn(`Failed to cache icon for ${key}`, error);
    }
}

function getIconSrc(key, url) {
    const cached = localStorage.getItem(`icon_cache_${key}`);
    if (cached) return cached;
    cacheIcon(key, url);
    return url;
}

// --- UI Rendering ---
function updateUI() {
    // Update selected engine icon
    const engine = engines[currentEngine] || engines.google;
    const src = getIconSrc(currentEngine, engine.icon);
    selectedEngineIcon.innerHTML = `<img src="${src}" alt="${engine.name}" width="20" height="20">`;

    renderEngineDropdown();
}

function renderEngineDropdown() {
    engineDropdown.innerHTML = '';
    Object.keys(engines).forEach(key => {
        const engine = engines[key];
        const div = document.createElement("div");
        div.className = "engine-option";
        div.dataset.engine = key;
        div.innerHTML = `
            <img src="${getIconSrc(key, engine.icon)}" width="20" height="20">
            <span>${engine.name}</span>
        `;
        div.addEventListener("click", () => setEngine(key));
        engineDropdown.appendChild(div);
    });
}

function renderEnginesList() {
    enginesList.innerHTML = '';
    Object.keys(engines).forEach(key => {
        const engine = engines[key];
        const div = document.createElement("div");
        div.className = "list-item";
        div.innerHTML = `
            <span><img src="${getIconSrc(key, engine.icon)}" width="20" height="20"> ${engine.name}</span>
            ${!defaultEngines[key] ? `<span class="delete-btn" onclick="deleteEngine('${key}')">&times;</span>` : ''}
        `;
        enginesList.appendChild(div);
    });
}

function renderShortcutsList() {
    shortcutsList.innerHTML = '';
    shortcuts.forEach((shortcut, index) => {
        const div = document.createElement("div");
        div.className = "list-item";
        div.innerHTML = `
            <span><img src="${shortcut.icon}" width="20" height="20"> ${shortcut.name}</span>
            <span class="delete-btn" onclick="deleteShortcut(${index})">&times;</span>
        `;
        shortcutsList.appendChild(div);
    });
}

function renderShortcutsGrid() {
    shortcutsGrid.innerHTML = '';
    shortcuts.forEach(shortcut => {
        const a = document.createElement("a");
        a.href = shortcut.url;
        a.className = "shortcut-item";
        a.innerHTML = `
            <div class="shortcut-icon">
                <img src="${shortcut.icon}" alt="${shortcut.name}">
            </div>
            <div class="shortcut-name">${shortcut.name}</div>
        `;
        shortcutsGrid.appendChild(a);
    });
}

// --- Actions ---
function setEngine(key) {
    if (!engines[key]) return;
    currentEngine = key;
    localStorage.setItem("preferredEngine", key);
    updateUI();
    engineSelector.classList.remove("active");
}

window.deleteEngine = (key) => {
    if (defaultEngines[key]) return;
    delete engines[key];
    if (currentEngine === key) setEngine("google");
    saveEngines();
};

window.deleteShortcut = (index) => {
    shortcuts.splice(index, 1);
    saveShortcuts();
};

// --- Event Listeners ---

// Settings Modal
settingsBtn.addEventListener("click", () => settingsModal.classList.add("active"));
closeSettings.addEventListener("click", () => settingsModal.classList.remove("active"));
settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) settingsModal.classList.remove("active");
});

// Tabs
tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        tabContents.forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    });
});

// Wallpaper
const dropZone = document.getElementById("dropZone");

function handleFile(file) {
    if (file) {
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            alert("Image too large (max 2MB)");
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target.result;
            localStorage.setItem("wallpaper", base64);
            document.body.style.backgroundImage = `url(${base64})`;
        };
        reader.readAsDataURL(file);
    }
}

// Click to upload
dropZone.addEventListener("click", () => wallpaperUpload.click());

// File input change
wallpaperUpload.addEventListener("change", (e) => {
    handleFile(e.target.files[0]);
});

// Drag & Drop
dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    handleFile(e.dataTransfer.files[0]);
});

resetWallpaper.addEventListener("click", () => {
    localStorage.removeItem("wallpaper");
    document.body.style.backgroundImage = "";
});

// Add Engine
addEngineBtn.addEventListener("click", () => {
    const name = document.getElementById("newEngineName").value.trim();
    let url = document.getElementById("newEngineUrl").value.trim();
    if (name && url) {
        const key = name.toLowerCase().replace(/\s+/g, '_');
        let icon = "icon.png";
        try {
            const cleanUrl = url.replace('%s', '').replace(/=$/, '');
            const domain = new URL(cleanUrl).hostname;
            icon = `https://${domain}/favicon.ico`;
        } catch (e) { }

        engines[key] = { name, url, icon };
        saveEngines();
        document.getElementById("newEngineName").value = "";
        document.getElementById("newEngineUrl").value = "";
    }
});

// Add Shortcut
addShortcutBtn.addEventListener("click", () => {
    const name = document.getElementById("newShortcutName").value.trim();
    let url = document.getElementById("newShortcutUrl").value.trim();
    if (name && url) {
        if (!/^http(s)?:\/\//i.test(url)) url = "https://" + url;
        const icon = getFavicon(url);
        shortcuts.push({ name, url, icon });
        saveShortcuts();
        document.getElementById("newShortcutName").value = "";
        document.getElementById("newShortcutUrl").value = "";
    }
});

// Search Logic
function handleSearch(e) {
    if (e.key === "Enter") {
        let val = searchInput.value.trim();
        if (!val) return;
        const isUrl = /^(http(s)?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- ./?%&=]*)?$/i.test(val);
        if (isUrl) {
            if (!/^http(s)?:\/\//i.test(val)) val = "https://" + val;
            location.href = val;
        } else {
            const engine = engines[currentEngine];
            let searchUrl = engine.url;
            if (searchUrl.includes("%s")) {
                searchUrl = searchUrl.replace("%s", encodeURIComponent(val));
            } else {
                searchUrl += encodeURIComponent(val);
            }
            location.href = searchUrl;
        }
    }
}

// Engine Selector Toggle
selectedEngineIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    engineSelector.classList.toggle("active");
});
document.addEventListener("click", (e) => {
    if (!engineSelector.contains(e.target)) engineSelector.classList.remove("active");
});

// Localization Fallback
const fallbackMessages = {
    "zh": {
        "appTitle": "GenresFox-NEWTAB",
        "searchPlaceholder": "搜索...",
        "settingsTitle": "设置",
        "tabWallpaper": "壁纸",
        "tabSearch": "搜索与快捷方式",
        "tabAbout": "关于",
        "uploadWallpaper": "上传壁纸",
        "resetWallpaper": "恢复默认",
        "customEngines": "自定义搜索引擎",
        "shortcuts": "快捷方式",
        "add": "添加",
        "dragDropText": "拖拽图片到此处或点击上传"
    },
    "en": {
        "appTitle": "GenresFox-NEWTAB",
        "searchPlaceholder": "Search...",
        "settingsTitle": "Settings",
        "tabWallpaper": "Wallpaper",
        "tabSearch": "Search & Shortcuts",
        "tabAbout": "About",
        "uploadWallpaper": "Upload Wallpaper",
        "resetWallpaper": "Reset to Default",
        "customEngines": "Custom Search Engines",
        "shortcuts": "Shortcuts",
        "add": "Add",
        "dragDropText": "Drag & Drop image here or click to upload"
    }
};

function localize() {
    if (typeof chrome !== 'undefined' && chrome.i18n) {
        document.querySelectorAll('[data-i18n]').forEach(elem => {
            const msg = chrome.i18n.getMessage(elem.dataset.i18n);
            if (msg) elem.textContent = msg;
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(elem => {
            const msg = chrome.i18n.getMessage(elem.dataset.i18nPlaceholder);
            if (msg) elem.placeholder = msg;
        });
        return;
    }

    const lang = navigator.language.startsWith("zh") ? "zh" : "en";
    const messages = fallbackMessages[lang];

    document.querySelectorAll('[data-i18n]').forEach(elem => {
        const key = elem.dataset.i18n;
        if (messages[key]) elem.textContent = messages[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(elem => {
        const key = elem.dataset.i18nPlaceholder;
        if (messages[key]) elem.placeholder = messages[key];
    });
}

// Init
const savedWallpaper = localStorage.getItem("wallpaper");
if (savedWallpaper) {
    document.body.style.backgroundImage = `url(${savedWallpaper})`;
}

localize();
updateUI();
renderEnginesList();
renderShortcutsList();
renderShortcutsGrid();
searchInput.addEventListener("keydown", handleSearch);
searchInput.focus();
