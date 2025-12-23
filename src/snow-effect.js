/**
 * Snow Effect Module
 * Performance-optimized snow animation for holiday easter egg
 */

const SnowEffect = (function () {
    'use strict';

    const CONFIG = {
        MAX_FLAKES: 40,              // Maximum number of snowflakes (increased)
        FLAKE_SIZE_MIN: 1,            // Minimum flake size (px) - smaller
        FLAKE_SIZE_MAX: 3,            // Maximum flake size (px) - smaller
        FALL_SPEED_MIN: 0.5,          // Minimum fall speed
        FALL_SPEED_MAX: 2,            // Maximum fall speed
        WIND_STRENGTH: 0.3,           // Horizontal drift strength
        OPACITY_MIN: 0.5,             // Minimum opacity (increased by 10%)
        OPACITY_MAX: 1.0,             // Maximum opacity (increased by 10%)
        RESPAWN_DELAY: 100,           // Delay before respawning a flake (ms)
        ANIMATION_FPS: 60,            // Target FPS (60 FPS for smooth animation)
        PERFORMANCE_CHECK_INTERVAL: 1000, // Check performance every 1 second
        MIN_FPS_THRESHOLD: 30,        // If FPS drops below this, reduce flakes
        STORAGE_KEY: 'snowEffectEnabled',
        STORAGE_KEY_TRIGGERED: 'snowEffectTriggered'
    };

    let _canvas = null;
    let _ctx = null;
    let _flakes = [];
    let _animationId = null;
    let _isEnabled = false;
    let _lastFrameTime = 0;
    let _frameInterval = 1000 / CONFIG.ANIMATION_FPS;
    let _currentFlakeCount = CONFIG.MAX_FLAKES;
    let _performanceCheckTime = 0;
    let _frameCount = 0;
    let _lastFpsCheck = 0;

    /**
     * Check if current date is within the holiday period (Dec 23 - Jan 5)
     * Uses user's local timezone
     * @returns {boolean}
     */
    function _isHolidayPeriod() {
        const now = new Date();
        const month = now.getMonth(); // 0-11
        const date = now.getDate();   // 1-31

        // December 23-31
        if (month === 11 && date >= 23) {
            return true;
        }
        // January 1-5
        if (month === 0 && date <= 5) {
            return true;
        }

        return false;
    }

    /**
     * Check if snow effect has been triggered
     * @returns {boolean}
     */
    function _isTriggered() {
        try {
            return localStorage.getItem(CONFIG.STORAGE_KEY_TRIGGERED) === 'true';
        } catch (e) {
            return false;
        }
    }

    /**
     * Mark snow effect as triggered
     */
    function _markTriggered() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY_TRIGGERED, 'true');
        } catch (e) {
            // Ignore storage errors
        }
    }

    /**
     * Get enabled state from storage
     * @returns {boolean}
     */
    function _getEnabledState() {
        try {
            return localStorage.getItem(CONFIG.STORAGE_KEY) === 'true';
        } catch (e) {
            return false;
        }
    }

    /**
     * Save enabled state to storage
     * @param {boolean} enabled
     */
    function _saveEnabledState(enabled) {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, enabled ? 'true' : 'false');
        } catch (e) {
            // Ignore storage errors
        }
    }

    /**
     * Create a single snowflake
     * @returns {Object}
     */
    function _createFlake() {
        const width = _canvas ? _canvas.width : window.innerWidth;
        return {
            x: Math.random() * width,
            y: -Math.random() * 100, // Start above viewport
            size: CONFIG.FLAKE_SIZE_MIN + Math.random() * (CONFIG.FLAKE_SIZE_MAX - CONFIG.FLAKE_SIZE_MIN),
            speed: CONFIG.FALL_SPEED_MIN + Math.random() * (CONFIG.FALL_SPEED_MAX - CONFIG.FALL_SPEED_MIN),
            opacity: CONFIG.OPACITY_MIN + Math.random() * (CONFIG.OPACITY_MAX - CONFIG.OPACITY_MIN),
            wind: (Math.random() - 0.5) * CONFIG.WIND_STRENGTH
        };
    }

    /**
     * Initialize canvas
     */
    function _initCanvas() {
        if (_canvas) return;

        _canvas = document.createElement('canvas');
        _canvas.id = 'snow-canvas';
        _canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9998;
            mix-blend-mode: screen;
        `;
        document.body.appendChild(_canvas);
        _ctx = _canvas.getContext('2d', { alpha: true });

        // Set canvas size
        _resizeCanvas();

        // Handle window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                _resizeCanvas();
            }, 100);
        });
    }

    /**
     * Resize canvas to match viewport
     */
    function _resizeCanvas() {
        if (!_canvas) return;
        _canvas.width = window.innerWidth;
        _canvas.height = window.innerHeight;
    }

    /**
     * Update and draw all flakes (optimized)
     * @param {number} deltaTime - Time since last frame (ms)
     */
    function _updateFlakes(deltaTime) {
        if (!_ctx || !_canvas) return;

        // Clear canvas
        _ctx.clearRect(0, 0, _canvas.width, _canvas.height);

        const width = _canvas.width;
        const height = _canvas.height;
        // Clamp deltaTime to prevent large jumps (max 100ms = ~10fps minimum)
        const clampedDelta = Math.min(deltaTime, 100);
        const normalizedDelta = clampedDelta / 16.67; // Normalize to 60fps baseline

        // Set common properties once
        _ctx.fillStyle = '#ffffff';

        // Update and draw each flake (only process visible ones)
        const visibleCount = Math.min(_currentFlakeCount, _flakes.length);
        for (let i = visibleCount - 1; i >= 0; i--) {
            const flake = _flakes[i];

            // Update position
            flake.y += flake.speed * normalizedDelta;
            flake.x += flake.wind * normalizedDelta;

            // Wrap around horizontally
            if (flake.x < 0) flake.x = width;
            if (flake.x > width) flake.x = 0;

            // Respawn if fallen off screen
            if (flake.y > height + 20) {
                _flakes[i] = _createFlake();
                continue;
            }

            // Skip drawing if outside viewport (small optimization)
            if (flake.y < -10 || flake.x < -10 || flake.x > width + 10) {
                continue;
            }

            // Draw flake as circle (optimized: no rotation, no save/restore)
            _ctx.globalAlpha = flake.opacity;
            _ctx.beginPath();
            _ctx.arc(Math.round(flake.x), Math.round(flake.y), flake.size, 0, Math.PI * 2);
            _ctx.fill();
        }
    }

    /**
     * Check and adjust performance
     * @param {number} currentTime - Current timestamp
     */
    function _checkPerformance(currentTime) {
        _frameCount++;
        
        // Check FPS every second
        if (currentTime - _lastFpsCheck >= CONFIG.PERFORMANCE_CHECK_INTERVAL) {
            const fps = _frameCount / ((currentTime - _lastFpsCheck) / 1000);
            _frameCount = 0;
            _lastFpsCheck = currentTime;

            // If FPS is too low, reduce flake count
            if (fps < CONFIG.MIN_FPS_THRESHOLD && _currentFlakeCount > 20) {
                _currentFlakeCount = Math.max(20, Math.floor(_currentFlakeCount * 0.8));
                // Remove excess flakes
                if (_flakes.length > _currentFlakeCount) {
                    _flakes = _flakes.slice(0, _currentFlakeCount);
                }
            } else if (fps > CONFIG.ANIMATION_FPS * 0.9 && _currentFlakeCount < CONFIG.MAX_FLAKES) {
                // If FPS is good (above 90% of target), gradually increase flake count
                _currentFlakeCount = Math.min(CONFIG.MAX_FLAKES, Math.floor(_currentFlakeCount * 1.1));
            }
        }
    }

    /**
     * Animation loop (optimized)
     * @param {number} currentTime - Current timestamp
     */
    function _animate(currentTime) {
        if (!_isEnabled) return;

        const deltaTime = currentTime - _lastFrameTime;

        // Throttle to target FPS
        if (deltaTime >= _frameInterval) {
            _updateFlakes(deltaTime);
            _checkPerformance(currentTime);
            _lastFrameTime = currentTime;
        }

        _animationId = requestAnimationFrame(_animate);
    }

    /**
     * Start snow animation
     */
    function _start() {
        if (_isEnabled || !_isHolidayPeriod() || !_isTriggered()) return;

        _initCanvas();
        _isEnabled = true;

        // Initialize performance monitoring
        _currentFlakeCount = CONFIG.MAX_FLAKES;
        _frameCount = 0;
        _lastFpsCheck = performance.now();

        // Initialize flakes
        _flakes = [];
        for (let i = 0; i < CONFIG.MAX_FLAKES; i++) {
            _flakes.push(_createFlake());
        }

        _lastFrameTime = performance.now();
        _animationId = requestAnimationFrame(_animate);
    }

    /**
     * Stop snow animation
     */
    function _stop() {
        if (!_isEnabled) return;

        _isEnabled = false;
        if (_animationId) {
            cancelAnimationFrame(_animationId);
            _animationId = null;
        }

        if (_canvas && _ctx) {
            _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
        }
    }

    /**
     * Cleanup canvas
     */
    function _cleanup() {
        _stop();
        if (_canvas && _canvas.parentNode) {
            _canvas.parentNode.removeChild(_canvas);
        }
        _canvas = null;
        _ctx = null;
        _flakes = [];
    }

    // Public API
    return {
        /**
         * Enable snow effect
         */
        enable() {
            if (!_isHolidayPeriod() || !_isTriggered()) return;
            _saveEnabledState(true);
            _start();
        },

        /**
         * Disable snow effect
         */
        disable() {
            _saveEnabledState(false);
            _stop();
        },

        /**
         * Toggle snow effect
         * @returns {boolean} New enabled state
         */
        toggle() {
            if (_isEnabled) {
                this.disable();
                return false;
            } else {
                this.enable();
                return true;
            }
        },

        /**
         * Check if snow effect is enabled
         * @returns {boolean}
         */
        isEnabled() {
            return _isEnabled;
        },

        /**
         * Check if we're in the holiday period
         * @returns {boolean}
         */
        isHolidayPeriod() {
            return _isHolidayPeriod();
        },

        /**
         * Check if snow effect has been triggered
         * @returns {boolean}
         */
        isTriggered() {
            return _isTriggered();
        },

        /**
         * Trigger the easter egg (mark as triggered)
         */
        trigger() {
            _markTriggered();
            // Auto-enable if in holiday period
            if (_isHolidayPeriod()) {
                this.enable();
            }
        },

        /**
         * Initialize snow effect (load state and start if enabled)
         */
        init() {
            if (!_isHolidayPeriod() || !_isTriggered()) return;

            if (_getEnabledState()) {
                _start();
            }
        },

        /**
         * Cleanup resources
         */
        destroy() {
            _cleanup();
        }
    };
})();

// Export for global use
window.SnowEffect = SnowEffect;

