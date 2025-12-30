/**
 * Async CSS Loader
 * Loads non-critical CSS files asynchronously to not block rendering
 * 
 * Features:
 * - Prevents render blocking
 * - Error handling for failed loads
 * - Preload hints for better performance
 * - Idempotent (safe to call multiple times)
 */
(function() {
    'use strict';
    
    const CSS_FILES = ['accessibility.css', 'search.css'];
    const loaded = new Set();
    
    /**
     * Load a CSS file asynchronously
     * @param {string} href - CSS file path
     * @returns {Promise<void>}
     */
    function loadCSS(href) {
        // Prevent duplicate loading
        if (loaded.has(href)) {
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            
            // Handle load success
            link.onload = () => {
                loaded.add(href);
                resolve();
            };
            
            // Handle load error (silently fail for non-critical CSS)
            link.onerror = () => {
                console.warn(`Failed to load CSS: ${href}`);
                loaded.add(href); // Mark as attempted to prevent retry loops
                resolve(); // Resolve anyway to not block other CSS
            };
            
            // Append to head
            document.head.appendChild(link);
        });
    }
    
    /**
     * Load all non-critical CSS files
     */
    function loadAllCSS() {
        // Use Promise.allSettled to load all CSS files in parallel
        // Even if one fails, others will still load
        Promise.allSettled(CSS_FILES.map(loadCSS)).then(() => {
            // All CSS files loaded (or failed), trigger custom event for other scripts
            if (typeof window.CustomEvent !== 'undefined') {
                window.dispatchEvent(new CustomEvent('css-async-loaded'));
            }
        });
    }
    
    // Load CSS when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadAllCSS);
    } else {
        // DOM already ready, load immediately
        loadAllCSS();
    }
})();

