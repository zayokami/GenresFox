// script.js

// ==================== Custom Select Module ====================
const CustomSelect = (function() {
    'use strict';

    let _initialized = false;

    /**
     * Initialize custom select dropdowns
     * @param {string} selector - CSS selector for selects to convert
     */
    function init(selector = '.modal select') {
        const selects = document.querySelectorAll(selector);
        selects.forEach(select => {
            // For language selector, set the correct initial value before converting
            if (select.id === 'languageSelect') {
                const savedLang = localStorage.getItem('preferredLanguage') || 
                                  (navigator.language.startsWith("zh") ? "zh" : "en");
                select.value = savedLang;
            }
            _createCustomSelect(select);
        });

        // Only add global listeners once
        if (!_initialized) {
            document.addEventListener('click', _handleOutsideClick);
            document.addEventListener('keydown', _handleKeyboardNav);
            _initialized = true;
        }
    }

    /**
     * Create a custom select component from a native select
     * @param {HTMLSelectElement} nativeSelect
     */
    function _createCustomSelect(nativeSelect) {
        // Skip if already converted
        if (nativeSelect.parentElement.classList.contains('custom-select')) {
            return;
        }

        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select';
        wrapper.setAttribute('data-select-id', nativeSelect.id);

        // Create trigger button
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'custom-select-trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');

        // Create options container
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-select-options';
        optionsContainer.setAttribute('role', 'listbox');
        optionsContainer.setAttribute('data-for', nativeSelect.id);

        // Build options from native select
        Array.from(nativeSelect.options).forEach((option) => {
            const customOption = document.createElement('div');
            customOption.className = 'custom-select-option';
            customOption.setAttribute('role', 'option');
            customOption.setAttribute('data-value', option.value);
            customOption.setAttribute('tabindex', '-1');
            
            // Copy i18n attribute if exists
            const i18nKey = option.getAttribute('data-i18n');
            if (i18nKey) {
                customOption.setAttribute('data-i18n', i18nKey);
            }
            
            customOption.textContent = option.textContent;

            if (option.selected) {
                customOption.classList.add('selected');
                customOption.setAttribute('aria-selected', 'true');
                trigger.textContent = option.textContent;
            }

            customOption.addEventListener('click', (e) => {
                e.stopPropagation();
                _selectOption(wrapper, customOption);
            });

            optionsContainer.appendChild(customOption);
        });

        // Insert wrapper and move native select inside
        nativeSelect.parentNode.insertBefore(wrapper, nativeSelect);
        wrapper.appendChild(trigger);
        wrapper.appendChild(optionsContainer);
        wrapper.appendChild(nativeSelect);

        // Bind trigger click
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            _toggleDropdown(wrapper);
        });

        // Store reference for syncing
        wrapper._nativeSelect = nativeSelect;
    }

    /**
     * Toggle dropdown open/close
     */
    function _toggleDropdown(wrapper) {
        const isOpen = wrapper.classList.contains('open');
        
        // Close all other dropdowns first
        document.querySelectorAll('.custom-select.open').forEach(el => {
            if (el !== wrapper) {
                _closeDropdown(el);
            }
        });

        if (!isOpen) {
            _openDropdown(wrapper);
        } else {
            _closeDropdown(wrapper);
        }
    }

    /**
     * Open a dropdown
     */
    function _openDropdown(wrapper) {
        const trigger = wrapper.querySelector('.custom-select-trigger');
        const options = wrapper.querySelector('.custom-select-options');
        
        if (!trigger || !options) return;
        
        wrapper.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');

        // Move options to body and position with fixed
        document.body.appendChild(options);
        const rect = trigger.getBoundingClientRect();
        options.style.position = 'fixed';
        options.style.top = `${rect.bottom + 4}px`;
        options.style.left = `${rect.left}px`;
        options.style.width = `${rect.width}px`;

        // Focus selected option
        const selectedOption = options.querySelector('.custom-select-option.selected') ||
                               options.querySelector('.custom-select-option');
        if (selectedOption) {
            setTimeout(() => selectedOption.focus(), 50);
        }
    }

    /**
     * Close a dropdown
     */
    function _closeDropdown(wrapper) {
        const trigger = wrapper.querySelector('.custom-select-trigger');
        const options = document.querySelector(`.custom-select-options[data-for="${wrapper.getAttribute('data-select-id')}"]`) ||
                        wrapper.querySelector('.custom-select-options');
        
        wrapper.classList.remove('open');
        if (trigger) {
            trigger.setAttribute('aria-expanded', 'false');
        }
        
        // Move options back to wrapper
        if (options && options.parentNode === document.body) {
            wrapper.appendChild(options);
            options.style.position = '';
            options.style.top = '';
            options.style.left = '';
            options.style.width = '';
        }
    }

    /**
     * Select an option
     */
    function _selectOption(wrapper, option) {
        const value = option.getAttribute('data-value');
        const text = option.textContent;
        const nativeSelect = wrapper._nativeSelect;

        nativeSelect.value = value;

        // Trigger change event
        const event = new Event('change', { bubbles: true });
        nativeSelect.dispatchEvent(event);

        // Call inline onchange if exists
        if (nativeSelect.onchange) {
            nativeSelect.onchange(event);
        }

        // Update UI
        const trigger = wrapper.querySelector('.custom-select-trigger');
        trigger.textContent = text;

        // Find options container (might be in body or wrapper)
        const selectId = wrapper.getAttribute('data-select-id');
        const optionsContainer = document.querySelector(`.custom-select-options[data-for="${selectId}"]`);
        if (optionsContainer) {
            optionsContainer.querySelectorAll('.custom-select-option').forEach(opt => {
                opt.classList.remove('selected');
                opt.setAttribute('aria-selected', 'false');
            });
        }
        option.classList.add('selected');
        option.setAttribute('aria-selected', 'true');

        // Close dropdown
        _closeDropdown(wrapper);
        trigger.focus();
    }

    /**
     * Handle clicks outside dropdowns
     */
    function _handleOutsideClick(e) {
        if (!e.target.closest('.custom-select') && !e.target.closest('.custom-select-options')) {
            document.querySelectorAll('.custom-select.open').forEach(el => {
                _closeDropdown(el);
            });
        }
    }

    /**
     * Handle keyboard navigation
     */
    function _handleKeyboardNav(e) {
        const openDropdown = document.querySelector('.custom-select.open');
        if (!openDropdown) return;

        // Find options container (might be in body)
        const selectId = openDropdown.getAttribute('data-select-id');
        const optionsContainer = document.querySelector(`.custom-select-options[data-for="${selectId}"]`);
        if (!optionsContainer) return;

        const options = Array.from(optionsContainer.querySelectorAll('.custom-select-option'));
        const currentIndex = options.findIndex(opt => opt === document.activeElement);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                options[(currentIndex + 1) % options.length].focus();
                break;
            case 'ArrowUp':
                e.preventDefault();
                options[currentIndex > 0 ? currentIndex - 1 : options.length - 1].focus();
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (document.activeElement.classList.contains('custom-select-option')) {
                    _selectOption(openDropdown, document.activeElement);
                }
                break;
            case 'Escape':
                e.preventDefault();
                _closeDropdown(openDropdown);
                openDropdown.querySelector('.custom-select-trigger').focus();
                break;
            case 'Tab':
                _closeDropdown(openDropdown);
                break;
        }
    }

    /**
     * Sync custom select with native select value
     * @param {HTMLSelectElement} nativeSelect
     */
    function sync(nativeSelect) {
        const wrapper = nativeSelect.closest('.custom-select');
        if (!wrapper) return;

        const value = nativeSelect.value;
        const trigger = wrapper.querySelector('.custom-select-trigger');
        const options = wrapper.querySelectorAll('.custom-select-option');

        options.forEach(opt => {
            const isSelected = opt.getAttribute('data-value') === value;
            opt.classList.toggle('selected', isSelected);
            opt.setAttribute('aria-selected', isSelected ? 'true' : 'false');
            if (isSelected) {
                trigger.textContent = opt.textContent;
            }
        });
    }

    return {
        init,
        sync
    };
})();

// Expose globally
window.CustomSelect = CustomSelect;

// Elements
const searchInput = document.getElementById("search");
const enginesList = document.getElementById("enginesList");
const shortcutsList = document.getElementById("shortcutsList");
const shortcutsGrid = document.getElementById("shortcuts");
const settingsBtn = document.querySelector(".settings-btn");
const settingsModal = document.getElementById("settingsModal");
const closeSettings = document.querySelector(".close-btn");
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");
const addEngineBtn = document.getElementById("addEngineBtn");
const addShortcutBtn = document.getElementById("addShortcutBtn");
const engineSelector = document.querySelector(".engine-selector");
const selectedEngineIcon = document.querySelector(".selected-engine");
const engineDropdown = document.querySelector(".engine-dropdown");

// Default Data
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

const defaultShortcuts = [
    { name: "GitHub", url: "https://github.com", icon: "https://github.com/favicon.ico" },
    { name: "YouTube", url: "https://youtube.com", icon: "https://www.youtube.com/favicon.ico" },
    { name: "Bilibili", url: "https://bilibili.com", icon: "https://www.bilibili.com/favicon.ico" },
    { name: "Gmail", url: "https://mail.google.com", icon: "https://mail.google.com/favicon.ico" }
];

// State
let engines = JSON.parse(localStorage.getItem("engines")) || defaultEngines;
let currentEngine = localStorage.getItem("preferredEngine") || "google";
let shortcuts = JSON.parse(localStorage.getItem("shortcuts"));

if (!shortcuts || shortcuts.length === 0) {
    shortcuts = defaultShortcuts;
    localStorage.setItem("shortcuts", JSON.stringify(shortcuts));
}

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

        const spanInfo = document.createElement("span");
        spanInfo.innerHTML = `<img src="${getIconSrc(key, engine.icon)}" width="20" height="20"> ${engine.name}`;
        div.appendChild(spanInfo);

        if (!defaultEngines[key]) {
            const deleteBtn = document.createElement("span");
            deleteBtn.className = "delete-btn";
            deleteBtn.innerHTML = "&times;";
            deleteBtn.addEventListener("click", () => deleteEngine(key));
            div.appendChild(deleteBtn);
        }

        enginesList.appendChild(div);
    });
}

function renderShortcutsList() {
    shortcutsList.innerHTML = '';
    shortcuts.forEach((shortcut, index) => {
        const div = document.createElement("div");
        div.className = "list-item";

        const spanInfo = document.createElement("span");
        spanInfo.innerHTML = `<img src="${shortcut.icon}" width="20" height="20"> ${shortcut.name}`;
        div.appendChild(spanInfo);

        const deleteBtn = document.createElement("span");
        deleteBtn.className = "delete-btn";
        deleteBtn.innerHTML = "&times;";
        deleteBtn.addEventListener("click", () => deleteShortcut(index));
        div.appendChild(deleteBtn);

        shortcutsList.appendChild(div);
    });
}

function renderShortcutsGrid() {
    shortcutsGrid.innerHTML = '';
    shortcuts.forEach(shortcut => {
        const a = document.createElement("a");
        a.href = shortcut.url;
        a.className = "shortcut-item";

        const iconDiv = document.createElement("div");
        iconDiv.className = "shortcut-icon loading"; // Add loading class for skeleton

        const img = document.createElement("img");
        img.alt = shortcut.name;
        img.src = shortcut.icon;

        // Remove loading class when image loads or fails
        img.onload = () => iconDiv.classList.remove("loading");
        img.onerror = () => {
            iconDiv.classList.remove("loading");
            // Use a fallback icon (first letter of name)
            img.style.display = 'none';
            iconDiv.textContent = shortcut.name.charAt(0).toUpperCase();
            iconDiv.style.fontSize = '18px';
            iconDiv.style.fontWeight = '600';
        };

        iconDiv.appendChild(img);

        const nameDiv = document.createElement("div");
        nameDiv.className = "shortcut-name";
        nameDiv.textContent = shortcut.name;

        a.appendChild(iconDiv);
        a.appendChild(nameDiv);
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

// Expose setEngine and engines globally for keyboard shortcuts
window.setEngine = setEngine;
window.engines = engines;

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

// Reset Shortcuts
const resetShortcutsBtn = document.getElementById("resetShortcutsBtn");
if (resetShortcutsBtn) {
    resetShortcutsBtn.addEventListener("click", () => {
        if (confirm("Reset shortcuts to default?")) {
            shortcuts = JSON.parse(JSON.stringify(defaultShortcuts)); // Deep copy
            saveShortcuts();
        }
    });
}

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
        "tabAccessibility": "无障碍",
        "tabAbout": "关于",
        "uploadWallpaper": "上传壁纸",
        "resetWallpaper": "恢复默认",
        "customEngines": "自定义搜索引擎",
        "shortcuts": "快捷方式",
        "add": "添加",
        "dragDropText": "拖拽图片到此处或点击上传",
        "wallpaperSettings": "壁纸设置",
        "blurAmount": "模糊程度",
        "vignetteAmount": "暗角程度",
        "resetShortcuts": "重置快捷方式",
        "searchBoxSettings": "搜索框设置",
        "searchBoxWidth": "宽度",
        "searchBoxPosition": "垂直位置",
        "livePreview": "实时预览",
        // Accessibility
        "a11yDisplay": "显示",
        "a11yTheme": "主题",
        "a11yThemeStandard": "标准",
        "a11yThemeHCDark": "高对比度 (深色)",
        "a11yThemeHCLight": "高对比度 (浅色)",
        "a11yThemeYellowBlack": "黄底黑字",
        "a11yFontSize": "字体大小",
        "a11yFontFamily": "字体",
        "a11yFontDefault": "默认",
        "a11yFontSans": "无衬线",
        "a11yFontSerif": "衬线",
        "a11yFontDyslexic": "阅读障碍友好",
        "a11yLineSpacing": "行间距",
        "a11ySpacingNormal": "正常",
        "a11ySpacingRelaxed": "宽松",
        "a11ySpacingVeryRelaxed": "很宽松",
        "a11yMotion": "动画",
        "a11yAnimations": "动画效果",
        "a11yMotionFull": "完整",
        "a11yMotionReduced": "减少",
        "a11yMotionNone": "无",
        "a11yFocus": "焦点",
        "a11yFocusIndicator": "焦点指示器",
        "a11yFocusStandard": "标准",
        "a11yFocusEnhanced": "增强",
        "a11yFocusLarge": "大型",
        "a11yReset": "恢复默认设置",
        "aboutDescription": "一个完全开源、极简、高度可定制的新标签页扩展。",
        "aboutOpenSource": "GenresFox-NEWTAB 是一个开源项目，你可以在 GitHub 上找到源代码！",
        "viewOnGitHub": "在 GitHub 上查看",
        "languageLabel": "语言"
    },
    "en": {
        "appTitle": "GenresFox-NEWTAB",
        "searchPlaceholder": "Search...",
        "settingsTitle": "Settings",
        "tabWallpaper": "Wallpaper",
        "tabSearch": "Search & Shortcuts",
        "tabAccessibility": "Accessibility",
        "tabAbout": "About",
        "uploadWallpaper": "Upload Wallpaper",
        "resetWallpaper": "Reset to Default",
        "customEngines": "Custom Search Engines",
        "shortcuts": "Shortcuts",
        "add": "Add",
        "dragDropText": "Drag & Drop image here or click to upload",
        "wallpaperSettings": "Wallpaper Settings",
        "blurAmount": "Blur Amount",
        "vignetteAmount": "Vignette Amount",
        "resetShortcuts": "Reset Shortcuts",
        "searchBoxSettings": "Search Box Settings",
        "searchBoxWidth": "Width",
        "searchBoxPosition": "Vertical Position",
        "livePreview": "Live Preview",
        // Accessibility
        "a11yDisplay": "Display",
        "a11yTheme": "Theme",
        "a11yThemeStandard": "Standard",
        "a11yThemeHCDark": "High Contrast (Dark)",
        "a11yThemeHCLight": "High Contrast (Light)",
        "a11yThemeYellowBlack": "Yellow on Black",
        "a11yFontSize": "Font Size",
        "a11yFontFamily": "Font Family",
        "a11yFontDefault": "Default",
        "a11yFontSans": "Sans-serif",
        "a11yFontSerif": "Serif",
        "a11yFontDyslexic": "OpenDyslexic",
        "a11yLineSpacing": "Line Spacing",
        "a11ySpacingNormal": "Normal",
        "a11ySpacingRelaxed": "Relaxed",
        "a11ySpacingVeryRelaxed": "Very Relaxed",
        "a11yMotion": "Motion",
        "a11yAnimations": "Animations",
        "a11yMotionFull": "Full",
        "a11yMotionReduced": "Reduced",
        "a11yMotionNone": "None",
        "a11yFocus": "Focus",
        "a11yFocusIndicator": "Focus Indicator",
        "a11yFocusStandard": "Standard",
        "a11yFocusEnhanced": "Enhanced",
        "a11yFocusLarge": "Large",
        "a11yReset": "Reset to Defaults",
        "aboutDescription": "A fully open-source, extremely clean, and highly customizable new tab page extension.",
        "aboutOpenSource": "GenresFox-NEWTAB is an open-source project. You can find the source code on GitHub!",
        "viewOnGitHub": "View on GitHub",
        "languageLabel": "Language"
    }
};

// Language management
let currentLanguage = localStorage.getItem('preferredLanguage') || 
                      (navigator.language.startsWith("zh") ? "zh" : "en");

function localize(lang = null) {
    if (lang) {
        currentLanguage = lang;
        localStorage.setItem('preferredLanguage', lang);
    }
    
    const fallback = fallbackMessages[currentLanguage] || fallbackMessages['en'];

    if (typeof chrome !== 'undefined' && chrome.i18n && !localStorage.getItem('preferredLanguage')) {
        // Use Chrome's i18n only if user hasn't manually set a language
        document.querySelectorAll('[data-i18n]').forEach(elem => {
            let msg = chrome.i18n.getMessage(elem.dataset.i18n);
            if (!msg && fallback && fallback[elem.dataset.i18n]) {
                msg = fallback[elem.dataset.i18n];
            }
            if (msg) elem.textContent = msg;
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(elem => {
            let msg = chrome.i18n.getMessage(elem.dataset.i18nPlaceholder);
            if (!msg && fallback && fallback[elem.dataset.i18nPlaceholder]) {
                msg = fallback[elem.dataset.i18nPlaceholder];
            }
            if (msg) elem.placeholder = msg;
        });
        return;
    }

    // Use fallback messages with selected language
    const messages = fallbackMessages[currentLanguage] || fallbackMessages['en'];
    document.querySelectorAll('[data-i18n]').forEach(elem => {
        const key = elem.dataset.i18n;
        if (messages[key]) elem.textContent = messages[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(elem => {
        const key = elem.dataset.i18nPlaceholder;
        if (messages[key]) elem.placeholder = messages[key];
    });

    // Update HTML lang attribute
    document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : 'en';
    
    // Update language selector if exists
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) {
        langSelect.value = currentLanguage;
        // Sync custom select if it exists
        if (typeof CustomSelect !== 'undefined') {
            CustomSelect.sync(langSelect);
        }
    }
}

function setLanguage(lang) {
    localize(lang);
    
    // Re-initialize custom selects to update their text
    if (typeof CustomSelect !== 'undefined') {
        // Need to rebuild custom selects with new language
        document.querySelectorAll('.custom-select').forEach(el => {
            const nativeSelect = el.querySelector('select');
            if (nativeSelect) {
                const wrapper = nativeSelect.closest('.custom-select');
                if (wrapper) {
                    // Remove custom select wrapper, keep native select
                    const parent = wrapper.parentNode;
                    parent.insertBefore(nativeSelect, wrapper);
                    wrapper.remove();
                }
            }
        });
        // Re-init custom selects
        CustomSelect.init('#tab-accessibility select, #tab-about select');
    }
}

// Expose for global use
window.setLanguage = setLanguage;
window.currentLanguage = currentLanguage;

// Init
async function init() {
    // Initialize Accessibility Manager first (applies theme/font settings early)
    if (typeof AccessibilityManager !== 'undefined') {
        AccessibilityManager.init();
    }

    // Initialize Wallpaper Manager
    if (typeof WallpaperManager !== 'undefined') {
        await WallpaperManager.init();
    }

    // Ensure shortcuts exist (Double check)
    if (!shortcuts || shortcuts.length === 0) {
        shortcuts = JSON.parse(JSON.stringify(defaultShortcuts));
        saveShortcuts();
    }

    localize();
    
    // Initialize custom selects after i18n is applied
    if (typeof CustomSelect !== 'undefined') {
        CustomSelect.init('#tab-accessibility select, #tab-about select');
    }
    
    updateUI();
    renderEnginesList();
    renderShortcutsList();
    renderShortcutsGrid();
    searchInput.addEventListener("keydown", handleSearch);

    // Ensure focus (autofocus attribute handles initial, this is backup)
    searchInput.focus();
}

// Focus immediately before any async operations
searchInput.focus();

// ==================== Ripple Effect ====================

/**
 * Create ripple effect on click
 * @param {MouseEvent} e - Click event
 */
function createRipple(e) {
    const element = e.currentTarget;
    
    // Remove any existing ripples
    const existingRipple = element.querySelector('.ripple');
    if (existingRipple) {
        existingRipple.remove();
    }

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    
    element.appendChild(ripple);
    
    // Remove ripple after animation
    ripple.addEventListener('animationend', () => {
        ripple.remove();
    });
}

/**
 * Initialize ripple effects on interactive elements
 */
function initRippleEffects() {
    const rippleSelectors = [
        '.btn-primary',
        '.btn-secondary',
        '.btn-danger',
        '.tab-btn',
        '.settings-btn',
        '.selected-engine',
        '.engine-option',
        '.github-btn',
        '.shortcut-icon'
    ];

    rippleSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
            // Avoid adding multiple listeners
            if (!element.dataset.rippleInit) {
                element.addEventListener('click', createRipple);
                element.dataset.rippleInit = 'true';
            }
        });
    });
}

// Initialize ripple effects after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initRippleEffects();
    
    // Re-init ripples when dynamic content is added
    const observer = new MutationObserver(() => {
        initRippleEffects();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});

// Expose for global use
window.initRippleEffects = initRippleEffects;

// Then run full init
init();
