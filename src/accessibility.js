/**
 * Accessibility Manager Module
 * Provides built-in accessibility features for users with disabilities
 */

const AccessibilityManager = (function () {
    'use strict';

    // ==================== Configuration Constants ====================
    const CONFIG = {
        STORAGE_KEY: 'accessibilitySettings',
        CSS_CLASS_PREFIX: 'a11y-',
        THEMES: {
            STANDARD: 'standard',
            HIGH_CONTRAST_DARK: 'high-contrast-dark',
            HIGH_CONTRAST_LIGHT: 'high-contrast-light',
            YELLOW_BLACK: 'yellow-black'
        },
        FONT_FAMILIES: {
            DEFAULT: 'default',
            SANS: 'sans',
            SERIF: 'serif',
            DYSLEXIC: 'dyslexic'
        },
        LINE_SPACING: {
            NORMAL: 'normal',
            RELAXED: 'relaxed',
            VERY_RELAXED: 'very-relaxed'
        },
        LETTER_SPACING: {
            NORMAL: 'normal',
            WIDE: 'wide',
            WIDER: 'wider'
        },
        WORD_SPACING: {
            NORMAL: 'normal',
            WIDE: 'wide',
            WIDER: 'wider'
        },
        MOTION: {
            FULL: 'full',
            REDUCED: 'reduced',
            NONE: 'none'
        },
        FOCUS_STYLE: {
            STANDARD: 'standard',
            ENHANCED: 'enhanced',
            LARGE: 'large'
        },
        FONT_SIZE: {
            MIN: 80,
            MAX: 200,
            DEFAULT: 100
        }
    };

    // ==================== Default Settings ====================
    const DEFAULT_SETTINGS = {
        enabled: false,
        display: {
            theme: CONFIG.THEMES.STANDARD,
            fontSize: CONFIG.FONT_SIZE.DEFAULT,
            fontFamily: CONFIG.FONT_FAMILIES.DEFAULT,
            lineSpacing: CONFIG.LINE_SPACING.NORMAL,
            letterSpacing: CONFIG.LETTER_SPACING.NORMAL,
            wordSpacing: CONFIG.WORD_SPACING.NORMAL
        },
        motion: CONFIG.MOTION.FULL,
        focus: CONFIG.FOCUS_STYLE.STANDARD
    };

    // ==================== Private State ====================
    let _state = {
        settings: { ...DEFAULT_SETTINGS },
        isInitialized: false,
        liveRegion: null,
        skipLink: null
    };

    // ==================== DOM Element References ====================
    let _elements = {
        // Theme
        themeSelect: null,
        // Font
        fontSizeSlider: null,
        fontSizeValue: null,
        fontFamilySelect: null,
        lineSpacingSelect: null,
        // Letter spacing
        letterSpacingSelect: null,
        // Word spacing
        wordSpacingSelect: null,
        // Motion
        motionSelect: null,
        // Focus
        focusStyleSelect: null,
        // Reset
        resetBtn: null,
        // Shortcuts
        showShortcutsBtn: null,
        shortcutsModal: null,
        closeShortcutsBtn: null
    };

    // ==================== Settings Persistence ====================

    /**
     * Load settings from localStorage
     * @returns {Object} Settings object
     */
    function _loadSettings() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Deep merge with defaults to handle missing properties
                return _deepMerge(DEFAULT_SETTINGS, parsed);
            }
        } catch (e) {
            console.warn('Failed to load accessibility settings:', e);
        }
        return { ...DEFAULT_SETTINGS };
    }

    /**
     * Save settings to localStorage
     */
    function _saveSettings() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(_state.settings));
        } catch (e) {
            console.warn('Failed to save accessibility settings:', e);
        }
    }

    /**
     * Deep merge two objects
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} Merged object
     */
    function _deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = _deepMerge(target[key] || {}, source[key]);
            } else if (source[key] !== undefined) {
                result[key] = source[key];
            }
        }
        return result;
    }

    // ==================== Theme Management ====================

    /**
     * Apply theme to document
     * @param {string} theme - Theme identifier
     */
    function _applyTheme(theme) {
        const root = document.documentElement;
        
        // Remove all theme classes
        Object.values(CONFIG.THEMES).forEach(t => {
            root.classList.remove(`${CONFIG.CSS_CLASS_PREFIX}theme-${t}`);
        });

        // Add new theme class (skip for standard theme)
        if (theme !== CONFIG.THEMES.STANDARD) {
            root.classList.add(`${CONFIG.CSS_CLASS_PREFIX}theme-${theme}`);
        }

        _state.settings.display.theme = theme;
        _saveSettings();
        
        // Announce theme change to screen readers
        _announceToScreenReader(`Theme changed to ${theme}`);
    }

    // ==================== Font Management ====================

    /**
     * Apply font size to document
     * @param {number} size - Font size percentage (80-200)
     */
    function _applyFontSize(size) {
        const clampedSize = Math.max(CONFIG.FONT_SIZE.MIN, Math.min(CONFIG.FONT_SIZE.MAX, size));
        document.documentElement.style.setProperty('--a11y-font-scale', clampedSize / 100);
        
        _state.settings.display.fontSize = clampedSize;
        _saveSettings();
        
        // Update page title with font size for screen readers
        _updatePageTitle();
    }

    /**
     * Apply font family to document
     * @param {string} family - Font family identifier
     */
    function _applyFontFamily(family) {
        const root = document.documentElement;
        
        // Remove all font family classes
        Object.values(CONFIG.FONT_FAMILIES).forEach(f => {
            root.classList.remove(`${CONFIG.CSS_CLASS_PREFIX}font-${f}`);
        });

        // Add new font family class (skip for default)
        if (family !== CONFIG.FONT_FAMILIES.DEFAULT) {
            root.classList.add(`${CONFIG.CSS_CLASS_PREFIX}font-${family}`);
        }

        _state.settings.display.fontFamily = family;
        _saveSettings();
    }

    /**
     * Apply line spacing to document
     * @param {string} spacing - Line spacing identifier
     */
    function _applyLineSpacing(spacing) {
        const root = document.documentElement;
        
        // Remove all line spacing classes
        Object.values(CONFIG.LINE_SPACING).forEach(s => {
            root.classList.remove(`${CONFIG.CSS_CLASS_PREFIX}spacing-${s}`);
        });

        // Add new line spacing class (skip for normal)
        if (spacing !== CONFIG.LINE_SPACING.NORMAL) {
            root.classList.add(`${CONFIG.CSS_CLASS_PREFIX}spacing-${spacing}`);
        }

        _state.settings.display.lineSpacing = spacing;
        _saveSettings();
    }

    /**
     * Apply letter spacing to document
     * @param {string} spacing - Letter spacing identifier
     */
    function _applyLetterSpacing(spacing) {
        const root = document.documentElement;
        
        // Remove all letter spacing classes
        Object.values(CONFIG.LETTER_SPACING).forEach(s => {
            root.classList.remove(`${CONFIG.CSS_CLASS_PREFIX}letter-spacing-${s}`);
        });

        // Add new letter spacing class (skip for normal)
        if (spacing !== CONFIG.LETTER_SPACING.NORMAL) {
            root.classList.add(`${CONFIG.CSS_CLASS_PREFIX}letter-spacing-${spacing}`);
        }

        _state.settings.display.letterSpacing = spacing;
        _saveSettings();
    }

    /**
     * Apply word spacing to document
     * @param {string} spacing - Word spacing identifier
     */
    function _applyWordSpacing(spacing) {
        const root = document.documentElement;
        
        // Remove all word spacing classes
        Object.values(CONFIG.WORD_SPACING).forEach(s => {
            root.classList.remove(`${CONFIG.CSS_CLASS_PREFIX}word-spacing-${s}`);
        });

        // Add new word spacing class (skip for normal)
        if (spacing !== CONFIG.WORD_SPACING.NORMAL) {
            root.classList.add(`${CONFIG.CSS_CLASS_PREFIX}word-spacing-${spacing}`);
        }

        _state.settings.display.wordSpacing = spacing;
        _saveSettings();
    }

    // ==================== Motion Management ====================

    /**
     * Apply motion preference to document
     * @param {string} motion - Motion preference identifier
     */
    function _applyMotion(motion) {
        const root = document.documentElement;
        
        // Remove all motion classes
        Object.values(CONFIG.MOTION).forEach(m => {
            root.classList.remove(`${CONFIG.CSS_CLASS_PREFIX}motion-${m}`);
        });

        // Add new motion class (skip for full)
        if (motion !== CONFIG.MOTION.FULL) {
            root.classList.add(`${CONFIG.CSS_CLASS_PREFIX}motion-${motion}`);
        }

        _state.settings.motion = motion;
        _saveSettings();
    }

    // ==================== Focus Style Management ====================

    /**
     * Apply focus style to document
     * @param {string} style - Focus style identifier
     */
    function _applyFocusStyle(style) {
        const root = document.documentElement;
        
        // Remove all focus style classes
        Object.values(CONFIG.FOCUS_STYLE).forEach(s => {
            root.classList.remove(`${CONFIG.CSS_CLASS_PREFIX}focus-${s}`);
        });

        // Add new focus style class (skip for standard)
        if (style !== CONFIG.FOCUS_STYLE.STANDARD) {
            root.classList.add(`${CONFIG.CSS_CLASS_PREFIX}focus-${style}`);
        }

        _state.settings.focus = style;
        _saveSettings();
    }

    // ==================== Apply All Settings ====================

    /**
     * Apply all settings to document
     */
    function _applyAllSettings() {
        const { display, motion, focus } = _state.settings;
        
        _applyTheme(display.theme);
        _applyFontSize(display.fontSize);
        _applyFontFamily(display.fontFamily);
        _applyLineSpacing(display.lineSpacing);
        _applyLetterSpacing(display.letterSpacing);
        _applyWordSpacing(display.wordSpacing);
        _applyMotion(motion);
        _applyFocusStyle(focus);
    }

    // ==================== Event Handlers ====================

    /**
     * Handle theme change
     * @param {Event} e
     */
    function _handleThemeChange(e) {
        _applyTheme(e.target.value);
    }

    /**
     * Handle font size change
     * @param {Event} e
     */
    function _handleFontSizeChange(e) {
        const value = parseInt(e.target.value, 10);
        _applyFontSize(value);
        
        if (_elements.fontSizeValue) {
            _elements.fontSizeValue.textContent = `${value}%`;
            _announceToScreenReader(`Font size set to ${value} percent`);
        }
    }

    /**
     * Handle font family change
     * @param {Event} e
     */
    function _handleFontFamilyChange(e) {
        _applyFontFamily(e.target.value);
    }

    /**
     * Handle line spacing change
     * @param {Event} e
     */
    function _handleLineSpacingChange(e) {
        _applyLineSpacing(e.target.value);
        _announceToScreenReader(`Line spacing changed to ${e.target.value}`);
    }

    /**
     * Handle letter spacing change
     * @param {Event} e
     */
    function _handleLetterSpacingChange(e) {
        _applyLetterSpacing(e.target.value);
        _announceToScreenReader(`Letter spacing changed to ${e.target.value}`);
    }

    /**
     * Handle word spacing change
     * @param {Event} e
     */
    function _handleWordSpacingChange(e) {
        _applyWordSpacing(e.target.value);
        _announceToScreenReader(`Word spacing changed to ${e.target.value}`);
    }

    /**
     * Handle motion change
     * @param {Event} e
     */
    function _handleMotionChange(e) {
        _applyMotion(e.target.value);
    }

    /**
     * Handle focus style change
     * @param {Event} e
     */
    function _handleFocusStyleChange(e) {
        _applyFocusStyle(e.target.value);
        _announceToScreenReader(`Focus indicator changed to ${e.target.value}`);
    }

    /**
     * Handle motion change
     * @param {Event} e
     */
    function _handleMotionChange(e) {
        _applyMotion(e.target.value);
        _announceToScreenReader(`Animation preference changed to ${e.target.value}`);
    }

    /**
     * Handle font family change
     * @param {Event} e
     */
    function _handleFontFamilyChange(e) {
        _applyFontFamily(e.target.value);
        _announceToScreenReader(`Font family changed to ${e.target.value}`);
    }

    /**
     * Show keyboard shortcuts help
     */
    function _showShortcutsHelp() {
        // Ensure elements are cached
        if (!_elements.shortcutsModal) {
            _elements.shortcutsModal = document.getElementById('shortcutsModal');
        }
        if (!_elements.shortcutsModal) {
            console.warn('Shortcuts modal not found');
            return;
        }
        
        const shortcutsList = document.getElementById('shortcutsListContent');
        if (!shortcutsList) {
            console.warn('Shortcuts list content not found');
            return;
        }
        
        shortcutsList.innerHTML = '';
        
        const shortcuts = getShortcuts();
        const shortcutEntries = [
            { key: 'Alt + ↑', desc: 'switchEnginePrev', action: 'Switch to previous search engine' },
            { key: 'Alt + ↓', desc: 'switchEngineNext', action: 'Switch to next search engine' },
            { key: '/', desc: 'focusSearch', action: 'Focus search box' },
            { key: 'Alt + ,', desc: 'openSettings', action: 'Open settings' },
            { key: 'Esc', desc: 'closeModal', action: 'Close modal or cancel' },
            { key: 'Tab', desc: 'navigate', action: 'Navigate between elements' },
            { key: 'Enter', desc: 'activate', action: 'Activate button or link' }
        ];
        
        shortcutEntries.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'shortcut-help-item';
            div.style.cssText = 'display: flex; justify-content: space-between; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);';
            
            const keySpan = document.createElement('span');
            keySpan.className = 'shortcut-key';
            keySpan.style.cssText = 'font-weight: 600; font-family: monospace; background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px;';
            keySpan.textContent = entry.key;
            
            const descSpan = document.createElement('span');
            descSpan.className = 'shortcut-desc';
            descSpan.style.cssText = 'color: rgba(255,255,255,0.8);';
            // Try to get i18n text, fallback to action
            if (typeof I18n !== 'undefined' && I18n.getMessage) {
                const i18nText = I18n.getMessage(entry.desc);
                descSpan.textContent = i18nText !== entry.desc ? i18nText : entry.action;
            } else {
                descSpan.textContent = entry.action;
            }
            
            div.appendChild(keySpan);
            div.appendChild(descSpan);
            shortcutsList.appendChild(div);
        });
        
        // Show modal - use both display and active class for compatibility
        _elements.shortcutsModal.style.display = 'flex';
        _elements.shortcutsModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        _announceToScreenReader('Keyboard shortcuts help opened');
        
        // Focus close button
        if (!_elements.closeShortcutsBtn) {
            _elements.closeShortcutsBtn = document.getElementById('closeShortcuts');
        }
        if (_elements.closeShortcutsBtn) {
            setTimeout(() => _elements.closeShortcutsBtn.focus(), 100);
        }
    }

    /**
     * Hide keyboard shortcuts help
     */
    function _hideShortcutsHelp() {
        if (!_elements.shortcutsModal) {
            _elements.shortcutsModal = document.getElementById('shortcutsModal');
        }
        if (!_elements.shortcutsModal) return;
        
        _elements.shortcutsModal.style.display = 'none';
        _elements.shortcutsModal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
        _announceToScreenReader('Keyboard shortcuts help closed');
        
        // Return focus to show shortcuts button
        if (!_elements.showShortcutsBtn) {
            _elements.showShortcutsBtn = document.getElementById('a11yShowShortcuts');
        }
        if (_elements.showShortcutsBtn) {
            _elements.showShortcutsBtn.focus();
        }
    }

    /**
     * Handle reset button click
     */
    function _handleReset() {
        _state.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        _saveSettings();
        _applyAllSettings();
        _syncUI();
        _announceToScreenReader('Accessibility settings reset to defaults');
    }

    // ==================== UI Synchronization ====================

    /**
     * Sync UI elements with current settings
     */
    function _syncUI() {
        const { display, motion, focus } = _state.settings;

        // Theme
        if (_elements.themeSelect) {
            _elements.themeSelect.value = display.theme;
            if (typeof CustomSelect !== 'undefined') CustomSelect.sync(_elements.themeSelect);
        }

        // Font size
        if (_elements.fontSizeSlider) {
            _elements.fontSizeSlider.value = display.fontSize;
        }
        if (_elements.fontSizeValue) {
            _elements.fontSizeValue.textContent = `${display.fontSize}%`;
        }

        // Font family
        if (_elements.fontFamilySelect) {
            _elements.fontFamilySelect.value = display.fontFamily;
            if (typeof CustomSelect !== 'undefined') CustomSelect.sync(_elements.fontFamilySelect);
        }

        // Line spacing
        if (_elements.lineSpacingSelect) {
            _elements.lineSpacingSelect.value = display.lineSpacing;
            if (typeof CustomSelect !== 'undefined') CustomSelect.sync(_elements.lineSpacingSelect);
        }

        // Letter spacing
        if (_elements.letterSpacingSelect) {
            _elements.letterSpacingSelect.value = display.letterSpacing || CONFIG.LETTER_SPACING.NORMAL;
            if (typeof CustomSelect !== 'undefined') CustomSelect.sync(_elements.letterSpacingSelect);
        }

        // Word spacing
        if (_elements.wordSpacingSelect) {
            _elements.wordSpacingSelect.value = display.wordSpacing || CONFIG.WORD_SPACING.NORMAL;
            if (typeof CustomSelect !== 'undefined') CustomSelect.sync(_elements.wordSpacingSelect);
        }

        // Motion
        if (_elements.motionSelect) {
            _elements.motionSelect.value = motion;
            if (typeof CustomSelect !== 'undefined') CustomSelect.sync(_elements.motionSelect);
        }

        // Focus style
        if (_elements.focusStyleSelect) {
            _elements.focusStyleSelect.value = focus;
            if (typeof CustomSelect !== 'undefined') CustomSelect.sync(_elements.focusStyleSelect);
        }
    }

    // ==================== Screen Reader Support ====================

    /**
     * Create live region for screen reader announcements
     */
    function _createLiveRegion() {
        if (_state.liveRegion) return;
        
        const liveRegion = document.createElement('div');
        liveRegion.id = 'a11y-live-region';
        liveRegion.setAttribute('role', 'status');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
        document.body.appendChild(liveRegion);
        _state.liveRegion = liveRegion;
    }

    /**
     * Announce message to screen readers
     * @param {string} message - Message to announce
     */
    function _announceToScreenReader(message) {
        if (!_state.liveRegion) {
            _createLiveRegion();
        }
        
        // Clear previous message
        _state.liveRegion.textContent = '';
        
        // Set new message (with slight delay to ensure screen reader picks it up)
        setTimeout(() => {
            _state.liveRegion.textContent = message;
            // Clear after announcement
            setTimeout(() => {
                _state.liveRegion.textContent = '';
            }, 1000);
        }, 100);
    }

    /**
     * Update page title with accessibility information
     */
    function _updatePageTitle() {
        try {
            const manifest = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest 
                ? chrome.runtime.getManifest() 
                : null;
            const appName = manifest ? manifest.name : 'GenresFox';
            const fontSize = _state.settings.display.fontSize;
            const theme = _state.settings.display.theme;
            
            let title = appName;
            if (fontSize !== CONFIG.FONT_SIZE.DEFAULT) {
                title += ` - Font: ${fontSize}%`;
            }
            if (theme !== CONFIG.THEMES.STANDARD) {
                title += ` - ${theme}`;
            }
            
            document.title = title;
        } catch (e) {
            console.warn('Failed to update page title:', e);
        }
    }

    /**
     * Create skip link for keyboard navigation
     */
    function _createSkipLink() {
        if (_state.skipLink) return;
        
        const skipLink = document.createElement('a');
        skipLink.href = '#search';
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Skip to main content';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 0;
            background: #000;
            color: #fff;
            padding: 8px 16px;
            text-decoration: none;
            z-index: 10000;
        `;
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '0';
        });
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        document.body.insertBefore(skipLink, document.body.firstChild);
        _state.skipLink = skipLink;
    }

    // ==================== Initialization ====================

    /**
     * Cache DOM element references
     */
    function _cacheElements() {
        _elements = {
            themeSelect: document.getElementById('a11yTheme'),
            fontSizeSlider: document.getElementById('a11yFontSize'),
            fontSizeValue: document.getElementById('a11yFontSizeValue'),
            fontFamilySelect: document.getElementById('a11yFontFamily'),
            lineSpacingSelect: document.getElementById('a11yLineSpacing'),
            letterSpacingSelect: document.getElementById('a11yLetterSpacing'),
            wordSpacingSelect: document.getElementById('a11yWordSpacing'),
            motionSelect: document.getElementById('a11yMotion'),
            focusStyleSelect: document.getElementById('a11yFocusStyle'),
            resetBtn: document.getElementById('a11yReset'),
            showShortcutsBtn: document.getElementById('a11yShowShortcuts'),
            shortcutsModal: document.getElementById('shortcutsModal'),
            closeShortcutsBtn: document.getElementById('closeShortcuts')
        };
    }

    /**
     * Bind event listeners
     */
    function _bindEvents() {
        if (_elements.themeSelect) {
            _elements.themeSelect.addEventListener('change', _handleThemeChange);
        }
        if (_elements.fontSizeSlider) {
            _elements.fontSizeSlider.addEventListener('input', _handleFontSizeChange);
        }
        if (_elements.fontFamilySelect) {
            _elements.fontFamilySelect.addEventListener('change', _handleFontFamilyChange);
        }
        if (_elements.lineSpacingSelect) {
            _elements.lineSpacingSelect.addEventListener('change', _handleLineSpacingChange);
        }
        if (_elements.letterSpacingSelect) {
            _elements.letterSpacingSelect.addEventListener('change', _handleLetterSpacingChange);
        }
        if (_elements.wordSpacingSelect) {
            _elements.wordSpacingSelect.addEventListener('change', _handleWordSpacingChange);
        }
        if (_elements.motionSelect) {
            _elements.motionSelect.addEventListener('change', _handleMotionChange);
        }
        if (_elements.focusStyleSelect) {
            _elements.focusStyleSelect.addEventListener('change', _handleFocusStyleChange);
        }
        if (_elements.resetBtn) {
            _elements.resetBtn.addEventListener('click', _handleReset);
        }
        if (_elements.showShortcutsBtn) {
            _elements.showShortcutsBtn.addEventListener('click', _showShortcutsHelp);
        }
        if (_elements.closeShortcutsBtn) {
            _elements.closeShortcutsBtn.addEventListener('click', _hideShortcutsHelp);
        }
        if (_elements.shortcutsModal) {
            _elements.shortcutsModal.addEventListener('click', (e) => {
                if (e.target === _elements.shortcutsModal) {
                    _hideShortcutsHelp();
                }
            });
        }
        
        // Close shortcuts modal on Escape key (only if modal is visible)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (_elements.shortcutsModal && (_elements.shortcutsModal.classList.contains('active') || _elements.shortcutsModal.style.display === 'flex')) {
                    _hideShortcutsHelp();
                }
            }
        });
    }

    // ==================== Public API ====================

    /**
     * Initialize the accessibility manager
     * @param {Object} options - Initialization options
     * @param {boolean} options.delayCustomSelects - Delay custom select init for i18n
     */
    function init(options = {}) {
        if (_state.isInitialized) {
            console.warn('AccessibilityManager already initialized');
            return;
        }

        // 1. Create accessibility infrastructure
        _createLiveRegion();
        _createSkipLink();

        // 2. Load saved settings
        _state.settings = _loadSettings();

        // 3. Cache DOM elements
        _cacheElements();

        // 4. Bind events (on native selects, they still work)
        _bindEvents();

        // 5. Apply all settings (theme, font, etc. - apply early)
        _applyAllSettings();

        // 6. Sync UI (native selects)
        _syncUI();

        // 7. Initialize keyboard shortcuts
        _initKeyboardShortcuts();

        // 8. Enhance ARIA attributes
        _enhanceARIA();

        // 9. Update page title
        _updatePageTitle();

        _state.isInitialized = true;

        // 10. Custom selects will be initialized by CustomSelect module after i18n
    }

    /**
     * Enhance ARIA attributes for better screen reader support
     */
    function _enhanceARIA() {
        // Add ARIA labels to controls
        if (_elements.themeSelect) {
            _elements.themeSelect.setAttribute('aria-label', 'Select theme');
        }
        if (_elements.fontSizeSlider) {
            _elements.fontSizeSlider.setAttribute('aria-label', 'Font size');
            _elements.fontSizeSlider.setAttribute('aria-valuemin', CONFIG.FONT_SIZE.MIN);
            _elements.fontSizeSlider.setAttribute('aria-valuemax', CONFIG.FONT_SIZE.MAX);
            _elements.fontSizeSlider.setAttribute('aria-valuenow', _state.settings.display.fontSize);
        }
        if (_elements.fontFamilySelect) {
            _elements.fontFamilySelect.setAttribute('aria-label', 'Select font family');
        }
        if (_elements.lineSpacingSelect) {
            _elements.lineSpacingSelect.setAttribute('aria-label', 'Select line spacing');
        }
        if (_elements.letterSpacingSelect) {
            _elements.letterSpacingSelect.setAttribute('aria-label', 'Select letter spacing');
        }
        if (_elements.wordSpacingSelect) {
            _elements.wordSpacingSelect.setAttribute('aria-label', 'Select word spacing');
        }
        if (_elements.showShortcutsBtn) {
            _elements.showShortcutsBtn.setAttribute('aria-label', 'Show keyboard shortcuts help');
        }
        if (_elements.motionSelect) {
            _elements.motionSelect.setAttribute('aria-label', 'Select animation preference');
        }
        if (_elements.focusStyleSelect) {
            _elements.focusStyleSelect.setAttribute('aria-label', 'Select focus indicator style');
        }
        if (_elements.resetBtn) {
            _elements.resetBtn.setAttribute('aria-label', 'Reset accessibility settings to defaults');
        }

        // Update slider ARIA attributes when value changes
        if (_elements.fontSizeSlider) {
            _elements.fontSizeSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value, 10);
                e.target.setAttribute('aria-valuenow', value);
                if (_elements.fontSizeValue) {
                    _elements.fontSizeValue.setAttribute('aria-live', 'polite');
                }
            });
        }
    }

    /**
     * Get current settings
     * @returns {Object} Current settings
     */
    function getSettings() {
        return JSON.parse(JSON.stringify(_state.settings));
    }

    /**
     * Set theme programmatically
     * @param {string} theme - Theme identifier
     */
    function setTheme(theme) {
        if (Object.values(CONFIG.THEMES).includes(theme)) {
            _applyTheme(theme);
            _syncUI();
        }
    }

    /**
     * Set font size programmatically
     * @param {number} size - Font size percentage
     */
    function setFontSize(size) {
        _applyFontSize(size);
        _syncUI();
    }

    /**
     * Reset all settings to defaults
     */
    function reset() {
        _handleReset();
    }

    /**
     * Get available themes
     * @returns {Object} Theme constants
     */
    function getThemes() {
        return { ...CONFIG.THEMES };
    }

    // ==================== Keyboard Shortcuts System ====================

    /**
     * Available keyboard shortcuts
     */
    const SHORTCUTS = {
        SWITCH_ENGINE_PREV: { key: 'ArrowUp', altKey: true, description: 'switchEnginePrev' },
        SWITCH_ENGINE_NEXT: { key: 'ArrowDown', altKey: true, description: 'switchEngineNext' },
        FOCUS_SEARCH: { key: '/', altKey: false, ctrlKey: false, description: 'focusSearch' },
        OPEN_SETTINGS: { key: ',', altKey: true, description: 'openSettings' }
    };

    let _shortcutsEnabled = true;

    /**
     * Initialize keyboard shortcuts
     */
    function _initKeyboardShortcuts() {
        document.addEventListener('keydown', _handleGlobalKeydown);
    }

    /**
     * Handle global keydown events for shortcuts
     * @param {KeyboardEvent} e
     */
    function _handleGlobalKeydown(e) {
        if (!_shortcutsEnabled) return;

        // Don't trigger shortcuts when typing in input fields (except for specific ones)
        const isInputFocused = document.activeElement.tagName === 'INPUT' || 
                               document.activeElement.tagName === 'TEXTAREA' ||
                               document.activeElement.isContentEditable;

        // Alt + Arrow Up/Down: Switch search engine (works even in input)
        if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            e.preventDefault();
            _switchSearchEngine(e.key === 'ArrowUp' ? 'prev' : 'next');
            return;
        }

        // Skip other shortcuts if typing in input
        if (isInputFocused) return;

        // "/" : Focus search box
        if (e.key === '/' && !e.altKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            _focusSearchBox();
            return;
        }

        // Alt + ",": Open settings
        if (e.altKey && e.key === ',') {
            e.preventDefault();
            _openSettings();
            return;
        }
    }

    /**
     * Switch to previous or next search engine
     * @param {string} direction - 'prev' or 'next'
     */
    function _switchSearchEngine(direction) {
        // Get engines from global scope (defined in script.js)
        if (typeof engines === 'undefined') return;

        const engineKeys = Object.keys(engines);
        if (engineKeys.length === 0) return;

        // Get current engine
        const currentEngineKey = localStorage.getItem('preferredEngine') || 'google';
        const currentIndex = engineKeys.indexOf(currentEngineKey);

        let newIndex;
        if (direction === 'prev') {
            newIndex = currentIndex <= 0 ? engineKeys.length - 1 : currentIndex - 1;
        } else {
            newIndex = currentIndex >= engineKeys.length - 1 ? 0 : currentIndex + 1;
        }

        const newEngineKey = engineKeys[newIndex];

        // Call setEngine from script.js if available
        if (typeof setEngine === 'function') {
            setEngine(newEngineKey);
            _showEngineChangeNotification(engines[newEngineKey].name);
        }
    }

    /**
     * Show a brief notification when engine changes
     * @param {string} engineName
     */
    function _showEngineChangeNotification(engineName) {
        // Remove existing notification
        const existing = document.querySelector('.engine-change-notification');
        if (existing) {
            existing.remove();
        }

        // Create notification element safely (no innerHTML with user data)
        const notification = document.createElement('div');
        notification.className = 'engine-change-notification';
        
        // Create SVG icon
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('fill', 'currentColor');
        path.setAttribute('d', 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z');
        svg.appendChild(path);
        
        // Create text span safely
        const span = document.createElement('span');
        span.textContent = engineName;
        
        notification.appendChild(svg);
        notification.appendChild(span);

        document.body.appendChild(notification);

        // Trigger animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Remove after animation
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 200);
        }, 1200);
    }

    /**
     * Focus the search box
     */
    function _focusSearchBox() {
        const searchInput = document.getElementById('search');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    /**
     * Open settings modal
     */
    function _openSettings() {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.classList.add('active');
        }
    }

    /**
     * Enable or disable keyboard shortcuts
     * @param {boolean} enabled
     */
    function setShortcutsEnabled(enabled) {
        _shortcutsEnabled = enabled;
    }

    /**
     * Get list of available shortcuts
     * @returns {Object}
     */
    function getShortcuts() {
        return { ...SHORTCUTS };
    }

    // Expose public API
    return {
        init,
        syncUI: _syncUI,  // Exposed for calling after CustomSelect.init()
        getSettings,
        setTheme,
        setFontSize,
        reset,
        getThemes,
        setShortcutsEnabled,
        getShortcuts
    };
})();

// Export for global use
window.AccessibilityManager = AccessibilityManager;

