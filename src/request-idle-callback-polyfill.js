/**
 * requestIdleCallback Polyfill
 * Provides fallback for browsers that don't support requestIdleCallback
 * 
 * Features:
 * - Respects timeout option
 * - Accurate timeRemaining calculation
 * - Proper cleanup with cancelIdleCallback
 * - Reliable cancellation across timeout and frame scheduling
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
    
    var hasRAF = typeof window.requestAnimationFrame === 'function';
    var hasCancelRAF = typeof window.cancelAnimationFrame === 'function';
    var hasPerformanceNow = typeof performance !== 'undefined' && performance && typeof performance.now === 'function';
    var nextIdleCallbackId = 1;
    var pendingCallbacks = new Map();

    function _clearScheduledCallback(state) {
        if (state.timeoutId !== null) {
            clearTimeout(state.timeoutId);
            state.timeoutId = null;
        }
        if (state.frameId !== null && hasCancelRAF) {
            window.cancelAnimationFrame(state.frameId);
            state.frameId = null;
        }
        if (state.fallbackId !== null) {
            clearTimeout(state.fallbackId);
            state.fallbackId = null;
        }
    }

    function _completeCallback(id, didTimeout) {
        var state = pendingCallbacks.get(id);
        if (!state || !state.active) return;

        state.active = false;
        pendingCallbacks.delete(id);
        _clearScheduledCallback(state);

        var callbackStart = hasPerformanceNow ? performance.now() : Date.now();
        state.callback({
            didTimeout: didTimeout,
            timeRemaining: function() {
                if (didTimeout) return 0;
                var now = hasPerformanceNow ? performance.now() : Date.now();
                return Math.max(0, 5 - (now - callbackStart));
            }
        });
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
        var id = nextIdleCallbackId++;
        var state = {
            active: true,
            callback: cb,
            timeoutId: null,
            frameId: null,
            fallbackId: null
        };
        pendingCallbacks.set(id, state);
        
        if (timeout > 0) {
            state.timeoutId = setTimeout(function() {
                _completeCallback(id, true);
            }, timeout);
        }
        
        if (!hasRAF) {
            state.fallbackId = setTimeout(function() {
                _completeCallback(id, false);
            }, 1);
            return id;
        }

        state.frameId = window.requestAnimationFrame(function() {
            state.frameId = null;
            if (!state.active) return;
            state.fallbackId = setTimeout(function() {
                _completeCallback(id, false);
            }, 0);
        });
        
        return id;
    };
    
    /**
     * Polyfill for cancelIdleCallback
     * @param {number} id - Request ID from requestIdleCallback
     */
    window.cancelIdleCallback = function(id) {
        var state = pendingCallbacks.get(id);
        if (!state) return;
        state.active = false;
        pendingCallbacks.delete(id);
        _clearScheduledCallback(state);
    };
})();

