// script.js

// ==================== Global Error Handling & Protection ====================
(function() {
    'use strict';
    
    // Global error handler for uncaught errors
    window.addEventListener('error', (event) => {
        // Log error but don't break the page
        console.error('[Global Error Handler]', event.error || event.message, event);
        
        // If error is related to i18n, attempt recovery
        if (event.message && (
            event.message.includes('i18n') || 
            event.message.includes('I18n') ||
            event.message.includes('localize') ||
            event.message.includes('getMessage')
        )) {
            console.warn('[Global Error Handler] I18n-related error detected, attempting recovery');
            try {
                if (typeof I18n !== 'undefined' && I18n.localize) {
                    setTimeout(() => I18n.localize(), 100);
                }
            } catch (e) {
                console.error('[Global Error Handler] Recovery failed:', e);
            }
        }
        
        // Prevent default error handling from breaking the page
        // Don't return false to allow normal error logging
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('[Global Error Handler] Unhandled promise rejection:', event.reason);
        // Prevent default handling
        event.preventDefault();
    });
    
    // Monitor for critical element removal
    if (document.body) {
        const bodyObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.removedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        const isCritical = node.matches && (
                            node.matches('body') ||
                            node.matches('.container') ||
                            node.matches('.search-container')
                        );
                        if (isCritical) {
                            console.error('[Global Error Handler] Critical element was removed from DOM!', node);
                            // Attempt to restore if it's body
                            if (node.matches('body') && !document.body) {
                                document.documentElement.appendChild(node);
                            }
                        }
                    }
                });
            });
        });
        
        bodyObserver.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }
})();

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
        
        wrapper.classList.remove('open');
        if (trigger) {
            trigger.setAttribute('aria-expanded', 'false');
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

        // Update selected state
        wrapper.querySelectorAll('.custom-select-option').forEach(opt => {
            opt.classList.remove('selected');
            opt.setAttribute('aria-selected', 'false');
        });
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

        const options = Array.from(openDropdown.querySelectorAll('.custom-select-option'));
        if (options.length === 0) return;
        
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
const closeSettings = document.getElementById("closeSettings");
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");
const addEngineBtn = document.getElementById("addEngineBtn");
const addShortcutBtn = document.getElementById("addShortcutBtn");
const engineSelector = document.querySelector(".engine-selector");
const selectedEngineIcon = document.querySelector(".selected-engine");
const engineDropdown = document.querySelector(".engine-dropdown");
const shortcutOpenCurrent = document.getElementById("shortcutOpenCurrent");
const shortcutOpenNewTab = document.getElementById("shortcutOpenNewTab");

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
    },
    yandex: {
        name: "Yandex",
        url: "https://yandex.com/search/?text=%s",
        icon: "https://yandex.com/favicon.ico"
    },
    yahoojapan: {
        name: "Yahoo Japan",
        url: "https://search.yahoo.co.jp/search?p=%s",
        icon: "https://www.yahoo.co.jp/favicon.ico"
    }
};

// Default shortcuts are now in ShortcutManager
// Keep for backward compatibility
const defaultShortcuts = [
    { name: "GitHub", url: "https://github.com", icon: "https://github.com/favicon.ico" },
    { name: "YouTube", url: "https://youtube.com", icon: "https://www.youtube.com/favicon.ico" },
    { name: "Bilibili", url: "https://bilibili.com", icon: "https://bilibili.com/favicon.ico" },
    { name: "Gmail", url: "https://mail.google.com", icon: "https://icons.duckduckgo.com/ip3/mail.google.com.ico" }
];

// State - with safe JSON parsing to handle corrupted data
let engines;
try {
    engines = JSON.parse(localStorage.getItem("engines")) || defaultEngines;
} catch (e) {
    console.warn('Failed to parse engines from localStorage, using defaults');
    engines = defaultEngines;
}

let currentEngine = localStorage.getItem("preferredEngine") || "google";

const FOLDER_FEATURE_ENABLED = false; // Temporarily disable folder feature
const SHORTCUT_TARGET_KEY = 'shortcutOpenTarget';

// Image helpers are now in ShortcutManager
const _decorateImg = (typeof ShortcutManager !== 'undefined' && ShortcutManager._decorateImg)
    ? ShortcutManager._decorateImg
    : function(img) {
        if (!img) return;
        img.referrerPolicy = 'no-referrer';
        img.decoding = 'async';
        img.loading = 'eager';
    };

// Shortcuts are now managed by ShortcutManager
// Helper function to get shortcuts array (for backward compatibility)
function getShortcuts() {
    if (typeof ShortcutManager !== 'undefined' && ShortcutManager.getAll) {
        return ShortcutManager.getAll();
    }
    return shortcuts || [];
}

// Keep shortcuts variable for backward compatibility during migration
let shortcuts = [];

// Folder helpers
function _isFolder(item) {
    return item && item.type === 'folder' && Array.isArray(item.items);
}

function _createFolderName() {
    const base = (window.I18n && I18n.t) ? I18n.t('folderDefault', 'Folder') : 'Folder';
    const ts = Date.now().toString().slice(-3);
    return `${base} ${ts}`;
}

function _ensureShortcutId(item) {
    if (!item.id) {
        item.id = `shortcut_${Math.random().toString(36).slice(2, 8)}`;
    }
    return item;
}

// --- Helper Functions ---
function saveEngines() {
    localStorage.setItem("engines", JSON.stringify(engines));
    renderEnginesList();
    renderEngineDropdown();
}

// Shortcut management functions are now in ShortcutManager
function saveShortcuts() {
    // Sync shortcuts variable for backward compatibility
    if (typeof ShortcutManager !== 'undefined' && ShortcutManager.getAll) {
        shortcuts = ShortcutManager.getAll();
    }
    
    if (typeof ShortcutManager !== 'undefined') {
        // ShortcutManager handles saving internally, but we need to trigger rendering
        if (ShortcutManager.renderShortcutsList) {
            ShortcutManager.renderShortcutsList();
        }
        if (ShortcutManager.renderShortcutsGrid) {
            ShortcutManager.renderShortcutsGrid(
                handleShortcutDragStart,
                handleShortcutDragEnd,
                handleShortcutDragOver,
                handleShortcutDrop,
                handleShortcutDragLeave,
                openFolderOverlay
            );
        }
    }
}

// Icon management functions are now in ShortcutManager
const getFavicon = (typeof ShortcutManager !== 'undefined' && ShortcutManager.getFavicon) 
    ? ShortcutManager.getFavicon 
    : function(url) {
        try {
            const urlObj = new URL(url);
            return `${urlObj.origin}/favicon.ico`;
        } catch (e) {
            return "icon.png";
        }
    };

// Icon management code has been moved to ShortcutManager
// The following functions are now available via ShortcutManager:
// - getIconSrc(key, url, pageUrl)
// - cacheIcon(key, rawIconUrl, pageUrl)
// - getFavicon(url)

// Alias for backward compatibility
const getIconSrc = (typeof ShortcutManager !== 'undefined' && ShortcutManager.getIconSrc)
    ? ShortcutManager.getIconSrc
    : function(key, url, pageUrl) {
        return url || (pageUrl ? getFavicon(pageUrl) : null) || "icon.png";
    };

const cacheIcon = (typeof ShortcutManager !== 'undefined' && ShortcutManager.cacheIcon)
    ? ShortcutManager.cacheIcon
    : function(key, rawIconUrl, pageUrl) {
        // Fallback: do nothing if ShortcutManager not available
        return Promise.resolve();
    };

// Remove old icon management code (moved to ShortcutManager)
// Keeping this comment block to mark where code was removed
/* Icon management code removed - see shortcut-manager.js */

// --- UI Rendering ---
function _updateSearchActionWidth() {
    if (!searchActionBtn || !searchActionLabel) return;
    
    // Temporarily show label to measure its actual width
    const originalMaxWidth = searchActionLabel.style.maxWidth;
    const originalOpacity = searchActionLabel.style.opacity;
    const originalVisibility = searchActionLabel.style.visibility;
    
    // Make label visible for measurement
    searchActionLabel.style.maxWidth = 'none';
    searchActionLabel.style.opacity = '1';
    searchActionLabel.style.visibility = 'hidden'; // Hidden but still measurable
    searchActionLabel.style.position = 'absolute';
    searchActionLabel.style.whiteSpace = 'nowrap';
    
    // Measure the actual width
    const labelWidth = searchActionLabel.scrollWidth || searchActionLabel.offsetWidth;
    
    // Restore original styles
    searchActionLabel.style.maxWidth = originalMaxWidth;
    searchActionLabel.style.opacity = originalOpacity;
    searchActionLabel.style.visibility = originalVisibility;
    searchActionLabel.style.position = '';
    
        // Calculate expanded width: icon (16px) + gap (8px) + label + padding (32px total)
        // Expanded = icon(16) + gap(8) + labelWidth + padding(32) = 56 + labelWidth
        const iconWidth = 16;
        const gap = 8;
        const paddingTotal = 32; // 16px left + 16px right
        const minExpanded = 120; // Minimum expanded width for short texts
        const expanded = Math.max(iconWidth + gap + labelWidth + paddingTotal, minExpanded);
    
    searchActionBtn.style.setProperty('--search-action-expand', `${expanded}px`);
}

function updateUI() {
    // Update selected engine icon
    const engine = engines[currentEngine] || engines.google;
    const src = getIconSrc(currentEngine, engine.icon);
    selectedEngineIcon.textContent = '';
    const img = document.createElement('img');
    img.src = src;
    img.alt = engine.name;
    img.width = 20;
    img.height = 20;
    _decorateImg(img);
    img.onerror = () => {
        img.onerror = null;
        img.src = 'icon.png';
    };
    img.dataset.cacheKey = currentEngine; // For updating after cache completes
    selectedEngineIcon.appendChild(img);

    renderEngineDropdown();
}

function renderEngineDropdown() {
    engineDropdown.innerHTML = '';
    Object.keys(engines).forEach(key => {
        const engine = engines[key];
        const div = document.createElement("div");
        div.className = "engine-option";
        div.dataset.engine = key;
        
        const img = document.createElement('img');
        img.src = getIconSrc(key, engine.icon);
        img.width = 20;
        img.height = 20;
        _decorateImg(img);
        img.onerror = () => {
            img.onerror = null;
            img.src = 'icon.png';
        };
        img.dataset.cacheKey = key; // For updating after cache completes
        
        const span = document.createElement('span');
        span.textContent = engine.name;
        
        div.appendChild(img);
        div.appendChild(span);
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
        const img = document.createElement('img');
        img.src = getIconSrc(key, engine.icon);
        img.width = 20;
        img.height = 20;
        _decorateImg(img);
        img.onerror = () => {
            img.onerror = null;
            img.src = 'icon.png';
        };
        spanInfo.appendChild(img);
        spanInfo.appendChild(document.createTextNode(' ' + engine.name));
        div.appendChild(spanInfo);

        if (!defaultEngines[key]) {
            const deleteBtn = document.createElement("span");
            deleteBtn.className = "delete-btn";
            deleteBtn.textContent = '\u00D7'; // multiplication sign
            deleteBtn.addEventListener("click", () => deleteEngine(key));
            div.appendChild(deleteBtn);
        }

        enginesList.appendChild(div);
    });
}

// Shortcut rendering functions are now in ShortcutManager
function renderShortcutsList() {
    if (typeof ShortcutManager !== 'undefined' && ShortcutManager.renderShortcutsList) {
        ShortcutManager.renderShortcutsList();
    }
}

// Shortcut rendering functions are now in ShortcutManager
function renderShortcutsGrid() {
    if (typeof ShortcutManager !== 'undefined' && ShortcutManager.renderShortcutsGrid) {
        ShortcutManager.renderShortcutsGrid(
            handleShortcutDragStart,
            handleShortcutDragEnd,
            handleShortcutDragOver,
            handleShortcutDrop,
            handleShortcutDragLeave,
            openFolderOverlay
        );
    }
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

// Shortcut deletion is now handled by ShortcutManager
window.deleteShortcut = (index, options = {}) => {
    if (typeof ShortcutManager !== 'undefined' && ShortcutManager.delete) {
        if (ShortcutManager.delete(index, options)) {
            // ShortcutManager handles saving and rendering internally
            return;
        }
    }
    // Fallback for backward compatibility
    if (shortcuts && shortcuts[index]) {
        shortcuts.splice(index, 1);
        saveShortcuts();
    }
};

// --- Event Listeners ---

// Settings Modal
settingsBtn.addEventListener("click", () => {
    settingsModal.classList.add("active");
    // Sync snow effect toggle state when opening settings
    _updateSnowToggleVisibility();
});
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
        // Update snow toggle visibility when switching tabs
        _updateSnowToggleVisibility();
    });
});

// Reset Shortcuts
const resetShortcutsBtn = document.getElementById("resetShortcutsBtn");
if (resetShortcutsBtn) {
    resetShortcutsBtn.addEventListener("click", () => {
        if (confirm("Reset shortcuts to default?")) {
            if (typeof ShortcutManager !== 'undefined' && ShortcutManager.reset) {
                ShortcutManager.reset();
                shortcuts = ShortcutManager.getAll();
            } else {
                shortcuts = JSON.parse(JSON.stringify(defaultShortcuts)); // Deep copy
            }
            saveShortcuts();
        }
    });
}

// ==================== Export Configuration ====================
/**
 * Collect all user configuration data
 * @returns {Object} Configuration data object
 */
function _collectConfigurationData() {
    const configData = {
        settings: {}
    };

    // Search engines
    configData.settings.engines = engines;
    configData.settings.preferredEngine = currentEngine;

    // Shortcuts
    configData.settings.shortcuts = getShortcuts();
    const showNames = localStorage.getItem('showShortcutNames');
    if (showNames !== null) {
        configData.settings.showShortcutNames = showNames === 'true';
    }
    const shortcutTarget = localStorage.getItem(SHORTCUT_TARGET_KEY);
    if (shortcutTarget) {
        configData.settings.shortcutOpenTarget = shortcutTarget;
    }

    // Shortcut settings
    if (typeof ShortcutManager !== 'undefined' && ShortcutManager.getShortcutSettings) {
        configData.settings.shortcutSettings = ShortcutManager.getShortcutSettings();
    } else {
        const shortcutSettings = localStorage.getItem('shortcutSettings');
        if (shortcutSettings) {
            try {
                configData.settings.shortcutSettings = JSON.parse(shortcutSettings);
            } catch (e) {
                console.warn('Failed to parse shortcutSettings:', e);
            }
        }
    }

    // Shortcut settings
    if (typeof ShortcutManager !== 'undefined' && ShortcutManager.getShortcutSettings) {
        configData.settings.shortcutSettings = ShortcutManager.getShortcutSettings();
    } else {
        const shortcutSettings = localStorage.getItem('shortcutSettings');
        if (shortcutSettings) {
            try {
                configData.settings.shortcutSettings = JSON.parse(shortcutSettings);
            } catch (e) {
                console.warn('Failed to parse shortcutSettings:', e);
            }
        }
    }

    // Wallpaper settings
    const wallpaperSettings = localStorage.getItem('wallpaperSettings');
    if (wallpaperSettings) {
        try {
            configData.settings.wallpaperSettings = JSON.parse(wallpaperSettings);
        } catch (e) {
            console.warn('Failed to parse wallpaperSettings:', e);
        }
    }
    const wallpaperSource = localStorage.getItem('wallpaperSource');
    if (wallpaperSource) {
        configData.settings.wallpaperSource = wallpaperSource;
    }
    const bingMarket = localStorage.getItem('bingMarket');
    if (bingMarket) {
        configData.settings.bingMarket = bingMarket;
    }

    // Search box settings
    const searchBoxSettings = localStorage.getItem('searchBoxSettings');
    if (searchBoxSettings) {
        try {
            configData.settings.searchBoxSettings = JSON.parse(searchBoxSettings);
        } catch (e) {
            console.warn('Failed to parse searchBoxSettings:', e);
        }
    }

    // Theme settings
    const themeSettings = localStorage.getItem('themeSettings');
    if (themeSettings) {
        try {
            configData.settings.themeSettings = JSON.parse(themeSettings);
        } catch (e) {
            console.warn('Failed to parse themeSettings:', e);
        }
    }

    // Accessibility settings
    const accessibilitySettings = localStorage.getItem('accessibilitySettings');
    if (accessibilitySettings) {
        try {
            configData.settings.accessibilitySettings = JSON.parse(accessibilitySettings);
        } catch (e) {
            console.warn('Failed to parse accessibilitySettings:', e);
        }
    }

    // Language preference
    const preferredLanguage = localStorage.getItem('preferredLanguage');
    if (preferredLanguage) {
        configData.settings.preferredLanguage = preferredLanguage;
    }

    // Snow effect
    const snowEffectEnabled = localStorage.getItem('snowEffectEnabled');
    if (snowEffectEnabled !== null) {
        configData.settings.snowEffectEnabled = snowEffectEnabled === 'true';
    }
    const snowEffectTriggered = localStorage.getItem('snowEffectTriggered');
    if (snowEffectTriggered !== null) {
        configData.settings.snowEffectTriggered = snowEffectTriggered === 'true';
    }

    return configData;
}

/**
 * Export all user configuration to a JSON file with integrity verification
 */
async function exportConfiguration() {
    try {
        if (typeof ConfigManager === 'undefined' || !ConfigManager.exportToFile) {
            throw new Error('ConfigManager not available');
        }

        const configData = _collectConfigurationData();
        await ConfigManager.exportToFile(configData);

        // Show success message
        const message = I18n && I18n.t ? I18n.t('exportConfigSuccess', 'Configuration exported successfully!') : 'Configuration exported successfully!';
        alert(message);
    } catch (e) {
        console.error('Failed to export configuration:', e);
        const errorMessage = I18n && I18n.t ? I18n.t('exportConfigError', 'Failed to export configuration.') : 'Failed to export configuration.';
        alert(errorMessage);
    }
}

// Export Configuration Button
const exportConfigBtn = document.getElementById('exportConfigBtn');
if (exportConfigBtn) {
    exportConfigBtn.addEventListener('click', exportConfiguration);
}

// ==================== Import Configuration ====================
/**
 * Apply imported configuration to the system
 * @param {Object} config - Verified configuration object
 */
function _applyImportedConfiguration(config) {
    if (!config || !config.settings) {
        throw new Error('Invalid configuration structure');
    }

    const settings = config.settings;

    // Apply search engines
    if (settings.engines && typeof settings.engines === 'object') {
        engines = settings.engines;
        localStorage.setItem('engines', JSON.stringify(engines));
        renderEnginesList();
        renderEngineDropdown();
    }

    if (settings.preferredEngine && typeof settings.preferredEngine === 'string') {
        currentEngine = settings.preferredEngine;
        localStorage.setItem('preferredEngine', currentEngine);
        setEngine(currentEngine);
    }

    // Apply shortcuts
    if (Array.isArray(settings.shortcuts)) {
        if (typeof ShortcutManager !== 'undefined') {
            // Clear existing shortcuts and add imported ones
            const currentShortcuts = ShortcutManager.getAll();
            currentShortcuts.forEach((_, index) => {
                ShortcutManager.delete(0, { silent: true });
            });
            settings.shortcuts.forEach(shortcut => {
                ShortcutManager.add(shortcut);
            });
            shortcuts = ShortcutManager.getAll();
        } else {
            shortcuts = settings.shortcuts;
            localStorage.setItem('shortcuts', JSON.stringify(shortcuts));
        }
        renderShortcutsList();
        renderShortcutsGrid();
    }

    if (settings.showShortcutNames !== undefined) {
        localStorage.setItem('showShortcutNames', settings.showShortcutNames ? 'true' : 'false');
        const showShortcutNamesCheckbox = document.getElementById('showShortcutNames');
        if (showShortcutNamesCheckbox) {
            showShortcutNamesCheckbox.checked = settings.showShortcutNames;
            shortcutsGrid.classList.toggle('hide-names', !settings.showShortcutNames);
        }
    }

    if (settings.shortcutOpenTarget) {
        localStorage.setItem(SHORTCUT_TARGET_KEY, settings.shortcutOpenTarget);
        _syncShortcutTargetUI();
        renderShortcutsGrid();
    }

    // Apply shortcut settings
    if (settings.shortcutSettings && typeof settings.shortcutSettings === 'object') {
        if (typeof ShortcutManager !== 'undefined' && ShortcutManager.updateShortcutSettings) {
            ShortcutManager.updateShortcutSettings(settings.shortcutSettings);
            // Re-render shortcuts
            if (ShortcutManager.renderGrid) {
                ShortcutManager.renderGrid(handleShortcutDragStart, handleShortcutDragEnd, handleShortcutDragOver, handleShortcutDrop, handleShortcutDragLeave, openFolderOverlay);
            }
        } else {
            localStorage.setItem('shortcutSettings', JSON.stringify(settings.shortcutSettings));
        }
    }

    // Apply wallpaper settings
    if (settings.wallpaperSettings && typeof settings.wallpaperSettings === 'object') {
        localStorage.setItem('wallpaperSettings', JSON.stringify(settings.wallpaperSettings));
    }

    if (settings.wallpaperSource) {
        localStorage.setItem('wallpaperSource', settings.wallpaperSource);
    }

    if (settings.bingMarket) {
        localStorage.setItem('bingMarket', settings.bingMarket);
    }

    // Apply search box settings
    if (settings.searchBoxSettings && typeof settings.searchBoxSettings === 'object') {
        localStorage.setItem('searchBoxSettings', JSON.stringify(settings.searchBoxSettings));
    }

    // Apply theme settings
    if (settings.themeSettings && typeof settings.themeSettings === 'object') {
        localStorage.setItem('themeSettings', JSON.stringify(settings.themeSettings));
    }

    // Apply accessibility settings
    if (settings.accessibilitySettings && typeof settings.accessibilitySettings === 'object') {
        localStorage.setItem('accessibilitySettings', JSON.stringify(settings.accessibilitySettings));
    }

    // Apply language preference
    if (settings.preferredLanguage) {
        localStorage.setItem('preferredLanguage', settings.preferredLanguage);
        if (typeof I18n !== 'undefined' && I18n.localize) {
            I18n.localize(settings.preferredLanguage);
            // Update search button width after language change
            requestAnimationFrame(() => {
                _updateSearchActionWidth();
            });
        }
    }

    // Apply snow effect
    if (settings.snowEffectEnabled !== undefined) {
        localStorage.setItem('snowEffectEnabled', settings.snowEffectEnabled ? 'true' : 'false');
        if (typeof SnowEffect !== 'undefined' && SnowEffect.setEnabled) {
            SnowEffect.setEnabled(settings.snowEffectEnabled);
        }
    }

    if (settings.snowEffectTriggered !== undefined) {
        localStorage.setItem('snowEffectTriggered', settings.snowEffectTriggered ? 'true' : 'false');
    }
}

/**
 * Import configuration from file
 */
async function importConfiguration() {
    try {
        if (typeof ConfigManager === 'undefined' || !ConfigManager.importFromFile) {
            throw new Error('ConfigManager not available');
        }

        const fileInput = document.getElementById('importConfigFile');
        if (!fileInput) {
            throw new Error('File input not found');
        }

        // Trigger file picker
        fileInput.click();

        // Wait for file selection
        await new Promise((resolve, reject) => {
            fileInput.onchange = async (e) => {
                const file = e.target.files?.[0];
                if (!file) {
                    resolve(null);
                    return;
                }

                try {
                    // Show confirmation dialog
                    const confirmMessage = I18n && I18n.t ? 
                        I18n.t('importConfigConfirm', 'This will replace all your current settings. Continue?') : 
                        'This will replace all your current settings. Continue?';
                    
                    if (!confirm(confirmMessage)) {
                        fileInput.value = '';
                        resolve(null);
                        return;
                    }

                    // Import and verify configuration
                    const result = await ConfigManager.importFromFile(file);
                    
                    if (!result.success) {
                        const errorMessage = I18n && I18n.t ? 
                            I18n.t('importConfigError', 'Failed to import configuration: ') + result.error : 
                            'Failed to import configuration: ' + result.error;
                        alert(errorMessage);
                        fileInput.value = '';
                        resolve(null);
                        return;
                    }

                    // Show migration notice if configuration was migrated
                    if (result.config && result.migrated) {
                        const migrationMessage = I18n && I18n.getMessage ? 
                            `Configuration was automatically upgraded from version ${result.fromVersion || 'legacy'} to ${ConfigManager.getVersion()}.` :
                            `Configuration was automatically upgraded from version ${result.fromVersion || 'legacy'} to ${ConfigManager.getVersion()}.`;
                        console.log('[Import] ' + migrationMessage);
                        // Optionally show a brief notice (non-blocking)
                        if (window.requestIdleCallback) {
                            requestIdleCallback(() => {
                                console.info(migrationMessage);
                            });
                        }
                    }

                    // Apply configuration
                    _applyImportedConfiguration(result.config);

                    // Show success message
                    const successMessage = I18n && I18n.t ? 
                        I18n.t('importConfigSuccess', 'Configuration imported successfully!') : 
                        'Configuration imported successfully!';
                    alert(successMessage);

                    // Reload page to ensure all settings are applied
                    window.location.reload();
                } catch (error) {
                    console.error('Failed to import configuration:', error);
                    const errorMessage = I18n && I18n.t ? 
                        I18n.t('importConfigError', 'Failed to import configuration: ') + error.message : 
                        'Failed to import configuration: ' + error.message;
                    alert(errorMessage);
                    reject(error);
                } finally {
                    fileInput.value = '';
                    resolve(null);
                }
            };
        });
    } catch (e) {
        console.error('Failed to import configuration:', e);
        const errorMessage = I18n && I18n.t ? 
            I18n.t('importConfigError', 'Failed to import configuration: ') + e.message : 
            'Failed to import configuration: ' + e.message;
        alert(errorMessage);
    }
}

// Import Configuration Button
const importConfigBtn = document.getElementById('importConfigBtn');
if (importConfigBtn) {
    importConfigBtn.addEventListener('click', importConfiguration);
}

// Security: Allow only http/https and reject control chars / blank
function isDangerousUrl(url) {
    if (!url || typeof url !== 'string') return true;
    const trimmed = url.trim();
    // Reject control/non-printable chars
    if (/[^\x20-\x7E]/.test(trimmed)) return true;

    try {
        // If protocol missing, assume https for validation only
        const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        const parsed = new URL(candidate);
        const proto = (parsed.protocol || '').toLowerCase();
        if (proto !== 'http:' && proto !== 'https:') return true;
        return false;
    } catch (e) {
        // If URL parsing fails, treat it as dangerous
        return true;
    }
}

// Add Engine
addEngineBtn.addEventListener("click", () => {
    const name = document.getElementById("newEngineName").value.trim();
    let url = document.getElementById("newEngineUrl").value.trim();
    if (name && url) {
        // Security check
        if (isDangerousUrl(url)) {
            alert('Invalid URL protocol');
            return;
        }
        
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
        // Security check
        if (isDangerousUrl(url)) {
            alert('Invalid URL protocol');
            return;
        }
        
        if (!/^http(s)?:\/\//i.test(url)) url = "https://" + url;
        const icon = getFavicon(url);
        if (typeof ShortcutManager !== 'undefined' && ShortcutManager.add) {
            ShortcutManager.add({ name, url, icon });
            shortcuts = ShortcutManager.getAll();
        } else {
            shortcuts.push({ name, url, icon });
        }
        saveShortcuts();
        document.getElementById("newShortcutName").value = "";
        document.getElementById("newShortcutUrl").value = "";
    }
});

// Engine Selector Toggle
selectedEngineIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    engineSelector.classList.toggle("active");
});
document.addEventListener("click", (e) => {
    if (!engineSelector.contains(e.target)) engineSelector.classList.remove("active");
});

// ==================== Shortcut Name Display Toggle ====================
const showShortcutNamesCheckbox = document.getElementById('showShortcutNames');
if (showShortcutNamesCheckbox) {
    // Load saved setting
    const showNames = localStorage.getItem('showShortcutNames') !== 'false';
    showShortcutNamesCheckbox.checked = showNames;
    
    showShortcutNamesCheckbox.addEventListener('change', (e) => {
        localStorage.setItem('showShortcutNames', e.target.checked);
        shortcutsGrid.classList.toggle('hide-names', !e.target.checked);
    });
}


// ==================== Shortcut Open Target ====================
function _syncShortcutTargetUI() {
    const target = localStorage.getItem(SHORTCUT_TARGET_KEY) || 'current';
    if (shortcutOpenCurrent) shortcutOpenCurrent.checked = target !== 'newtab';
    if (shortcutOpenNewTab) shortcutOpenNewTab.checked = target === 'newtab';
}

_syncShortcutTargetUI();

if (shortcutOpenCurrent) {
    shortcutOpenCurrent.addEventListener('change', (e) => {
        if (e.target.checked) {
            localStorage.setItem(SHORTCUT_TARGET_KEY, 'current');
            renderShortcutsGrid();
        }
    });
}

if (shortcutOpenNewTab) {
    shortcutOpenNewTab.addEventListener('change', (e) => {
        if (e.target.checked) {
            localStorage.setItem(SHORTCUT_TARGET_KEY, 'newtab');
            renderShortcutsGrid();
        }
    });
}

// ==================== Shortcut Drag & Drop Sorting ====================
let draggedShortcutIndex = null;
let folderOverlay = null;
let folderOverlayContent = null;
let folderOverlayInput = null;
let currentFolderIndex = null;
let mergeHoverTimer = null;
let mergeAllowedIndex = null;
let currentMergeTargetIndex = null;

function handleShortcutDragStart(e) {
    draggedShortcutIndex = parseInt(e.currentTarget.dataset.index);
    currentMergeTargetIndex = null;
    mergeAllowedIndex = null;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedShortcutIndex);

    // Use icon as drag image for a tighter preview
    const iconEl = e.currentTarget.querySelector('.shortcut-icon');
    if (iconEl && e.dataTransfer.setDragImage) {
        const { width, height } = iconEl.getBoundingClientRect();
        e.dataTransfer.setDragImage(iconEl, width / 2, height / 2);
    }

    if (shortcutsGrid) {
        shortcutsGrid.classList.add('dragging-active');
    }
}

function handleShortcutDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    // Remove drag-over class from all items
    document.querySelectorAll('.shortcut-item').forEach(item => {
        item.classList.remove('drag-over');
        item.classList.remove('drag-over-merge');
    });
    if (shortcutsGrid) {
        shortcutsGrid.classList.remove('dragging-active');
    }
    if (mergeHoverTimer) clearTimeout(mergeHoverTimer);
    draggedShortcutIndex = null;
    currentMergeTargetIndex = null;
    mergeAllowedIndex = null;
}

function handleShortcutDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const target = e.currentTarget;
    const targetIndex = parseInt(target.dataset.index);
    
    if (draggedShortcutIndex !== null && targetIndex !== draggedShortcutIndex) {
        target.classList.add('drag-over');

        if (!FOLDER_FEATURE_ENABLED) return;

        // Only start timer if we are new to this target
        if (currentMergeTargetIndex !== targetIndex) {
            // Clean up previous target if any
            if (mergeHoverTimer) clearTimeout(mergeHoverTimer);
            if (currentMergeTargetIndex !== null) {
                const oldEl = shortcutsGrid.querySelector(`.shortcut-item[data-index="${currentMergeTargetIndex}"]`);
                if (oldEl) oldEl.classList.remove('drag-over-merge');
            }
            
            currentMergeTargetIndex = targetIndex;
            mergeAllowedIndex = null;

            mergeHoverTimer = setTimeout(() => {
                // Double check if we are still on the same target
                if (currentMergeTargetIndex === targetIndex) {
                    mergeAllowedIndex = targetIndex;
                    target.classList.add('drag-over-merge');
                }
            }, 800); // 0.8s hover to allow merge
        }
    }
}

function handleShortcutDragLeave(e) {
    const target = e.currentTarget;
    // Ignore leave events triggered by children
    if (target.contains(e.relatedTarget)) return;

    target.classList.remove('drag-over');
    target.classList.remove('drag-over-merge');
    
    if (!FOLDER_FEATURE_ENABLED) return;

    const targetIndex = parseInt(target.dataset.index);
    if (currentMergeTargetIndex === targetIndex) {
        if (mergeHoverTimer) clearTimeout(mergeHoverTimer);
        currentMergeTargetIndex = null;
        mergeAllowedIndex = null;
    }
}

function handleShortcutDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    e.currentTarget.classList.remove('drag-over-merge');
    if (shortcutsGrid) {
        shortcutsGrid.classList.remove('dragging-active');
    }
    if (mergeHoverTimer) clearTimeout(mergeHoverTimer);
    
    const targetIndex = parseInt(e.currentTarget.dataset.index);
    currentMergeTargetIndex = null;
    
    if (draggedShortcutIndex === null || targetIndex === draggedShortcutIndex) return;

    const shortcutsList = getShortcuts();
    const draggedItem = shortcutsList[draggedShortcutIndex];
    const targetItem = shortcutsList[targetIndex];

    if (!draggedItem || !targetItem) return;

    // If drop target is a folder, push into folder (only when feature enabled)
    if (FOLDER_FEATURE_ENABLED && _isFolder(targetItem)) {
        if (typeof ShortcutManager !== 'undefined' && ShortcutManager.delete && ShortcutManager.update) {
            ShortcutManager.delete(draggedShortcutIndex, { silent: true });
            _ensureShortcutId(draggedItem);
            targetItem.items.push(draggedItem);
            ShortcutManager.update(targetIndex, targetItem);
            shortcuts = ShortcutManager.getAll();
        } else {
            shortcuts.splice(draggedShortcutIndex, 1);
            _ensureShortcutId(draggedItem);
            targetItem.items.push(draggedItem);
        }
        saveShortcuts();
        return;
    }

    const allowMerge = FOLDER_FEATURE_ENABLED && mergeAllowedIndex === targetIndex;

    // If dragging a folder onto item, just reorder
    if (_isFolder(draggedItem) && !_isFolder(targetItem)) {
        if (typeof ShortcutManager !== 'undefined' && ShortcutManager.reorder) {
            ShortcutManager.reorder(draggedShortcutIndex, targetIndex);
            shortcuts = ShortcutManager.getAll();
        } else {
            shortcuts.splice(draggedShortcutIndex, 1);
            shortcuts.splice(targetIndex, 0, draggedItem);
        }
        saveShortcuts();
        return;
    }

    // Create folder when item dropped onto another item
    if (!_isFolder(draggedItem) && !_isFolder(targetItem) && allowMerge) {
        const higher = Math.max(draggedShortcutIndex, targetIndex);
        const lower = Math.min(draggedShortcutIndex, targetIndex);
        const first = shortcutsList[lower];
        const second = shortcutsList[higher];
        if (typeof ShortcutManager !== 'undefined' && ShortcutManager.delete && ShortcutManager.add) {
            ShortcutManager.delete(higher, { silent: true });
            ShortcutManager.delete(lower, { silent: true });
            _ensureShortcutId(first);
            _ensureShortcutId(second);
            const folder = {
                type: 'folder',
                name: _createFolderName(),
                items: [first, second]
            };
            ShortcutManager.add(folder);
            // Reorder to correct position
            const currentList = ShortcutManager.getAll();
            const folderIndex = currentList.length - 1;
            if (folderIndex !== lower) {
                ShortcutManager.reorder(folderIndex, lower);
            }
            shortcuts = ShortcutManager.getAll();
        } else {
            shortcuts.splice(higher, 1);
            shortcuts.splice(lower, 1);
            _ensureShortcutId(first);
            _ensureShortcutId(second);
            const folder = {
                type: 'folder',
                name: _createFolderName(),
                items: [first, second]
            };
            shortcuts.splice(lower, 0, folder);
        }
        saveShortcuts();
        return;
    }

    // Default reorder
    if (typeof ShortcutManager !== 'undefined' && ShortcutManager.reorder) {
        ShortcutManager.reorder(draggedShortcutIndex, targetIndex);
        shortcuts = ShortcutManager.getAll();
    } else {
        shortcuts.splice(draggedShortcutIndex, 1);
        shortcuts.splice(targetIndex, 0, draggedItem);
    }
    saveShortcuts();
}

// ==================== Folder Overlay / Management ====================

function _ensureFolderOverlay() {
    if (folderOverlay) return;
    folderOverlay = document.createElement('div');
    folderOverlay.className = 'folder-overlay';
    folderOverlay.innerHTML = `
        <div class="folder-bubble">
            <div class="folder-bubble-header">
                <input id="folderOverlayInput" class="folder-bubble-input" />
                <button id="folderOverlayClose" class="folder-bubble-close">&times;</button>
            </div>
            <div id="folderOverlayContent" class="folder-bubble-content"></div>
        </div>
    `;
    document.body.appendChild(folderOverlay);
    folderOverlayContent = folderOverlay.querySelector('#folderOverlayContent');
    folderOverlayInput = folderOverlay.querySelector('#folderOverlayInput');
    const closeBtn = folderOverlay.querySelector('#folderOverlayClose');
    closeBtn.addEventListener('click', closeFolderOverlay);
    folderOverlay.addEventListener('click', (e) => {
        if (e.target === folderOverlay) closeFolderOverlay();
    });
}

function _positionFolderOverlay(targetEl) {
    if (!folderOverlay || !targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const bubble = folderOverlay.querySelector('.folder-bubble');
    const bubbleRect = bubble.getBoundingClientRect();
    const top = rect.bottom + 12;
    let left = rect.left + rect.width / 2 - bubbleRect.width / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - bubbleRect.width - 12));
    folderOverlay.style.display = 'flex';
    bubble.style.top = `${top}px`;
    bubble.style.left = `${left}px`;
}

function openFolderOverlay(index) {
    currentFolderIndex = index;
    const shortcutsList = getShortcuts();
    const folder = shortcutsList[index];
    if (!_isFolder(folder)) return;
    _ensureFolderOverlay();
    folderOverlayInput.value = folder.name || '';
    folderOverlayContent.innerHTML = '';
    folder.items.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'folder-item-row';
        const left = document.createElement('div');
        left.className = 'folder-item-info';
        const img = document.createElement('img');
        const cacheKey = `shortcut_${item.url || item.id}`;
        img.src = getIconSrc(cacheKey, item.icon || '', item.url);
        img.onerror = () => {
            img.style.display = 'none';
            const fallback = document.createElement('span');
            fallback.textContent = (item.name || '?').charAt(0).toUpperCase();
            fallback.className = 'folder-item-fallback';
            left.appendChild(fallback);
        };
        img.width = 20;
        img.height = 20;
        left.appendChild(img);
        const text = document.createElement('span');
        text.textContent = item.name;
        left.appendChild(text);

        const actions = document.createElement('div');
        actions.className = 'folder-item-actions';
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
            folder.items.splice(idx, 1);
            if (typeof ShortcutManager !== 'undefined' && ShortcutManager.update && ShortcutManager.delete) {
                if (folder.items.length === 1) {
                    const lone = folder.items[0];
                    ShortcutManager.delete(index, { silent: true });
                    ShortcutManager.add(lone);
                    // Reorder to correct position
                    const currentList = ShortcutManager.getAll();
                    const newIndex = currentList.length - 1;
                    if (newIndex !== index) {
                        ShortcutManager.reorder(newIndex, index);
                    }
                } else if (folder.items.length === 0) {
                    ShortcutManager.delete(index, { silent: true });
                } else {
                    ShortcutManager.update(index, folder);
                }
                shortcuts = ShortcutManager.getAll();
            } else {
                if (folder.items.length === 1) {
                    const lone = folder.items[0];
                    shortcuts.splice(index, 1, lone);
                } else if (folder.items.length === 0) {
                    shortcuts.splice(index, 1);
                }
            }
            saveShortcuts();
            openFolderOverlay(index);
        });

        const extractBtn = document.createElement('button');
        extractBtn.textContent = 'Extract';
        extractBtn.addEventListener('click', () => {
            const extracted = folder.items.splice(idx, 1)[0];
            if (typeof ShortcutManager !== 'undefined' && ShortcutManager.add && ShortcutManager.update && ShortcutManager.delete) {
                ShortcutManager.add(extracted);
                // Reorder to correct position
                const currentList = ShortcutManager.getAll();
                const newIndex = currentList.length - 1;
                if (newIndex !== index + 1) {
                    ShortcutManager.reorder(newIndex, index + 1);
                }
                if (folder.items.length === 1) {
                    const lone = folder.items[0];
                    ShortcutManager.delete(index, { silent: true });
                    ShortcutManager.add(lone);
                    const updatedList = ShortcutManager.getAll();
                    const loneIndex = updatedList.length - 1;
                    if (loneIndex !== index) {
                        ShortcutManager.reorder(loneIndex, index);
                    }
                } else if (folder.items.length === 0) {
                    ShortcutManager.delete(index, { silent: true });
                } else {
                    ShortcutManager.update(index, folder);
                }
                shortcuts = ShortcutManager.getAll();
            } else {
                shortcuts.splice(index + 1, 0, extracted);
                if (folder.items.length === 1) {
                    const lone = folder.items[0];
                    shortcuts.splice(index, 1, lone);
                } else if (folder.items.length === 0) {
                    shortcuts.splice(index, 1);
                }
            }
            saveShortcuts();
            openFolderOverlay(index);
        });

        actions.appendChild(removeBtn);
        actions.appendChild(extractBtn);

        row.appendChild(left);
        row.appendChild(actions);
        folderOverlayContent.appendChild(row);
    });

    folderOverlayInput.onchange = () => {
        const shortcutsList = getShortcuts();
        const folder = shortcutsList[currentFolderIndex];
        if (_isFolder(folder)) {
            folder.name = folderOverlayInput.value.trim() || folder.name;
            if (typeof ShortcutManager !== 'undefined' && ShortcutManager.update) {
                ShortcutManager.update(currentFolderIndex, folder);
                shortcuts = ShortcutManager.getAll();
            }
            saveShortcuts();
        }
    };

    _positionFolderOverlay(shortcutsGrid.querySelector(`.shortcut-item[data-index="${index}"]`));
    document.body.classList.add('modal-open');
}

function closeFolderOverlay() {
    if (folderOverlay) {
        folderOverlay.style.display = 'none';
    }
    currentFolderIndex = null;
    document.body.classList.remove('modal-open');
}

// ==================== Settings List Drag & Drop ====================
function initSettingsListDragDrop() {
    const shortcutsList = document.getElementById('shortcutsList');
    if (!shortcutsList) return;
    
    // Use MutationObserver to add drag handlers to new items
    const observer = new MutationObserver(() => {
        const items = shortcutsList.querySelectorAll('.list-item');
        items.forEach((item, index) => {
            if (!item.dataset.dragInit) {
                item.draggable = true;
                item.dataset.index = index;
                item.dataset.dragInit = 'true';
                
                // Add drag handle icon
                if (!item.querySelector('.drag-handle')) {
                    const handle = document.createElement('span');
                    handle.className = 'drag-handle';
                    handle.innerHTML = '⋮⋮';
                    item.insertBefore(handle, item.firstChild);
                }
                
                item.addEventListener('dragstart', handleListDragStart);
                item.addEventListener('dragend', handleListDragEnd);
                item.addEventListener('dragover', handleListDragOver);
                item.addEventListener('drop', handleListDrop);
                item.addEventListener('dragleave', handleListDragLeave);
            }
        });
    });
    
    observer.observe(shortcutsList, { childList: true });
}

let draggedListIndex = null;

function handleListDragStart(e) {
    draggedListIndex = parseInt(e.currentTarget.dataset.index);
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleListDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.list-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    draggedListIndex = null;
}

function handleListDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const targetIndex = parseInt(e.currentTarget.dataset.index);
    if (draggedListIndex !== null && targetIndex !== draggedListIndex) {
        e.currentTarget.classList.add('drag-over');
    }
}

function handleListDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleListDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const targetIndex = parseInt(e.currentTarget.dataset.index);
    
    if (draggedListIndex !== null && targetIndex !== draggedListIndex) {
        // Reorder shortcuts array
        const draggedItem = shortcuts[draggedListIndex];
        shortcuts.splice(draggedListIndex, 1);
        shortcuts.splice(targetIndex, 0, draggedItem);
        
        // Save and re-render
        saveShortcuts();
    }
}

// Init
// ==================== Chrome Customize Button Remover ====================

/**
 * Remove Chrome's footer (which contains "Customize Chrome" button)
 * Chrome adds a footer to the new tab page, and we need to hide the entire footer
 * Uses MutationObserver to catch dynamically added elements
 */
function _removeChromeCustomizeButton() {
    function hideChromeFooter() {
        // Common selectors for Chrome's footer container
        const footerSelectors = [
            'footer',
            '[role="contentinfo"]',
            '[data-testid*="footer"]',
            '[id*="footer"]',
            '[class*="footer"]',
            // Chrome-specific selectors
            'div[style*="position: fixed"][style*="bottom"]',
            'div[style*="position:fixed"][style*="bottom"]'
        ];

        // Try to find footer containers first
        for (const selector of footerSelectors) {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el.hasAttribute('data-genresfox-hidden')) return;
                    
                    // Check if this footer contains customize-related content
                    const text = el.textContent || el.getAttribute('aria-label') || '';
                    const hasCustomize = /自定义|Customize|カスタマイズ/i.test(text);
                    
                    // Also check if it's positioned at the bottom (likely Chrome footer)
                    const style = window.getComputedStyle(el);
                    const isBottomFixed = style.position === 'fixed' && 
                                         (style.bottom === '0px' || style.bottom === '0');
                    
                    if (hasCustomize || isBottomFixed) {
                        el.style.display = 'none';
                        el.setAttribute('data-genresfox-hidden', 'true');
                    }
                });
            } catch (e) {
                // Invalid selector, skip
            }
        }

        // Search for elements containing "自定义 Chrome" or "Customize Chrome" text
        // and hide their parent container (likely the footer)
        const customizeSelectors = [
            '[data-testid="customize-chrome-button"]',
            '[aria-label*="自定义 Chrome"]',
            '[aria-label*="Customize Chrome"]',
            '[aria-label*="カスタマイズ"]',
            'button[data-customize-chrome]',
            'a[href*="chrome://new-tab-page"]'
        ];

        for (const selector of customizeSelectors) {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el.hasAttribute('data-genresfox-hidden')) return;
                    
                    // Hide the element itself
                    el.style.display = 'none';
                    el.setAttribute('data-genresfox-hidden', 'true');
                    
                    // Also try to find and hide parent footer container
                    let parent = el.parentElement;
                    let depth = 0;
                    while (parent && depth < 5) {
                        const parentText = parent.textContent || '';
                        const parentStyle = window.getComputedStyle(parent);
                        
                        // Check if parent looks like a footer
                        if (parentStyle.position === 'fixed' && 
                            (parentStyle.bottom === '0px' || parentStyle.bottom === '0') ||
                            /自定义|Customize|カスタマイズ/i.test(parentText)) {
                            parent.style.display = 'none';
                            parent.setAttribute('data-genresfox-hidden', 'true');
                            break;
                        }
                        parent = parent.parentElement;
                        depth++;
                    }
                });
            } catch (e) {
                // Invalid selector, skip
            }
        }

        // Fallback: search all elements for customize text and hide their containers
        // BUT: Exclude critical app containers to prevent false positives
        const criticalContainers = [
            '.container',
            '.search-container',
            '.search-box',
            '.shortcuts-grid',
            '.modal',
            '.modal-overlay',
            '#settingsModal',
            'body',
            'html'
        ];
        
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            if (el.hasAttribute('data-genresfox-hidden')) return;
            
            // Skip critical app containers
            let isCritical = false;
            for (const selector of criticalContainers) {
                if (el.matches && el.matches(selector)) {
                    isCritical = true;
                    break;
                }
                // Also check if element is inside a critical container
                if (el.closest && el.closest(selector)) {
                    isCritical = true;
                    break;
                }
            }
            if (isCritical) return;
            
            const text = (el.textContent || el.getAttribute('aria-label') || '').trim();
            // More specific regex: must contain "Chrome" or be a button/link
            const isCustomize = /(自定义\s*Chrome|Customize\s*Chrome|カスタマイズ\s*Chrome)/i.test(text) ||
                               ((el.tagName === 'BUTTON' || el.tagName === 'A') && 
                                /(自定义|Customize|カスタマイズ)/i.test(text));
            
            if (isCustomize) {
                // Hide the element
                el.style.display = 'none';
                el.setAttribute('data-genresfox-hidden', 'true');
                
                // Also try to hide parent container if it looks like a footer
                let parent = el.parentElement;
                if (parent) {
                    // Don't hide body or html
                    if (parent === document.body || parent === document.documentElement) {
                        return;
                    }
                    const parentStyle = window.getComputedStyle(parent);
                    if (parentStyle.position === 'fixed' && 
                        (parentStyle.bottom === '0px' || parentStyle.bottom === '0')) {
                        parent.style.display = 'none';
                        parent.setAttribute('data-genresfox-hidden', 'true');
                    }
                }
            }
        });
    }

    // Initial attempt
    hideChromeFooter();

    // Use MutationObserver to catch dynamically added elements
    const observer = new MutationObserver(() => {
        hideChromeFooter();
    });

    // Observe body for new elements
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class', 'id']
    });

    // Also observe document for elements added to root
    if (document.documentElement) {
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'id']
        });
    }

    // Periodic check as fallback (in case MutationObserver misses something)
    const intervalId = setInterval(() => {
        hideChromeFooter();
    }, 500);

    // Stop checking after 15 seconds (Chrome usually adds it quickly)
    setTimeout(() => {
        clearInterval(intervalId);
    }, 15000);
}

// ==================== Snow Effect Easter Egg ====================

/**
 * Setup snow effect easter egg (click GenresFox 3 times)
 */
function _setupSnowEasterEgg() {
    if (typeof SnowEffect === 'undefined') return;

    const aboutTab = document.getElementById('tab-about');
    if (!aboutTab) return;

    const genresFoxHeading = aboutTab.querySelector('h3');
    if (!genresFoxHeading || genresFoxHeading.textContent.trim() !== 'GenresFox') return;

    let clickCount = 0;
    let clickTimeout = null;
    const CLICK_RESET_TIME = 2000; // Reset count after 2 seconds

    genresFoxHeading.style.cursor = 'pointer';
    genresFoxHeading.title = ''; // Will be set by i18n if needed

    genresFoxHeading.addEventListener('click', () => {
        // Clear previous timeout
        if (clickTimeout) {
            clearTimeout(clickTimeout);
        }

        clickCount++;
        
        // Reset count after delay
        clickTimeout = setTimeout(() => {
            clickCount = 0;
        }, CLICK_RESET_TIME);

        // Trigger on 3rd click
        if (clickCount >= 3) {
            clickCount = 0;
            if (clickTimeout) {
                clearTimeout(clickTimeout);
                clickTimeout = null;
            }

            // Check if in holiday period
            if (SnowEffect.isHolidayPeriod()) {
                SnowEffect.trigger();
                _updateSnowToggleVisibility();
                _showChristmasEmojis(genresFoxHeading);
                // Show a subtle notification (optional)
                console.log('[OK] Snow effect activated!');
            }
        }
    });
}

/**
 * Show Christmas emojis next to GenresFox heading
 * @param {HTMLElement} heading - The GenresFox heading element
 */
function _showChristmasEmojis(heading) {
    if (!heading) return;

    // Check if emojis already exist
    if (heading.querySelector('.christmas-emoji')) return;

    // Create emoji container
    const emojiContainer = document.createElement('span');
    emojiContainer.className = 'christmas-emoji';
    emojiContainer.style.cssText = `
        display: inline-block;
        margin-left: 8px;
        font-size: 1.2em;
        animation: fadeInScale 0.5s ease-out;
    `;
    emojiContainer.textContent = '🦊🎄';

    // Add animation style if not already added
    if (!document.getElementById('christmas-emoji-style')) {
        const style = document.createElement('style');
        style.id = 'christmas-emoji-style';
        style.textContent = `
            @keyframes fadeInScale {
                from {
                    opacity: 0;
                    transform: scale(0.5);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            .christmas-emoji {
                user-select: none;
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
    }

    // Append emojis to heading
    heading.appendChild(emojiContainer);
}

/**
 * Update snow toggle visibility in wallpaper settings
 */
function _updateSnowToggleVisibility() {
    if (typeof SnowEffect === 'undefined') return;

    const toggleContainer = document.getElementById('snowEffectToggleContainer');
    if (!toggleContainer) return;

    // Show toggle only if snow effect has been triggered AND we're in holiday period
    if (SnowEffect.isTriggered() && SnowEffect.isHolidayPeriod()) {
        toggleContainer.style.display = 'block';
        
        // Sync checkbox state
        const snowToggle = document.getElementById('snowEffectToggle');
        if (snowToggle) {
            snowToggle.checked = SnowEffect.isEnabled();
        }
    } else {
        // Hide toggle if not in holiday period or not triggered
        toggleContainer.style.display = 'none';
    }
}

/**
 * Setup snow toggle event listener
 */
function _setupSnowToggle() {
    if (typeof SnowEffect === 'undefined') return;

    const snowToggle = document.getElementById('snowEffectToggle');
    if (!snowToggle) return;

    snowToggle.addEventListener('change', (e) => {
        // Only allow toggling if we're in holiday period
        if (!SnowEffect.isHolidayPeriod()) {
            // Reset checkbox state if not in holiday period
            e.target.checked = false;
            return;
        }

        if (e.target.checked) {
            SnowEffect.enable();
        } else {
            SnowEffect.disable();
        }
    });
}

async function init() {
    const safeInit = async (label, fn) => {
        try {
            await fn();
        } catch (e) {
            console.warn(`Failed to initialize ${label}:`, e);
        }
    };

    // Update version number from manifest
    await safeInit('Version Display', () => {
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
                const manifest = chrome.runtime.getManifest();
                const versionElement = document.getElementById('version-number');
                if (versionElement && manifest && manifest.version) {
                    versionElement.textContent = manifest.version;
                }
            }
        } catch (e) {
            console.warn('Failed to update version display:', e);
        }
    });

    // Initialize i18n module first
    await safeInit('i18n', () => {
        if (typeof I18n !== 'undefined' && I18n.init) {
            I18n.init();
        }
    });

    // Initialize Accessibility Manager (applies theme/font settings early)
    // Note: Don't sync UI yet, custom selects aren't created
    await safeInit('AccessibilityManager', () => {
        if (typeof AccessibilityManager !== 'undefined' && AccessibilityManager.init) {
            AccessibilityManager.init();
        }
    });

    // Initialize Shortcut Manager (includes icon management)
    await safeInit('ShortcutManager', () => {
        if (typeof ShortcutManager !== 'undefined' && ShortcutManager.init) {
            ShortcutManager.init({
                listElement: document.getElementById('shortcutsList'),
                gridElement: document.getElementById('shortcuts'),
                onChange: () => {
                    // Sync shortcuts variable for backward compatibility
                    shortcuts = ShortcutManager.getAll();
                }
            });
            // Sync shortcuts variable
            shortcuts = ShortcutManager.getAll();
            
        }
    });

    // Initialize Wallpaper Manager
    await safeInit('WallpaperManager', async () => {
        if (typeof WallpaperManager !== 'undefined' && WallpaperManager.init) {
            return WallpaperManager.init();
        }
    });

    // Initialize Snow Effect (easter egg) - deferred to not affect LCP
    // Snow effect is non-critical and can be loaded after LCP
    if (window.requestIdleCallback) {
        requestIdleCallback(() => {
            safeInit('SnowEffect', () => {
                if (typeof SnowEffect !== 'undefined') {
                    // If not in holiday period, ensure effect is disabled
                    if (!SnowEffect.isHolidayPeriod()) {
                        SnowEffect.disable();
                    }
                    SnowEffect.init();
                    _setupSnowEasterEgg();
                    // Sync toggle state after SnowEffect is initialized
                    _updateSnowToggleVisibility();
                }
            });
        }, { timeout: 3000 });
    } else {
        setTimeout(() => {
            safeInit('SnowEffect', () => {
                if (typeof SnowEffect !== 'undefined') {
                    // If not in holiday period, ensure effect is disabled
                    if (!SnowEffect.isHolidayPeriod()) {
                        SnowEffect.disable();
                    }
                    SnowEffect.init();
                    _setupSnowEasterEgg();
                    // Sync toggle state after SnowEffect is initialized
                    _updateSnowToggleVisibility();
                }
            });
        }, 2000);
    }

    // Ensure shortcuts exist (Double check)
    if (typeof ShortcutManager !== 'undefined' && ShortcutManager.getAll) {
        shortcuts = ShortcutManager.getAll();
        if (!shortcuts || shortcuts.length === 0) {
            if (ShortcutManager.reset) {
                ShortcutManager.reset();
                shortcuts = ShortcutManager.getAll();
            } else {
                shortcuts = JSON.parse(JSON.stringify(defaultShortcuts));
            }
            saveShortcuts();
        }
    } else if (!shortcuts || shortcuts.length === 0) {
        shortcuts = JSON.parse(JSON.stringify(defaultShortcuts));
        saveShortcuts();
    }

    // Apply translations
    if (typeof I18n !== 'undefined') {
        I18n.localize();
    }
    
    // Update search button width after i18n is applied
    if (typeof searchActionBtn !== 'undefined' && typeof searchActionLabel !== 'undefined') {
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
            _updateSearchActionWidth();
        });
    }
    
    // Initialize custom selects after i18n is applied
    await safeInit('CustomSelect', () => {
        if (typeof CustomSelect !== 'undefined' && CustomSelect.init) {
            CustomSelect.init('#tab-accessibility select');
        }
    });
    
    // Now sync accessibility UI after custom selects exist
    await safeInit('AccessibilityManager.syncUI', () => {
        if (typeof AccessibilityManager !== 'undefined' && AccessibilityManager.syncUI) {
            AccessibilityManager.syncUI();
        }
    });
    
    // Critical UI updates first (for LCP)
    updateUI();
    if (window.SearchBar && typeof window.SearchBar.init === 'function') {
        window.SearchBar.init({
            searchInputId: 'search',
            actionBtnId: 'searchActionBtn',
            actionLabelId: 'searchActionLabel',
            getEngines: () => engines,
            getCurrentEngine: () => currentEngine
        });
    }
    
    // Render shortcuts grid (critical for LCP)
    renderShortcutsGrid();
    
    // Non-critical UI updates deferred
    requestIdleCallback(() => {
        renderEnginesList();
        renderShortcutsList();
        _updateSnowToggleVisibility();
        _setupSnowToggle();
        // Initialize settings list drag & drop
        initSettingsListDragDrop();
    }, { timeout: 100 });

    // Enhanced visibility protection system
    const CriticalElementsProtector = (function() {
        'use strict';
        
        const CRITICAL_SELECTORS = [
            'body',
            '.container',
            '.search-container',
            '.search-box',
            '#search',
            '#searchActionBtn'
        ];
        
        let observer = null;
        let checkInterval = null;
        
        /**
         * Ensure critical elements are visible
         */
        function ensureVisibility() {
            try {
                // Check body
                if (document.body) {
                    const bodyStyle = window.getComputedStyle(document.body);
                    if (bodyStyle.display === 'none' || bodyStyle.visibility === 'hidden') {
                        console.warn('[Protector] Body was hidden, restoring visibility');
                        document.body.style.setProperty('display', 'flex', 'important');
                        document.body.style.setProperty('visibility', 'visible', 'important');
                        document.body.style.setProperty('opacity', '1', 'important');
                    }
                }
                
                // Check critical containers
                CRITICAL_SELECTORS.forEach(selector => {
                    if (selector === 'body') return; // Already checked
                    
                    const element = document.querySelector(selector);
                    if (element) {
                        const style = window.getComputedStyle(element);
                        if (style.display === 'none' || style.visibility === 'hidden') {
                            console.warn(`[Protector] Critical element ${selector} was hidden, restoring visibility`);
                            element.style.setProperty('display', element.tagName === 'BODY' ? 'flex' : 'block', 'important');
                            element.style.setProperty('visibility', 'visible', 'important');
                            element.style.setProperty('opacity', '1', 'important');
                        }
                    }
                });
            } catch (e) {
                console.error('[Protector] Error in ensureVisibility:', e);
            }
        }
        
        /**
         * Monitor DOM changes for critical elements
         */
        function startMonitoring() {
            if (observer) return; // Already monitoring
            
            observer = new MutationObserver((mutations) => {
                let shouldCheck = false;
                
                mutations.forEach(mutation => {
                    // Check if any critical element's style was modified
                    if (mutation.type === 'attributes' && 
                        (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                        const target = mutation.target;
                        if (target.matches && CRITICAL_SELECTORS.some(sel => target.matches(sel))) {
                            shouldCheck = true;
                        }
                        // Also check if target is inside a critical container
                        if (target.closest && CRITICAL_SELECTORS.some(sel => target.closest(sel))) {
                            shouldCheck = true;
                        }
                    }
                    
                    // Check if critical elements were removed
                    if (mutation.type === 'childList') {
                        mutation.removedNodes.forEach(node => {
                            if (node.nodeType === 1 && // Element node
                                node.matches && CRITICAL_SELECTORS.some(sel => node.matches(sel))) {
                                shouldCheck = true;
                            }
                        });
                    }
                });
                
                if (shouldCheck) {
                    // Debounce checks
                    clearTimeout(checkInterval);
                    checkInterval = setTimeout(ensureVisibility, 50);
                }
            });
            
            // Observe document for changes
            if (document.body) {
                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['style', 'class']
                });
            }
            
            if (document.documentElement) {
                observer.observe(document.documentElement, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['style', 'class']
                });
            }
        }
        
        /**
         * Stop monitoring
         */
        function stopMonitoring() {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            if (checkInterval) {
                clearTimeout(checkInterval);
                checkInterval = null;
            }
        }
        
        return {
            ensureVisibility,
            startMonitoring,
            stopMonitoring
        };
    })();
    
    // Initialize protection system
    CriticalElementsProtector.ensureVisibility();
    setTimeout(() => {
        CriticalElementsProtector.ensureVisibility();
        CriticalElementsProtector.startMonitoring();
    }, 100);
    
    // Remove Chrome's customize button (non-blocking, can run anytime)
    requestIdleCallback(() => {
        _removeChromeCustomizeButton();
        // Re-check visibility after removing Chrome button
        CriticalElementsProtector.ensureVisibility();
    }, { timeout: 500 });
    
    // Periodic health checks
    setInterval(() => {
        // Check i18n health
        if (typeof I18n !== 'undefined' && I18n.healthCheck) {
            if (!I18n.healthCheck()) {
                console.warn('[Init] I18n health check failed, attempting recovery');
                try {
                    if (I18n.localize) {
                        I18n.localize(); // Re-localize to recover
                    }
                } catch (e) {
                    console.error('[Init] I18n recovery failed:', e);
                }
            }
        }
        
        // Check critical elements visibility
        CriticalElementsProtector.ensureVisibility();
    }, 5000); // Check every 5 seconds

    // Set focus only if no other element is focused (avoid autofocus warning)
    if (document.activeElement === document.body || document.activeElement === null) {
        try {
            searchInput.focus();
        } catch (e) {
            // Ignore focus errors (may be blocked by browser)
        }
    }
}

// Focus immediately after DOM is ready (but not blocking)
// Only focus if no other element is already focused (avoid autofocus warning)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (searchInput && (document.activeElement === document.body || document.activeElement === null)) {
            try {
                searchInput.focus();
            } catch (e) {
                // Ignore focus errors
            }
        }
    });
} else {
    if (searchInput && (document.activeElement === document.body || document.activeElement === null)) {
        try {
            searchInput.focus();
        } catch (e) {
            // Ignore focus errors
        }
    }
}

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

// Initialize ripple effects
// Note: Script loads at end of body, so DOM is already ready
(function initRipples() {
    // Check if DOM is ready (it should be since script is at end of body)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRipples);
        return;
    }
    
    initRippleEffects();
    
    // Re-init ripples when dynamic content is added
    const observer = new MutationObserver(() => {
        initRippleEffects();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();

// Expose for global use
window.initRippleEffects = initRippleEffects;

// Then run full init
init();

/**
 * Often, only those who have succeeded have a voice.
 * The words of those who haven't yet succeeded or who have failed are often treated as a joke.
 */