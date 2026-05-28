/**
 * Shortcut Manager Module
 * Manages shortcuts and icon caching/fetching
 * Combines shortcut management with icon management for better cohesion
 */

const ShortcutManager = (function() {
    'use strict';

    // ==================== Configuration ====================
    const DEFAULT_SHORTCUTS = [
        { name: "GitHub", url: "https://github.com", icon: "https://github.com/favicon.ico" },
        { name: "YouTube", url: "https://youtube.com", icon: "https://www.youtube.com/favicon.ico" },
        { name: "Bilibili", url: "https://bilibili.com", icon: "https://bilibili.com/favicon.ico" },
        { name: "Gmail", url: "https://mail.google.com", icon: "https://icons.duckduckgo.com/ip3/mail.google.com.ico" }
    ];

    const SHORTCUT_TARGET_KEY = 'shortcutOpenTarget';

    // Icon cache configuration
    const ICON_CACHE_DB_NAME = 'genresfox-icon-cache';
    const ICON_CACHE_STORE = 'icons';
    const ICON_CACHE_DB_VERSION = 1;
    const ICON_CACHE_VERSION = 1;
    const ICON_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

    // ==================== State ====================
    let shortcuts = [];
    let shortcutsListElement = null;
    let shortcutsGridElement = null;
    let onShortcutsChange = null; // Callback for when shortcuts change

    // Icon cache state
    const _iconCacheInMemory = new Map();
    const _iconCacheInFlight = new Map();
    const _resourceExistsCache = new Map();
    let _iconCacheDbPromise = null;

    // LRU eviction limit for in-memory caches
    const _ICON_CACHE_MAX_SIZE = 100;

    /**
     * Set a value in an LRU Map with size cap.
     * Evicts the oldest entry when the limit is exceeded.
     * @param {Map} map - Target Map
     * @param {string} key - Cache key
     * @param {*} value - Value to store
     */
    function _setLruMap(map, key, value) {
        if (map.has(key)) {
            map.delete(key);
        } else if (map.size >= _ICON_CACHE_MAX_SIZE) {
            const oldest = map.keys().next().value;
            if (oldest !== undefined) {
                map.delete(oldest);
            }
        }
        map.set(key, value);
    }

    // Shortcut settings
    const SHORTCUT_SETTINGS_KEY = 'shortcutSettings';
    const DEFAULT_SHORTCUT_SETTINGS = {
        // Settings for shortcuts
    };
    let shortcutSettings = { ...DEFAULT_SHORTCUT_SETTINGS };

    // ==================== Settings Management ====================

    /**
     * Load shortcut settings from localStorage
     */
    function _loadShortcutSettings() {
        try {
            const saved = localStorage.getItem(SHORTCUT_SETTINGS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                shortcutSettings = { ...DEFAULT_SHORTCUT_SETTINGS, ...parsed };
            }
        } catch (e) {
            console.warn('Failed to load shortcut settings:', e);
            shortcutSettings = { ...DEFAULT_SHORTCUT_SETTINGS };
        }
    }

    /**
     * Save shortcut settings to localStorage
     */
    function _saveShortcutSettings() {
        try {
            localStorage.setItem(SHORTCUT_SETTINGS_KEY, JSON.stringify(shortcutSettings));
        } catch (e) {
            console.warn('Failed to save shortcut settings:', e);
        }
    }

    /**
     * Get shortcut settings
     * @returns {Object} Settings object
     */
    function getShortcutSettings() {
        return { ...shortcutSettings };
    }

    /**
     * Update shortcut settings
     * @param {Object} newSettings - New settings to merge
     */
    function updateShortcutSettings(newSettings) {
        shortcutSettings = { ...shortcutSettings, ...newSettings };
        _saveShortcutSettings();
    }

    // ==================== Icon Management ====================

    /**
     * Get favicon URL from page URL
     * @param {string} url - Page URL
     * @returns {string} Favicon URL
     */
    function getFavicon(url) {
        try {
            const urlObj = new URL(url);
            return `${urlObj.origin}/favicon.ico`;
        } catch (e) {
            return "icon.png";
        }
    }

    /**
     * Decorate image element with optimal settings
     * @param {HTMLImageElement} img - Image element
     */
    function _decorateImg(img) {
        if (!img) return;
        img.referrerPolicy = 'no-referrer';
        img.decoding = 'async';
        img.loading = 'eager';
    }

    /**
     * Check if resource exists (with caching)
     * @param {string} url - Resource URL
     * @returns {Promise<boolean>}
     */
    async function _checkResourceExists(url) {
        if (_resourceExistsCache.has(url)) {
            return _resourceExistsCache.get(url);
        }
        
        if (_isNonCorsService(url)) {
            _setLruMap(_resourceExistsCache, url, true);
            return true;
        }
        
        try {
            // Note: HTTP response header warnings (x-content-type-options, set-cookie, etc.)
            // are from external servers and cannot be controlled by the extension
            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'cors',
                credentials: 'omit',
                cache: 'no-cache',
                headers: {
                    'Accept': '*/*',
                    'User-Agent': navigator.userAgent
                }
            });
            const exists = response.ok;
            _setLruMap(_resourceExistsCache, url, exists);
            return exists;
        } catch (e) {
            _setLruMap(_resourceExistsCache, url, false);
            return false;
        }
    }

    /**
     * Build icon candidate URLs for a given page/icon URL
     * @param {string} rawIconUrl - Provided icon URL
     * @param {string} pageUrl - Page URL
     * @returns {string[]} Array of candidate URLs
     */
    function _buildIconCandidates(rawIconUrl, pageUrl) {
        const candidates = [];
        const seen = new Set();
        const add = (u) => {
            if (!u || seen.has(u)) return;
            candidates.push(u);
            seen.add(u);
        };

        const basisUrl = pageUrl || rawIconUrl;
        if (basisUrl) {
            try {
                const urlObj = new URL(basisUrl);
                const origin = urlObj.origin;
                const domain = urlObj.hostname;
                
                // Special handling for Gmail
                if (domain === 'mail.google.com' || domain.includes('mail.google.com')) {
                    add('https://icons.duckduckgo.com/ip3/mail.google.com.ico');
                    add('https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico');
                    add('https://api.faviconkit.com/mail.google.com/144');
                    add('https://icon.horse/icon/mail.google.com');
                    add('https://favicon.yandex.net/favicon/mail.google.com');
                    add('https://logo.clearbit.com/mail.google.com');
                    add(`${origin}/favicon.ico`);
                    return candidates.length > 0 ? candidates : ['icon.png'];
                }
                
                // Special handling for Proton Mail
                if (domain === 'mail.proton.me' || domain.includes('mail.proton.me') || 
                    domain === 'proton.me' || domain.includes('proton.me')) {
                    add('https://icons.duckduckgo.com/ip3/mail.proton.me.ico');
                    add(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
                    add('https://api.faviconkit.com/mail.proton.me/144');
                    add('https://icon.horse/icon/mail.proton.me');
                    add('https://favicon.yandex.net/favicon/mail.proton.me');
                    add('https://logo.clearbit.com/mail.proton.me');
                    add(`${origin}/favicon.ico`);
                    return candidates.length > 0 ? candidates : ['icon.png'];
                }
                
                // Prioritize site's own favicon first
                add(`${origin}/favicon.ico`);
                const skipAppleTouchDomains = ['www.google.com', 'google.com', 'mail.google.com', 'mail.proton.me', 'proton.me'];
                if (!skipAppleTouchDomains.some(d => domain === d || domain.endsWith('.' + d))) {
                    add(`${origin}/apple-touch-icon.png`);
                    add(`${origin}/apple-touch-icon-precomposed.png`);
                }
            } catch (e) {
                // Ignore parse errors
            }
        }

        if (rawIconUrl) add(rawIconUrl);

        // Add icon services as fallbacks
        if (basisUrl) {
            try {
                const urlObj = new URL(basisUrl);
                const domain = urlObj.hostname;
                
                const skipGoogleS2Domains = ['mail.google.com'];
                if (!skipGoogleS2Domains.some(d => domain === d || domain.endsWith('.' + d))) {
                    add(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
                }
                
                if (domain !== 'mail.google.com' && !domain.includes('mail.google.com') &&
                    domain !== 'mail.proton.me' && !domain.includes('mail.proton.me') &&
                    domain !== 'proton.me' && !domain.includes('proton.me')) {
                    add(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
                }
                
                add(`https://api.faviconkit.com/${domain}/144`);
                add(`https://icon.horse/icon/${domain}`);
                add(`https://favicon.yandex.net/favicon/${domain}`);
                add(`https://logo.clearbit.com/${domain}`);
                add(`https://favicons.githubusercontent.com/${domain}`);
            } catch (e) {
                // Ignore parse errors
            }
        }

        if (candidates.length === 0) add("icon.png");
        return candidates;
    }

    /**
     * Check if URL is from a service that doesn't support CORS
     * @param {string} url
     * @returns {boolean}
     */
    function _isNonCorsService(url) {
        if (!url) return false;
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            const path = urlObj.pathname.toLowerCase();
            
            const nonCorsServices = [
                'icons.duckduckgo.com',
                't0.gstatic.com', 't1.gstatic.com', 't2.gstatic.com',
                't3.gstatic.com', 't4.gstatic.com', 't5.gstatic.com',
                'logo.clearbit.com',
                'icon.horse',
                'favicon.yandex.net',
                'api.faviconkit.com',
                'favicons.githubusercontent.com'
            ];
            
            if (hostname.endsWith('.gstatic.com') || nonCorsServices.includes(hostname)) {
                return true;
            }
            
            if (hostname === 'www.google.com' && path.includes('/s2/favicons')) {
                return true;
            }
            
            const nonCorsDomains = [
                'youtube.com', 'www.youtube.com',
                'bilibili.com', 'www.bilibili.com',
                'mail.google.com',
                'mail.proton.me', 'proton.me',
                'github.com', 'www.github.com'
            ];
            
            const isIconRequest = path.includes('favicon') || 
                                 path.includes('apple-touch-icon') ||
                                 path.includes('icon');
            
            if (isIconRequest && nonCorsDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
                return true;
            }
            
            return false;
        } catch (e) {
            return false;
        }
    }

    /**
     * Fetch icon as data URL (for CORS-enabled services)
     * @param {string} url - Icon URL
     * @returns {Promise<string>} Data URL
     */
    async function _fetchIconAsDataUrl(url) {
        if (_isNonCorsService(url)) {
            throw new Error('Service does not support CORS, use Image fallback');
        }
        
        try {
            // Note: HTTP response header warnings (x-content-type-options, set-cookie, etc.)
            // are from external servers and cannot be controlled by the extension
            const response = await fetch(url, { 
                mode: 'cors',
                credentials: 'omit',
                redirect: 'follow',
                headers: {
                    'Accept': 'image/*,*/*;q=0.8',
                    'User-Agent': navigator.userAgent
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const blob = await response.blob();
            return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (fetchErr) {
            throw new Error('Fetch failed, use Image fallback');
        }
    }

    /**
     * Load icon via Image element (for non-CORS services)
     * @param {string} url - Icon URL
     * @returns {Promise<string>} Data URL or original URL
     */
    async function _loadIconViaImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            if (!_isNonCorsService(url)) {
                img.crossOrigin = 'anonymous';
            }
            
            const timeout = setTimeout(() => {
                img.onload = null;
                img.onerror = null;
                img.src = '';
                reject(new Error('Image load timeout'));
            }, 5000);
            
            let resolved = false;
            
            img.onload = () => {
                if (resolved) return;
                resolved = true;
                clearTimeout(timeout);
                try {
                    if (_isNonCorsService(url)) {
                        resolve(url);
                        return;
                    }
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width || 64;
                    canvas.height = img.height || 64;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                } catch (err) {
                    if (err.name === 'SecurityError' || err.message.includes('tainted')) {
                        resolve(url);
                    } else {
                        reject(err);
                    }
                }
            };
            
            img.onerror = () => {
                if (resolved) return;
                resolved = true;
                clearTimeout(timeout);
                img.src = '';
                reject(new Error('Image load failed'));
            };
            
            img.src = url;
        });
    }

    /**
     * Open IndexedDB for icon cache
     * @returns {Promise<IDBDatabase>}
     */
    function _openIconCacheDB() {
        if (_iconCacheDbPromise) return _iconCacheDbPromise;
        _iconCacheDbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(ICON_CACHE_DB_NAME, ICON_CACHE_DB_VERSION);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(ICON_CACHE_STORE)) {
                    db.createObjectStore(ICON_CACHE_STORE, { keyPath: 'key' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        return _iconCacheDbPromise;
    }

    /**
     * Check if icon cache entry is fresh
     * @param {Object} entry - Cache entry
     * @returns {boolean}
     */
    function _isIconFresh(entry) {
        if (!entry) return false;
        if (entry.version !== ICON_CACHE_VERSION) return false;
        return (Date.now() - entry.updatedAt) < ICON_CACHE_TTL;
    }

    /**
     * Clean up expired entries from the IndexedDB icon cache.
     * Runs as a best-effort background task on init.
     */
    async function _cleanupExpiredIconCache() {
        try {
            const db = await _openIconCacheDB();
            const now = Date.now();
            const expiredKeys = [];

            await new Promise((resolve) => {
                const tx = db.transaction(ICON_CACHE_STORE, 'readonly');
                const store = tx.objectStore(ICON_CACHE_STORE);
                const req = store.openCursor();
                req.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        const entry = cursor.value;
                        if (!entry || (entry.updatedAt && (now - entry.updatedAt) > ICON_CACHE_TTL)) {
                            expiredKeys.push(cursor.key);
                        }
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
                req.onerror = () => resolve();
            });

            if (expiredKeys.length === 0) return;

            await new Promise((resolve) => {
                const tx = db.transaction(ICON_CACHE_STORE, 'readwrite');
                const store = tx.objectStore(ICON_CACHE_STORE);
                expiredKeys.forEach(key => store.delete(key));
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        } catch (_) {
            // Silent failure: cleanup is best-effort
        }
    }

    /**
     * Get icon from IndexedDB
     * @param {string} key - Cache key
     * @returns {Promise<Object|null>}
     */
    async function _getIconFromDB(key) {
        const db = await _openIconCacheDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(ICON_CACHE_STORE, 'readonly');
            const store = tx.objectStore(ICON_CACHE_STORE);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Put icon to IndexedDB
     * @param {string} key - Cache key
     * @param {string|null} dataUrl - Icon data URL or null for failed
     * @returns {Promise<Object>}
     */
    async function _putIconToDB(key, dataUrl) {
        const db = await _openIconCacheDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(ICON_CACHE_STORE, 'readwrite');
            const store = tx.objectStore(ICON_CACHE_STORE);
            const record = { 
                key, 
                data: dataUrl || null, 
                status: dataUrl ? 'ok' : 'failed',
                updatedAt: Date.now(), 
                version: ICON_CACHE_VERSION 
            };
            store.put(record);
            tx.oncomplete = () => resolve(record);
            tx.onerror = () => reject(tx.error);
        });
    }

    /**
     * Update all images with matching cache key
     * @param {string} key - Cache key
     * @param {string} dataUrl - Icon data URL
     */
    function _updateImagesForKey(key, dataUrl) {
        document.querySelectorAll(`img[data-cache-key="${key}"]`).forEach(img => {
            img.src = dataUrl;
        });
    }

    /**
     * Cache icon (fetch and store)
     * @param {string} key - Cache key
     * @param {string} rawIconUrl - Provided icon URL
     * @param {string} pageUrl - Page URL
     * @returns {Promise<void>}
     */
    async function cacheIcon(key, rawIconUrl, pageUrl) {
        if (_iconCacheInFlight.has(key)) return _iconCacheInFlight.get(key);

        const task = (async () => {
            const candidates = _buildIconCandidates(rawIconUrl, pageUrl);
            for (const candidate of candidates) {
                try {
                    if (_isNonCorsService(candidate)) {
                        const result = await _loadIconViaImage(candidate);
                        _setLruMap(_iconCacheInMemory, key, { data: result, updatedAt: Date.now(), version: ICON_CACHE_VERSION, status: 'ok' });
                        if (result.startsWith('data:')) {
                            await _putIconToDB(key, result);
                            localStorage.setItem(`icon_cache_${key}`, result);
                        }
                        _updateImagesForKey(key, result);
                        return;
                    }
                    
                    const dataUrl = await _fetchIconAsDataUrl(candidate);
                    _setLruMap(_iconCacheInMemory, key, { data: dataUrl, updatedAt: Date.now(), version: ICON_CACHE_VERSION, status: 'ok' });
                    await _putIconToDB(key, dataUrl);
                    _updateImagesForKey(key, dataUrl);
                    localStorage.setItem(`icon_cache_${key}`, dataUrl);
                    return;
                } catch (fetchErr) {
                    try {
                        const result = await _loadIconViaImage(candidate);
                        _setLruMap(_iconCacheInMemory, key, { data: result, updatedAt: Date.now(), version: ICON_CACHE_VERSION, status: 'ok' });
                        if (result.startsWith('data:')) {
                            await _putIconToDB(key, result);
                            localStorage.setItem(`icon_cache_${key}`, result);
                        }
                        _updateImagesForKey(key, result);
                        return;
                    } catch (imgErr) {
                        continue;
                    }
                }
            }
            
            // Mark as failed
            const failedEntry = {
                key,
                data: null,
                status: 'failed',
                updatedAt: Date.now(),
                version: ICON_CACHE_VERSION
            };
            _iconCacheInMemory.set(key, failedEntry);
            try {
                await _putIconToDB(key, null);
            } catch (_) {
                // ignore DB failure
            }
        })().finally(() => {
            _iconCacheInFlight.delete(key);
        });

        _setLruMap(_iconCacheInFlight, key, task);
        return task;
    }

    /**
     * Get icon source (with caching)
     * @param {string} key - Cache key
     * @param {string} url - Provided icon URL
     * @param {string} pageUrl - Page URL
     * @returns {string} Icon URL or data URL
     */
    function getIconSrc(key, url, pageUrl) {
        const preferredUrl = url || (pageUrl ? getFavicon(pageUrl) : null) || "icon.png";

        // 1) In-memory cache
        const mem = _iconCacheInMemory.get(key);
        if (mem && _isIconFresh(mem)) {
            const isFailed = mem.status === 'failed' || !mem.data;
            if (isFailed) {
                return preferredUrl;
            }
            return mem.data;
        }

        // 2) Legacy localStorage
        const legacy = localStorage.getItem(`icon_cache_${key}`);
        if (legacy) {
            _iconCacheInMemory.set(key, { data: legacy, updatedAt: Date.now(), version: ICON_CACHE_VERSION, status: 'ok' });
            _putIconToDB(key, legacy).catch(() => {});
            cacheIcon(key, preferredUrl, pageUrl);
            return legacy;
        }

        // 3) IndexedDB async fetch
        _getIconFromDB(key).then(entry => {
            if (entry && _isIconFresh(entry)) {
                const isFailed = entry.status === 'failed' || !entry.data;
                _iconCacheInMemory.set(key, entry);
                if (!isFailed && entry.data) {
                    _updateImagesForKey(key, entry.data);
                }
                if (!isFailed) {
                    return;
                }
                return;
            } else if (entry && entry.data) {
                _iconCacheInMemory.set(key, entry);
                _updateImagesForKey(key, entry.data);
                cacheIcon(key, preferredUrl, pageUrl);
                return;
            } else {
                cacheIcon(key, preferredUrl, pageUrl);
                return;
            }
        }).catch((err) => {
            cacheIcon(key, preferredUrl, pageUrl);
        });

        // 4) Fallback to live URL
        return preferredUrl;
    }

    // ==================== Shortcut Management ====================

    /**
     * Check if item is a folder
     * @param {Object} item - Shortcut item
     * @returns {boolean}
     */
    function _isFolder(item) {
        return item && item.type === 'folder' && Array.isArray(item.items);
    }

    /**
     * Create folder name
     * @returns {string}
     */
    function _createFolderName() {
        const base = (window.I18n && I18n.t) ? I18n.t('folderDefault', 'Folder') : 'Folder';
        const ts = Date.now().toString().slice(-3);
        return `${base} ${ts}`;
    }

    /**
     * Ensure shortcut has an ID
     * @param {Object} item - Shortcut item
     * @returns {Object}
     */
    function _ensureShortcutId(item) {
        if (!item.id) {
            item.id = `shortcut_${Math.random().toString(36).slice(2, 8)}`;
        }
        return item;
    }

    /**
     * Migrate shortcuts (fix known problematic icons)
     * @param {Array} shortcutsList - Shortcuts array
     * @returns {boolean} Whether migration occurred
     */
    function _migrateShortcuts(shortcutsList) {
        let migrated = false;
        shortcutsList.forEach((s) => {
            if (!s || typeof s.url !== 'string') return;
            
            if (s.url.includes('bilibili.com') && typeof s.icon === 'string' && s.icon.includes('www.bilibili.com')) {
                s.icon = "https://bilibili.com/favicon.ico";
                migrated = true;
            }
            
            if (s.url.includes('mail.google.com') && typeof s.icon === 'string' && s.icon.includes('mail.google.com/favicon.ico')) {
                s.icon = "https://icons.duckduckgo.com/ip3/mail.google.com.ico";
                migrated = true;
            }
            
            if (s.url.includes('mail.proton.me') || s.url.includes('proton.me')) {
                if (typeof s.icon === 'string' && (s.icon.includes('mail.proton.me') || s.icon.includes('proton.me'))) {
                    s.icon = "https://icons.duckduckgo.com/ip3/mail.proton.me.ico";
                    migrated = true;
                }
            }
        });
        return migrated;
    }

    /**
     * Load shortcuts from localStorage
     * @returns {Array}
     */
    function _loadShortcuts() {
        try {
            const stored = localStorage.getItem("shortcuts");
            const shortcutsList = stored ? JSON.parse(stored) : null;
            
            if (!shortcutsList || !Array.isArray(shortcutsList) || shortcutsList.length === 0) {
                return JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS));
            }
            
            if (_migrateShortcuts(shortcutsList)) {
                localStorage.setItem("shortcuts", JSON.stringify(shortcutsList));
            }
            
            return shortcutsList;
        } catch (e) {
            console.warn('Failed to parse shortcuts from localStorage, using defaults');
            return JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS));
        }
    }

    /**
     * Save shortcuts to localStorage
     */
    function _saveShortcuts() {
        localStorage.setItem("shortcuts", JSON.stringify(shortcuts));
        if (onShortcutsChange) {
            onShortcutsChange();
        }
    }

    /**
     * Render shortcuts list (for settings modal)
     */
    function renderShortcutsList() {
        if (!shortcutsListElement) return;
        
        shortcutsListElement.innerHTML = '';
        shortcuts.forEach((shortcut, index) => {
            const div = document.createElement("div");
            div.className = "list-item";

            const spanInfo = document.createElement("span");
            if (_isFolder(shortcut)) {
                const folderIcon = document.createElement('span');
                folderIcon.textContent = '[Folder]';
                folderIcon.style.marginRight = '8px';
                spanInfo.appendChild(folderIcon);
                spanInfo.appendChild(document.createTextNode(shortcut.name || 'Folder'));
            } else {
                const img = document.createElement('img');
                _decorateImg(img);
                const cacheKey = `shortcut_${shortcut.url}`;
                img.src = getIconSrc(cacheKey, shortcut.icon, shortcut.url);
                img.dataset.cacheKey = cacheKey;
                img.width = 20;
                img.height = 20;
                img.onerror = () => {
                    img.style.display = 'none';
                    const fallback = document.createElement('span');
                    fallback.textContent = shortcut.name.charAt(0).toUpperCase();
                    fallback.style.fontWeight = '600';
                    spanInfo.appendChild(fallback);
                };
                spanInfo.appendChild(img);
                spanInfo.appendChild(document.createTextNode(' ' + shortcut.name));
            }
            div.appendChild(spanInfo);

            const deleteBtn = document.createElement("span");
            deleteBtn.className = "delete-btn";
            deleteBtn.textContent = '\u00D7';
            const deleteLabel = shortcut.name || shortcut.url || 'shortcut';
            const deleteAriaLabel = (window.I18n && I18n.getMessage)
                ? (I18n.getMessage('deleteShortcutAriaLabel', deleteLabel) || `Delete shortcut ${deleteLabel}`)
                : `Delete shortcut ${deleteLabel}`;
            deleteBtn.setAttribute('aria-label', deleteAriaLabel);
            deleteBtn.setAttribute('role', 'button');
            deleteBtn.setAttribute('tabindex', '0');
            deleteBtn.addEventListener("click", () => {
                // Use global deleteShortcut if available (for confirmation dialog)
                // Otherwise use ShortcutManager's delete method directly
                if (typeof window.deleteShortcut === 'function') {
                    window.deleteShortcut(index);
                } else if (ShortcutManager.delete) {
                    ShortcutManager.delete(index);
                }
            });
            div.appendChild(deleteBtn);

            shortcutsListElement.appendChild(div);
        });
    }

    /**
     * Render shortcuts grid (main display)
     * @param {Function} onDragStart - Drag start handler
     * @param {Function} onDragEnd - Drag end handler
     * @param {Function} onDragOver - Drag over handler
     * @param {Function} onDrop - Drop handler
     * @param {Function} onDragLeave - Drag leave handler
     * @param {Function} onFolderClick - Folder click handler (optional)
     */
    function renderShortcutsGrid(onDragStart, onDragEnd, onDragOver, onDrop, onDragLeave, onFolderClick) {
        if (!shortcutsGridElement) return;
        
        shortcutsGridElement.innerHTML = '';
        shortcutsGridElement.setAttribute('role', 'list');

        const showNames = localStorage.getItem('showShortcutNames') !== 'false';
        shortcutsGridElement.classList.toggle('hide-names', !showNames);
        const targetPref = (localStorage.getItem(SHORTCUT_TARGET_KEY) || 'current') === 'newtab' ? '_blank' : '_self';

        shortcuts.forEach((shortcut, index) => {
            const a = document.createElement("a");
            a.className = "shortcut-item";
            a.setAttribute('role', 'listitem');
            a.draggable = true;
            a.dataset.index = index;
            a.target = targetPref;
            a.href = shortcut.url || '#';
            if (targetPref === '_blank') {
                a.rel = 'noopener noreferrer';
            }
            // aria-label describing the destination
            const shortcutLabel = shortcut.name || shortcut.url || 'Shortcut';
            a.setAttribute('aria-label', shortcutLabel);

            if (_isFolder(shortcut)) {
                a.classList.add('shortcut-folder');
                a.href = 'javascript:void(0)';
                a.dataset.type = 'folder';
                if (onFolderClick) {
                    a.addEventListener('click', () => onFolderClick(index));
                }

                const iconDiv = document.createElement('div');
                iconDiv.className = 'shortcut-icon folder-icon';

                // Folder tab
                const folderTab = document.createElement('div');
                folderTab.className = 'folder-tab';
                iconDiv.appendChild(folderTab);

                // Folder body
                const folderBody = document.createElement('div');
                folderBody.className = 'folder-body';

                // Paper stack preview
                const paperStack = document.createElement('div');
                paperStack.className = 'folder-paper-stack';
                const previews = shortcut.items.slice(0, 3);
                previews.forEach((item, i) => {
                    const paper = document.createElement('div');
                    paper.className = 'folder-paper';
                    paper.style.zIndex = 3 - i;
                    const img = document.createElement('img');
                    img.alt = item.name;
                    img.draggable = false;
                    const cacheKey = `shortcut_${item.url || item.id}`;
                    img.src = getIconSrc(cacheKey, item.icon || '', item.url);
                    img.onerror = () => {
                        img.style.display = 'none';
                        paper.textContent = (item.name || '?').charAt(0).toUpperCase();
                        paper.classList.add('folder-paper-fallback');
                    };
                    paper.appendChild(img);
                    paperStack.appendChild(paper);
                });
                folderBody.appendChild(paperStack);

                // Count badge
                const count = shortcut.items.length;
                if (count > 0) {
                    const badge = document.createElement('span');
                    badge.className = 'folder-count-badge';
                    badge.textContent = count > 99 ? '99+' : String(count);
                    folderBody.appendChild(badge);
                }

                iconDiv.appendChild(folderBody);

                const nameDiv = document.createElement('div');
                nameDiv.className = 'shortcut-name';
                nameDiv.textContent = shortcut.name || ((typeof I18n !== 'undefined' && I18n.getMessage)
                    ? I18n.getMessage('folderDefault', 'Folder')
                    : 'Folder');

                a.appendChild(iconDiv);
                a.appendChild(nameDiv);
            } else {
                a.href = shortcut.url;
                a.dataset.type = 'item';

                const iconDiv = document.createElement("div");
                iconDiv.className = "shortcut-icon loading";

                const img = document.createElement("img");
                img.alt = shortcut.name;
                img.width = 24;
                img.height = 24;
                _decorateImg(img);
                
                const cacheKey = `shortcut_${shortcut.url}`;
                img.dataset.cacheKey = cacheKey;
                const iconSrc = getIconSrc(cacheKey, shortcut.icon, shortcut.url);
                img.src = iconSrc;

                // Apply icon color background if enabled (will be applied after image loads)
                // Note: We wait for image to load to ensure accurate color extraction

                img.onload = () => {
                    iconDiv.classList.remove("loading");
                };
                img.onerror = () => {
                    iconDiv.classList.remove("loading");
                    img.style.display = 'none';
                    iconDiv.textContent = shortcut.name.charAt(0).toUpperCase();
                    iconDiv.style.fontSize = '18px';
                    iconDiv.style.fontWeight = '600';
                    iconDiv.classList.add('shortcut-icon-fallback');
                    iconDiv.title = (window.I18n && I18n.getMessage)
                        ? (I18n.getMessage('shortcutIconError') || 'Icon failed to load, using initial instead.')
                        : 'Icon failed to load, using initial instead.';
                };

                iconDiv.appendChild(img);

                const nameDiv = document.createElement("div");
                nameDiv.className = "shortcut-name";
                nameDiv.textContent = shortcut.name;

                a.appendChild(iconDiv);
                a.appendChild(nameDiv);
            }
            
            // Add drag event listeners if provided
            if (onDragStart) a.addEventListener('dragstart', onDragStart);
            if (onDragEnd) a.addEventListener('dragend', onDragEnd);
            if (onDragOver) a.addEventListener('dragover', onDragOver);
            if (onDrop) a.addEventListener('drop', onDrop);
            if (onDragLeave) a.addEventListener('dragleave', onDragLeave);
            
            shortcutsGridElement.appendChild(a);
        });
    }

    // ==================== Public API ====================

    return {
        /**
         * Initialize shortcut manager
         * @param {Object} options - Configuration options
         * @param {HTMLElement} options.listElement - Shortcuts list element (for settings)
         * @param {HTMLElement} options.gridElement - Shortcuts grid element (main display)
         * @param {Function} options.onChange - Callback when shortcuts change
         */
        init(options = {}) {
            shortcutsListElement = options.listElement || document.getElementById('shortcutsList');
            shortcutsGridElement = options.gridElement || document.getElementById('shortcuts');
            onShortcutsChange = options.onChange || null;

            // Load settings
            _loadShortcutSettings();

            shortcuts = _loadShortcuts();
            if (shortcuts.length === 0) {
                shortcuts = JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS));
                _saveShortcuts();
            }

            // Periodic cleanup of expired IndexedDB icon cache entries
            _cleanupExpiredIconCache().catch(() => {});
        },

        /**
         * Get all shortcuts
         * @returns {Array}
         */
        getAll() {
            return shortcuts;
        },

        /**
         * Add shortcut
         * @param {Object} shortcut - Shortcut object {name, url, icon?}
         */
        add(shortcut) {
            if (!shortcut || !shortcut.name) {
                throw new Error('Shortcut must have name');
            }
            // Folders do not require a url
            if (shortcut.type !== 'folder' && !shortcut.url) {
                throw new Error('Shortcut must have url');
            }
            shortcuts.push(shortcut);
            _saveShortcuts();
        },

        /**
         * Delete shortcut
         * @param {number} index - Shortcut index
         * @param {Object} options - Options {silent?: boolean}
         * @returns {boolean} Whether deletion occurred
         */
        delete(index, options = {}) {
            const shortcut = shortcuts[index];
            if (!shortcut) return false;

            const { silent } = options;
            if (!silent) {
                const label = shortcut.name || shortcut.url || 'shortcut';
                const i18nMsg = (window.I18n && I18n.getMessage) ? I18n.getMessage('deleteShortcutConfirm') : '';
                let message = i18nMsg || '';

                if (!message) {
                    const lang = (window.I18n && I18n.getCurrentLanguage && I18n.getCurrentLanguage()) ||
                        (navigator.language || '').toLowerCase();
                    if (lang.startsWith('zh')) {
                        message = '确认删除快捷方式"%s"？';
                    } else if (lang.startsWith('ja')) {
                        message = 'ショートカット"%s"を削除しますか？';
                    } else {
                        message = 'Delete shortcut "%s"?';
                    }
                }

                if (message.includes('%s')) {
                    message = message.replace('%s', label);
                } else {
                    message = `${message} "${label}"?`;
                }
                const confirmed = confirm(message);
                if (!confirmed) return false;
            }

            shortcuts.splice(index, 1);
            _saveShortcuts();
            return true;
        },

        /**
         * Update shortcut
         * @param {number} index - Shortcut index
         * @param {Object} shortcut - Updated shortcut object
         */
        update(index, shortcut) {
            if (index < 0 || index >= shortcuts.length) {
                throw new Error('Invalid shortcut index');
            }
            shortcuts[index] = { ...shortcuts[index], ...shortcut };
            _saveShortcuts();
        },

        /**
         * Reorder shortcuts
         * @param {number} fromIndex - Source index
         * @param {number} toIndex - Target index
         */
        reorder(fromIndex, toIndex) {
            if (fromIndex < 0 || fromIndex >= shortcuts.length ||
                toIndex < 0 || toIndex >= shortcuts.length) {
                throw new Error('Invalid shortcut index');
            }
            const item = shortcuts.splice(fromIndex, 1)[0];
            shortcuts.splice(toIndex, 0, item);
            _saveShortcuts();
        },

        /**
         * Reset to default shortcuts
         */
        reset() {
            shortcuts = JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS));
            _saveShortcuts();
        },

        // Icon management API
        getIconSrc,
        cacheIcon,
        getFavicon,
        _decorateImg, // Expose for external use

        // Settings API
        getShortcutSettings,
        updateShortcutSettings,

        // Rendering API
        renderShortcutsList,
        renderShortcutsGrid
    };
})();

// Export for global use
window.ShortcutManager = ShortcutManager;
