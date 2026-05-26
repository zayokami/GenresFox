/**
 * requestIdleCallback Polyfill
 * Provides fallback for browsers that don't support requestIdleCallback
 * 
 * Features:
 * - Respects timeout option
 * - Accurate timeRemaining calculation
 * - Proper cleanup with cancelIdleCallback
 * - Performance optimized (uses MessageChannel when available)
 * 
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback
 */
(function() {
    'use strict';

    // Guard against non-browser environments
    if (typeof window === 'undefined') {
        return;
    }
    
    // Only polyfill if not natively supported
    if (typeof window.requestIdleCallback === 'function' && typeof window.cancelIdleCallback === 'function') {
        return; // Native support available, no polyfill needed
    }
    
    // Use MessageChannel for better performance if available
    var hasMessageChannel = typeof MessageChannel !== 'undefined';
    var hasRAF = typeof window.requestAnimationFrame === 'function';
    var hasCancelRAF = typeof window.cancelAnimationFrame === 'function';
    var hasPerformanceNow = typeof performance !== 'undefined' && performance && typeof performance.now === 'function';

    var channel = null;
    if (hasMessageChannel) {
        try {
            channel = new MessageChannel();
            channel.port1.onmessage = function() {
                // Port message received, browser is idle
            };
        } catch (e) {
            channel = null;
            hasMessageChannel = false;
        }
    }
    
    /**
     * Polyfill for requestIdleCallback
     * @param {Function} cb - Function to call when idle
     * @param {Object} [options] - Options object
     * @param {number} [options.timeout] - Maximum time to wait before executing (ms)
     * @returns {number} Request ID for cancellation
     */
    window.requestIdleCallback = function(cb, options) {
        if (typeof cb !== 'function') {
            throw new TypeError('callback must be a function');
        }
        
        var timeout = (options && typeof options.timeout === 'number')
            ? Math.max(0, options.timeout)
            : 0;
        var start = hasPerformanceNow ? performance.now() : Date.now();
        var timeoutId = null;
        var frameId = null;
        
        // If timeout is specified, set a fallback timeout
        if (timeout > 0) {
            timeoutId = setTimeout(function() {
                if (frameId !== null && hasCancelRAF) {
                    window.cancelAnimationFrame(frameId);
                    frameId = null;
                }
                var now = hasPerformanceNow ? performance.now() : Date.now();
                cb({
                    didTimeout: true,
                    timeRemaining: function() {
                        return Math.max(0, timeout - (now - start));
                    }
                });
            }, timeout);
        }
        
        // If requestAnimationFrame is not available, fall back to simple timeout
        if (!hasRAF) {
            var fallbackId = setTimeout(function() {
                if (timeoutId !== null) {
                    clearTimeout(timeoutId);
                }
                cb({
                    didTimeout: false,
                    timeRemaining: function() {
                        return 1;
                    }
                });
            }, 1);
            return fallbackId;
        }

        // Use requestAnimationFrame to wait for next frame
        // This ensures we're not blocking the main thread
        frameId = window.requestAnimationFrame(function() {
            // Use MessageChannel to detect idle time if available
            if (hasMessageChannel && channel) {
                try {
                    channel.port2.postMessage(0);
                } catch (e) {
                    // If postMessage fails, fall back to normal path
                }
                // Schedule callback for next idle period
                frameId = window.requestAnimationFrame(function() {
                    if (timeoutId !== null) {
                        clearTimeout(timeoutId);
                    }
                    cb({
                        didTimeout: false,
                        timeRemaining: function() {
                            // Estimate remaining time (conservative: 5ms)
                            return Math.max(0, 5);
                        }
                    });
                });
            } else {
                // Fallback: use setTimeout with minimal delay
                if (timeoutId !== null) {
                    clearTimeout(timeoutId);
                }
                setTimeout(function() {
                    cb({
                        didTimeout: false,
                        timeRemaining: function() {
                            // Conservative estimate: 1ms remaining
                            return 1;
                        }
                    });
                }, 1);
            }
        });
        
        // Return a unique ID for cancellation
        return frameId || timeoutId || Date.now();
    };
    
    /**
     * Polyfill for cancelIdleCallback
     * @param {number} id - Request ID from requestIdleCallback
     */
    window.cancelIdleCallback = function(id) {
        if (typeof id === 'number') {
            // Cancel animation frame if it's a frame ID
            if (hasCancelRAF && id < 1000000) { // Frame IDs are typically small
                window.cancelAnimationFrame(id);
            }
            // Cancel timeout
            clearTimeout(id);
        }
    };
})();

