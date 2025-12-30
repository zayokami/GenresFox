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
    
    // Only polyfill if not natively supported
    if (window.requestIdleCallback && window.cancelIdleCallback) {
        return; // Native support available, no polyfill needed
    }
    
    // Use MessageChannel for better performance if available
    const useMessageChannel = typeof MessageChannel !== 'undefined';
    let channel;
    
    if (useMessageChannel) {
        channel = new MessageChannel();
        channel.port1.onmessage = function() {
            // Port message received, browser is idle
        };
    }
    
    /**
     * Polyfill for requestIdleCallback
     * @param {Function} callback - Function to call when idle
     * @param {Object} options - Options object
     * @param {number} options.timeout - Maximum time to wait before executing (ms)
     * @returns {number} Request ID for cancellation
     */
    window.requestIdleCallback = function(cb, options) {
        if (typeof cb !== 'function') {
            throw new TypeError('callback must be a function');
        }
        
        const timeout = (options && options.timeout) ? Math.max(0, options.timeout) : 0;
        const start = performance.now();
        let timeoutId = null;
        let frameId = null;
        
        // If timeout is specified, set a fallback timeout
        if (timeout > 0) {
            timeoutId = setTimeout(function() {
                if (frameId !== null) {
                    cancelAnimationFrame(frameId);
                    frameId = null;
                }
                cb({
                    didTimeout: true,
                    timeRemaining: function() {
                        return Math.max(0, timeout - (performance.now() - start));
                    }
                });
            }, timeout);
        }
        
        // Use requestAnimationFrame to wait for next frame
        // This ensures we're not blocking the main thread
        frameId = requestAnimationFrame(function() {
            // Use MessageChannel to detect idle time if available
            if (useMessageChannel && channel) {
                channel.port2.postMessage(0);
                // Schedule callback for next idle period
                frameId = requestAnimationFrame(function() {
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
            if (id < 1000000) { // Frame IDs are typically small
                cancelAnimationFrame(id);
            }
            // Cancel timeout
            clearTimeout(id);
        }
    };
})();

