// search.js
// Encapsulated search input + action button logic
// Enhanced with comprehensive error handling, security checks, and fault tolerance
const SearchBar = (function () {
    'use strict';

    // ==================== Configuration ====================
    const CONFIG = {
        MAX_URL_LENGTH: 2048,           // Maximum URL length (RFC 7230 recommendation)
        MAX_QUERY_LENGTH: 2048,         // Maximum search query length
        MAX_RETRY_ATTEMPTS: 3,          // Maximum retry attempts for failed operations
        RETRY_DELAY: 100,               // Delay between retries (ms)
        ERROR_LOG_PREFIX: '[SearchBar]' // Error log prefix
    };

    // Error tracking
    let _errorCount = 0;
    const _errorHistory = [];
    const MAX_ERROR_HISTORY = 10;

    // ==================== Error Handling ====================

    /**
     * Log error with context
     * @param {string} message - Error message
     * @param {Error} error - Error object (optional)
     * @param {Object} context - Additional context (optional)
     */
    function _logError(message, error = null, context = {}) {
        const timestamp = new Date().toISOString();
        const errorEntry = {
            timestamp,
            message,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : null,
            context
        };

        _errorHistory.push(errorEntry);
        if (_errorHistory.length > MAX_ERROR_HISTORY) {
            _errorHistory.shift();
        }

        _errorCount++;
        console.error(`${CONFIG.ERROR_LOG_PREFIX} ${message}`, error || '', context);
    }

    /**
     * Get i18n message with fallback
     * @param {string} key - Message key
     * @param {string} fallback - Fallback message
     * @returns {string}
     */
    function _getMessage(key, fallback) {
        try {
            if (window.I18n && typeof I18n.getMessage === 'function') {
                const msg = I18n.getMessage(key);
                if (msg && msg.trim()) return msg;
            }
        } catch (e) {
            _logError('Failed to get i18n message', e, { key });
        }
        return fallback;
    }

    /**
     * Announce message to screen readers via live region
     * @param {string} message - Message to announce
     */
    function _announceToScreenReader(message) {
        const liveRegion = document.getElementById('a11y-live-region');
        if (liveRegion) liveRegion.textContent = message;
    }

    /**
     * Show error message to user (with improved UX)
     * @param {string} key - Error message key
     * @param {string} fallback - Fallback message
     * @param {Error} error - Error object (optional)
     */
    function _showError(key, fallback, error = null) {
        const msg = _getMessage(key, fallback);
        if (!msg) return;

        // Log error for debugging
        if (error) {
            _logError(msg, error, { key });
        } else {
            console.warn(`${CONFIG.ERROR_LOG_PREFIX} ${msg}`);
        }

        // Announce error to screen readers
        _announceToScreenReader(msg);

        // Show user-friendly error message
        try {
            alert(msg);
        } catch (e) {
            // If alert fails (e.g., in some restricted contexts), log to console
            console.error(`${CONFIG.ERROR_LOG_PREFIX} Failed to show error dialog:`, e);
            console.error(`${CONFIG.ERROR_LOG_PREFIX} Error message: ${msg}`);
        }
    }

    // ==================== Security Functions ====================

    /**
     * Validate and sanitize input string
     * @param {string} value - Input value
     * @param {number} maxLength - Maximum length
     * @returns {string|null} Sanitized value or null if invalid
     */
    function _sanitizeInput(value, maxLength = CONFIG.MAX_QUERY_LENGTH) {
        if (typeof value !== 'string') return null;
        
        // Trim whitespace
        const trimmed = value.trim();
        
        // Check length
        if (trimmed.length === 0) return null;
        if (trimmed.length > maxLength) {
            _logError('Input too long', null, { length: trimmed.length, maxLength });
            return null;
        }

        // Check for control characters (except common whitespace)
        // Allow: space, tab, newline, carriage return
        if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(trimmed)) {
            _logError('Input contains control characters', null, { value: trimmed.substring(0, 50) });
            return null;
        }

        return trimmed;
    }

    /**
     * Enhanced URL validation with comprehensive security checks
     * @param {string} value - URL string
     * @returns {boolean}
     */
    function _isUrl(value) {
        try {
            if (typeof value !== 'string') return false;
            
            const sanitized = _sanitizeInput(value, CONFIG.MAX_URL_LENGTH);
            if (!sanitized) return false;

            // Fast heuristics: only treat as URL when it has a clear URL shape
            const hasProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(sanitized);
            const isIp = /^(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(\/|$)/.test(sanitized);
            const isIpv6 = /^\[?[0-9a-fA-F:]+\]?(?::\d+)?(\/|$)/.test(sanitized);
            const isLocalhost = /^localhost(:\d+)?(\/|$)/i.test(sanitized);
            const hasDotDomain = /[a-z0-9-]+\.[a-z0-9.-]{2,}/i.test(sanitized);

            if (!hasProtocol && !isIp && !isIpv6 && !isLocalhost && !hasDotDomain) {
                // Looks more like a query (e.g., 单个词/短语无点号)
                return false;
            }

            const ensureProtocol = (v) => (/^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`);

            const url = new URL(ensureProtocol(sanitized));
            const proto = (url.protocol || '').toLowerCase();
            
            // Only allow http and https protocols
            if (proto !== 'http:' && proto !== 'https:') {
                return false;
            }

            // Validate hostname exists and is reasonable
            if (!url.hostname || url.hostname.length > 253) {
                return false;
            }

            // Additional security: check for suspicious patterns
            // Reject URLs with encoded dangerous characters
            const decoded = decodeURIComponent(url.href);
            if (decoded !== url.href && /javascript:|data:|vbscript:/i.test(decoded)) {
                return false;
            }

            return true;
        } catch (e) {
            // Silently fail - not a valid URL
            return false;
        }
    }

    /**
     * Comprehensive URL safety check
     * @param {string} url - URL to check
     * @returns {Object} {safe: boolean, reason?: string}
     */
    function _validateUrlSafety(url) {
        if (!url || typeof url !== 'string') {
            return { safe: false, reason: 'invalid_type' };
        }

        const trimmed = url.trim();
        
        // Length check
        if (trimmed.length === 0) {
            return { safe: false, reason: 'empty' };
        }
        if (trimmed.length > CONFIG.MAX_URL_LENGTH) {
            return { safe: false, reason: 'too_long' };
        }

        // Control characters check (reject non-printable except common whitespace)
        if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(trimmed)) {
            return { safe: false, reason: 'control_chars' };
        }

        // Dangerous protocol schemes
        const dangerousProtocols = /^(javascript:|data:|vbscript:|file:|blob:|mailto:|tel:|about:|chrome:|chrome-extension:|moz-extension:|ms-browser-extension:)/i;
        if (dangerousProtocols.test(trimmed)) {
            return { safe: false, reason: 'dangerous_protocol' };
        }

        // Check for encoded dangerous protocols
        try {
            const decoded = decodeURIComponent(trimmed);
            if (decoded !== trimmed && dangerousProtocols.test(decoded)) {
                return { safe: false, reason: 'encoded_dangerous_protocol' };
            }
        } catch (e) {
            // If decoding fails, continue with original check
        }

        // Validate URL structure
        try {
            // Ensure protocol for validation
            const testUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
            const parsed = new URL(testUrl);
            
            // Protocol check
            const proto = (parsed.protocol || '').toLowerCase();
            if (proto !== 'http:' && proto !== 'https:') {
                return { safe: false, reason: 'invalid_protocol' };
            }

            // Hostname validation
            if (!parsed.hostname || parsed.hostname.length > 253) {
                return { safe: false, reason: 'invalid_hostname' };
            }

            // Check for suspicious hostname patterns
            // Reject localhost in production (optional, can be relaxed)
            // if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
            //     return { safe: false, reason: 'localhost_not_allowed' };
            // }

        } catch (e) {
            return { safe: false, reason: 'parse_error' };
        }

        return { safe: true };
    }

    /**
     * Check if URL is safe (backward compatibility wrapper)
     * @param {string} url - URL to check
     * @returns {boolean}
     */
    function _isSafeUrl(url) {
        const validation = _validateUrlSafety(url);
        if (!validation.safe && validation.reason) {
            _logError('Unsafe URL detected', null, { url: url.substring(0, 100), reason: validation.reason });
        }
        return validation.safe;
    }

    /**
     * Validate search engine URL template
     * @param {string} engineUrl - Engine URL template
     * @returns {Object} {valid: boolean, reason?: string}
     */
    function _validateEngineUrl(engineUrl) {
        if (!engineUrl || typeof engineUrl !== 'string') {
            return { valid: false, reason: 'invalid_type' };
        }

        const trimmed = engineUrl.trim();
        if (trimmed.length === 0) {
            return { valid: false, reason: 'empty' };
        }

        // Check if URL template contains %s placeholder
        if (!trimmed.includes('%s')) {
            return { valid: false, reason: 'missing_placeholder' };
        }

        // Validate base URL (replace %s with test query)
        try {
            const testUrl = trimmed.replace('%s', 'test');
            const validation = _validateUrlSafety(testUrl);
            if (!validation.safe) {
                return { valid: false, reason: validation.reason || 'unsafe_template' };
            }
        } catch (e) {
            return { valid: false, reason: 'parse_error' };
        }

        return { valid: true };
    }

    // ==================== Navigation ====================

    /**
     * Navigate to URL with enhanced error handling and retry logic
     * @param {string} url - URL to navigate to
     * @param {number} retryCount - Current retry count (internal)
     * @returns {Promise<boolean>}
     */
    function _navigateTo(url, retryCount = 0) {
        // Validate URL safety
        const validation = _validateUrlSafety(url);
        if (!validation.safe) {
            const reason = validation.reason || 'unknown';
            _logError('Blocked unsafe URL', null, { url: url.substring(0, 100), reason });
            _showError('searchErrorUnsafeUrl', 'This URL may be unsafe.');
            return Promise.resolve(false);
        }

        return new Promise((resolve) => {
            try {
                // Create anchor element for navigation
                const a = document.createElement('a');
                a.href = url;
                a.rel = 'noopener noreferrer';
                a.target = '_self';

                // Attempt navigation
                try {
                    a.click();
                    resolve(true);
                } catch (clickError) {
                    // If click fails, try alternative method
                    _logError('Click navigation failed, trying alternative', clickError, { url: url.substring(0, 100) });
                    
                    // Alternative: use window.location (as fallback)
                    try {
                        if (retryCount < CONFIG.MAX_RETRY_ATTEMPTS) {
                            setTimeout(() => {
                                _navigateTo(url, retryCount + 1).then(resolve);
                            }, CONFIG.RETRY_DELAY * (retryCount + 1));
                        } else {
                            throw new Error('All navigation methods failed');
                        }
                    } catch (fallbackError) {
                        _logError('Navigation failed after retries', fallbackError, {
                            url: url.substring(0, 100),
                            retryCount
                        });
                        _showError('searchErrorNavigationFailed', 'Failed to open the link.', fallbackError);
                        resolve(false);
                    }
                }
            } catch (error) {
                _logError('Navigation error', error, { url: url.substring(0, 100) });
                _showError('searchErrorNavigationFailed', 'Failed to open the link.', error);
                resolve(false);
            }
        });
    }

    // ==================== DOM Utilities ====================

    /**
     * Get DOM elements with error handling
     * @param {Object} ids - Element IDs
     * @returns {Object} Elements object
     */
    function _getElements({ searchInputId, actionBtnId, actionLabelId }) {
        const elements = {
            searchInput: null,
            actionBtn: null,
            actionLabel: null
        };

        try {
            if (searchInputId) {
                elements.searchInput = document.getElementById(searchInputId);
                if (!elements.searchInput) {
                    _logError('Search input element not found', null, { id: searchInputId });
                }
            }

            if (actionBtnId) {
                elements.actionBtn = document.getElementById(actionBtnId);
                if (!elements.actionBtn) {
                    _logError('Action button element not found', null, { id: actionBtnId });
                }
            }

            if (actionLabelId) {
                elements.actionLabel = document.getElementById(actionLabelId);
                if (!elements.actionLabel) {
                    _logError('Action label element not found', null, { id: actionLabelId });
                }
            }
        } catch (e) {
            _logError('Failed to get DOM elements', e, { searchInputId, actionBtnId, actionLabelId });
        }

        return elements;
    }

    /**
     * Update button width with error handling and validation
     * @param {HTMLElement} actionBtn - Action button element
     * @param {HTMLElement} actionLabel - Action label element
     */
    function _updateButtonWidth(actionBtn, actionLabel) {
        if (!actionBtn || !actionLabel) {
            if (!actionBtn) _logError('Action button missing for width update', null);
            if (!actionLabel) _logError('Action label missing for width update', null);
            return;
        }

        try {
            // Temporarily show label to measure its actual width
            const originalMaxWidth = actionLabel.style.maxWidth;
            const originalOpacity = actionLabel.style.opacity;
            const originalVisibility = actionLabel.style.visibility;
            const originalPosition = actionLabel.style.position;
            
            // Make label visible for measurement
            actionLabel.style.maxWidth = 'none';
            actionLabel.style.opacity = '1';
            actionLabel.style.visibility = 'hidden'; // Hidden but still measurable
            actionLabel.style.position = 'absolute';
            actionLabel.style.whiteSpace = 'nowrap';
            
            // Force reflow to ensure measurement accuracy
            void actionLabel.offsetWidth;
            
            // Measure the actual width
            const labelWidth = actionLabel.scrollWidth || actionLabel.offsetWidth || 0;
            
            // Restore original styles
            actionLabel.style.maxWidth = originalMaxWidth;
            actionLabel.style.opacity = originalOpacity;
            actionLabel.style.visibility = originalVisibility;
            actionLabel.style.position = originalPosition;
            
            // Validate measurement
            if (isNaN(labelWidth) || labelWidth < 0) {
                _logError('Invalid label width measurement', null, { labelWidth });
                return;
            }
            
            // Calculate expanded width: icon (16px) + gap (8px) + label + padding (32px total)
            const iconWidth = 16;
            const gap = 8;
            const paddingTotal = 32; // 16px left + 16px right
            const minExpanded = 120; // Minimum expanded width for short texts
            const expanded = Math.max(iconWidth + gap + labelWidth + paddingTotal, minExpanded);
            
            // Validate calculated width
            if (isNaN(expanded) || expanded < 0 || expanded > 10000) {
                _logError('Invalid expanded width calculation', null, { expanded, labelWidth });
                return;
            }
            
            actionBtn.style.setProperty('--search-action-expand', `${expanded}px`);
        } catch (e) {
            _logError('Failed to update button width', e, { 
                hasActionBtn: !!actionBtn, 
                hasActionLabel: !!actionLabel 
            });
        }
    }

    // ==================== Event Handling ====================

    /**
     * Wire up search events with comprehensive error handling
     * @param {Object} options - Event wiring options
     */
    function _wireEvents({ searchInput, actionBtn, getEngines, getCurrentEngine }) {
        if (!searchInput && !actionBtn) {
            _logError('No search input or action button provided', null);
            return;
        }

        /**
         * Run search with enhanced error handling and validation
         */
        const runSearch = () => {
            try {
                // Validate search input element
                if (!searchInput) {
                    _logError('Search input element not available', null);
                    _showError('searchErrorNoInput', 'Search input not available.');
                    return;
                }

                // Validate search input value type
                if (typeof searchInput.value !== 'string') {
                    _logError('Search input value is not a string', null, { 
                        type: typeof searchInput.value 
                    });
                    _showError('searchErrorInvalidInput', 'Invalid search input.');
                    return;
                }

                // Sanitize and validate input
                const sanitized = _sanitizeInput(searchInput.value, CONFIG.MAX_QUERY_LENGTH);
                if (!sanitized) {
                    _showError('searchErrorInvalidInput', 'Please enter a valid search query.');
                    return;
                }

                let val = sanitized;

                // Get search engines with error handling
                let engines = null;
                let currentKey = null;
                let engine = null;

                try {
                    engines = typeof getEngines === 'function' ? getEngines() : null;
                    if (!engines || typeof engines !== 'object') {
                        _logError('Invalid engines object', null, { engines });
                        _showError('searchErrorNoEngine', 'No available search engine.');
                        return;
                    }

                    currentKey = typeof getCurrentEngine === 'function' ? getCurrentEngine() : null;
                    
                    // Get current engine or fallback to google
                    if (currentKey && engines[currentKey]) {
                        engine = engines[currentKey];
                    } else if (engines.google) {
                        engine = engines.google;
                        _logError('Current engine not found, using Google fallback', null, { currentKey });
                    } else {
                        // Try to get any available engine
                        const engineKeys = Object.keys(engines);
                        if (engineKeys.length > 0) {
                            engine = engines[engineKeys[0]];
                            _logError('Google engine not found, using first available', null, { 
                                availableEngines: engineKeys 
                            });
                        }
                    }
                } catch (e) {
                    _logError('Failed to get search engine', e);
                    _showError('searchErrorNoEngine', 'No available search engine.');
                    return;
                }

                // Validate engine
                if (!engine || typeof engine !== 'object') {
                    _logError('Invalid engine object', null, { engine });
                    _showError('searchErrorNoEngine', 'No available search engine.');
                    return;
                }

                if (!engine.url || typeof engine.url !== 'string') {
                    _logError('Engine URL missing or invalid', null, { engine });
                    _showError('searchErrorNoEngine', 'Search engine configuration is invalid.');
                    return;
                }

                // Validate engine URL template
                const engineValidation = _validateEngineUrl(engine.url);
                if (!engineValidation.valid) {
                    _logError('Invalid engine URL template', null, { 
                        engine: engine.name || 'unknown', 
                        reason: engineValidation.reason 
                    });
                    _showError('searchErrorInvalidEngine', 'Search engine URL is invalid.');
                    return;
                }

                // Handle URL navigation or search
                if (_isUrl(val)) {
                    // User entered a URL
                    if (!/^https?:\/\//i.test(val)) {
                        val = 'https://' + val;
                    }
                    _navigateTo(val).catch(err => {
                        _logError('Navigation promise rejected', err, { url: val.substring(0, 100) });
                    });
                } else {
                    // User entered a search query
                    try {
                        let searchUrl = engine.url;
                        
                        // Encode query safely
                        const encodedQuery = encodeURIComponent(val);
                        
                        // Validate encoded query length
                        if (encodedQuery.length > CONFIG.MAX_QUERY_LENGTH * 3) {
                            // URI encoding can expand length significantly
                            _logError('Encoded query too long', null, { 
                                originalLength: val.length, 
                                encodedLength: encodedQuery.length 
                            });
                            _showError('searchErrorQueryTooLong', 'Search query is too long.');
                            return;
                        }

                        // Build search URL
                        if (searchUrl.includes('%s')) {
                            // Replace placeholder
                            searchUrl = searchUrl.replace('%s', encodedQuery);
                            
                            // Security: ensure no additional %s placeholders remain
                            if (searchUrl.includes('%s')) {
                                _logError('Multiple %s placeholders in engine URL', null, { engine: engine.name });
                                // Replace all remaining %s with encoded query (defensive)
                                searchUrl = searchUrl.replace(/%s/g, encodedQuery);
                            }
                        } else {
                            // Append query if no placeholder
                            searchUrl += encodedQuery;
                        }

                        // Final URL validation
                        const finalValidation = _validateUrlSafety(searchUrl);
                        if (!finalValidation.safe) {
                            _logError('Final search URL is unsafe', null, { 
                                reason: finalValidation.reason,
                                url: searchUrl.substring(0, 200)
                            });
                            _showError('searchErrorUnsafeUrl', 'Generated search URL is unsafe.');
                            return;
                        }

                        _navigateTo(searchUrl).catch(err => {
                            _logError('Search navigation promise rejected', err, { 
                                url: searchUrl.substring(0, 200) 
                            });
                        });
                    } catch (e) {
                        _logError('Failed to build search URL', e, { query: val.substring(0, 50) });
                        _showError('searchErrorBuildUrl', 'Failed to build search URL.');
                    }
                }
            } catch (error) {
                _logError('Unexpected error in runSearch', error);
                _showError('searchErrorUnexpected', 'An unexpected error occurred. Please try again.');
            }
        };

        // Wire up keyboard event
        if (searchInput) {
            if (!searchInput.dataset.searchInit) {
                try {
                    const handler = (e) => {
                        try {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                runSearch();
                            }
                        } catch (err) {
                            _logError('Error in keyboard handler', err);
                        }
                    };
                    searchInput.addEventListener('keydown', handler);
                    searchInput.dataset.searchInit = 'true';
                } catch (e) {
                    _logError('Failed to attach keyboard event', e);
                }
            } else {
                _logError('Search input already initialized', null);
            }
        }

        // Wire up click event
        if (actionBtn) {
            if (!actionBtn.dataset.searchInit) {
                try {
                    actionBtn.addEventListener('click', (e) => {
                        try {
                            e.preventDefault();
                            runSearch();
                        } catch (err) {
                            _logError('Error in click handler', err);
                        }
                    });
                    actionBtn.dataset.searchInit = 'true';
                } catch (e) {
                    _logError('Failed to attach click event', e);
                }
            } else {
                _logError('Action button already initialized', null);
            }
        }
    }

    // ==================== Initialization ====================

    let _initialized = false;
    let _resizeHandler = null;

    /**
     * Initialize SearchBar with comprehensive error handling
     * @param {Object} options - Initialization options
     */
    function init(options = {}) {
        // Prevent duplicate initialization
        if (_initialized) {
            _logError('SearchBar already initialized', null);
            return;
        }

        try {
            const {
                searchInputId = 'search',
                actionBtnId = 'searchActionBtn',
                actionLabelId = 'searchActionLabel',
                getEngines,
                getCurrentEngine
            } = options || {};

            // Validate required callbacks
            if (typeof getEngines !== 'function') {
                _logError('getEngines callback not provided or not a function', null);
                _showError('searchErrorInitFailed', 'Search bar initialization failed: missing engines callback.');
                return;
            }

            if (typeof getCurrentEngine !== 'function') {
                _logError('getCurrentEngine callback not provided or not a function', null);
                _showError('searchErrorInitFailed', 'Search bar initialization failed: missing engine callback.');
                return;
            }

            // Get DOM elements
            const { searchInput, actionBtn, actionLabel } = _getElements({ 
                searchInputId, 
                actionBtnId, 
                actionLabelId 
            });

            // Validate critical elements
            if (!searchInput) {
                _logError('Critical element missing: searchInput', null, { searchInputId });
                _showError('searchErrorInitFailed', 'Search input element not found.');
                return;
            }

            // Update button width with error handling
            try {
                _updateButtonWidth(actionBtn, actionLabel);
            } catch (e) {
                _logError('Failed to update button width during init', e);
                // Non-critical, continue initialization
            }

            // Setup resize handler with debouncing
            try {
                let resizeTimeout = null;
                _resizeHandler = () => {
                    if (resizeTimeout) {
                        clearTimeout(resizeTimeout);
                    }
                    resizeTimeout = setTimeout(() => {
                        try {
                            _updateButtonWidth(actionBtn, actionLabel);
                        } catch (e) {
                            _logError('Error in resize handler', e);
                        }
                    }, 150); // Debounce resize events
                };
                window.addEventListener('resize', _resizeHandler);
            } catch (e) {
                _logError('Failed to setup resize handler', e);
                // Non-critical, continue initialization
            }

            // Wire up events
            try {
                _wireEvents({ searchInput, actionBtn, getEngines, getCurrentEngine });
            } catch (e) {
                _logError('Failed to wire events', e);
                _showError('searchErrorInitFailed', 'Failed to initialize search functionality.');
                return;
            }

            _initialized = true;
        } catch (error) {
            _logError('Fatal error during SearchBar initialization', error, { options });
            _showError('searchErrorInitFailed', 'Failed to initialize search bar.');
        }
    }

    /**
     * Cleanup resources
     */
    function destroy() {
        try {
            if (_resizeHandler) {
                window.removeEventListener('resize', _resizeHandler);
                _resizeHandler = null;
            }
            _initialized = false;
            _errorCount = 0;
            _errorHistory.length = 0;
        } catch (e) {
            _logError('Error during SearchBar cleanup', e);
        }
    }

    /**
     * Get error statistics
     * @returns {Object} Error statistics
     */
    function getErrorStats() {
        return {
            errorCount: _errorCount,
            recentErrors: _errorHistory.slice(),
            initialized: _initialized
        };
    }

    return { 
        init,
        destroy,
        getErrorStats,
        // Expose validation functions for testing/debugging
        _validateUrlSafety,
        _validateEngineUrl,
        _sanitizeInput
    };
})();

// Expose globally
window.SearchBar = SearchBar;

/**
 * To boldly split infinitives that no man had split before.
 * — From Douglas Adams' novel, "The Hitchhiker's Guide to the Galaxy".
*/