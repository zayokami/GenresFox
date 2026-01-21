/**
 * Debug Console Module
 * Provides debugging commands and performance testing utilities
 * 
 * Usage in browser console:
 * - GenresFox.debug.help() - Show all available commands
 * - GenresFox.debug.benchmark() - Run performance benchmarks
 * - GenresFox.debug.status() - Show system status
 * - GenresFox.debug.cache() - Show cache information
 * - GenresFox.debug.testImage(width, height) - Test image processing
 */

const DebugConsole = (function() {
    'use strict';

    // ==================== Configuration ====================
    const CONFIG = {
        BENCHMARK_ITERATIONS: 5,
        TEST_IMAGE_SIZES: [
            { w: 1920, h: 1080, name: '1080p' },
            { w: 3840, h: 2160, name: '4K' },
            { w: 7680, h: 4320, name: '8K' }
        ],
        QUALITY_TEST_ITERATIONS: 3
    };

    // Common console log styles (centralized for easier maintenance)
    const LOG_STYLES = {
        title: 'color: #4CAF50; font-size: 16px; font-weight: bold',
        subtitle: 'color: #2196F3; font-size: 12px',
        sectionInfo: 'color: #4CAF50; font-weight: bold',
        sectionModules: 'color: #2196F3',
        sectionPerformance: 'color: #FF9800; font-weight: bold',
        sectionQuality: 'color: #9C27B0; font-weight: bold',
        sectionPerfGroup: 'color: #F44336',
        sectionCache: 'color: #4CAF50; font-weight: bold',
        sectionLocalStorage: 'color: #2196F3',
        sectionImageProcessorCache: 'color: #FF9800',
        sectionMemory: 'color: #9C27B0',
        debugReady: 'color: #4CAF50; font-size: 14px; font-weight: bold',
        helpTitle: 'color: #4CAF50; font-size: 16px; font-weight: bold',
        helpSubtitle: 'color: #2196F3; font-weight: bold',
        helpCategory: 'color: #FF9800',
        helpExamples: 'color: #9C27B0'
    };

    // ==================== State ====================
    let _state = {
        benchmarks: [],
        isRunning: false,
        debugMode: false
    };

    // ==================== Helper Functions ====================

    /**
     * Format bytes to human-readable string
     */
    function _formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Format milliseconds to human-readable string
     */
    function _formatTime(ms) {
        if (ms < 1) return (ms * 1000).toFixed(2) + ' μs';
        if (ms < 1000) return ms.toFixed(2) + ' ms';
        return (ms / 1000).toFixed(2) + ' s';
    }

    // ==================== Reusable Resources ====================
    // Reuse internal canvases to avoid frequent DOM allocations during benchmarks
    let _imageDataCanvas = null;
    let _resizeCanvas = null;

    /**
     * Create a test image with specified dimensions
     */
    function _createTestImage(width, height) {
        const canvas = typeof document !== 'undefined'
            ? document.createElement('canvas')
            : null;
        
        if (!canvas) {
            throw new Error('Canvas is not available in this environment');
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        // Create a gradient pattern for visual testing
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#ff0000');
        gradient.addColorStop(0.5, '#00ff00');
        gradient.addColorStop(1, '#0000ff');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // Add some noise for complexity
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            if (Math.random() > 0.95) {
                data[i] = Math.random() * 255;     // R
                data[i + 1] = Math.random() * 255; // G
                data[i + 2] = Math.random() * 255; // B
            }
        }
        ctx.putImageData(imageData, 0, 0);
        
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Failed to create test image blob'));
                    return;
                }
                
                try {
                    if (typeof File !== 'undefined') {
                        resolve(new File([blob], 'test-image.png', { type: 'image/png' }));
                    } else {
                        // Older environments may not support File; fall back to Blob
                        resolve(blob);
                    }
                } catch (e) {
                    // In case File constructor is present but unusable, fall back to Blob
                    resolve(blob);
                }
            }, 'image/png');
        });
    }

    /**
     * Get memory usage (if available)
     */
    function _getMemoryInfo() {
        try {
            if (typeof performance !== 'undefined' && performance && performance.memory) {
                return {
                    used: _formatBytes(performance.memory.usedJSHeapSize),
                    total: _formatBytes(performance.memory.totalJSHeapSize),
                    limit: _formatBytes(performance.memory.jsHeapSizeLimit)
                };
            }
        } catch (e) {
            // Some environments may expose performance but not allow memory access
        }
        return { available: false };
    }

    /**
     * Calculate SSIM (Structural Similarity Index) between two images
     * Returns value between -1 and 1, where 1 means identical
     * Images must be same size
     */
    function _calculateSSIM(img1Data, img2Data) {
        if (img1Data.width !== img2Data.width || img1Data.height !== img2Data.height) {
            console.warn('SSIM: Images must be same size');
            return 0;
        }
        
        const width = img1Data.width;
        const height = img1Data.height;
        const data1 = img1Data.data;
        const data2 = img2Data.data;
        
        const C1 = Math.pow(0.01 * 255, 2);
        const C2 = Math.pow(0.03 * 255, 2);
        
        let mu1 = 0, mu2 = 0;
        let sigma1Sq = 0, sigma2Sq = 0, sigma12 = 0;
        
        const pixelCount = width * height;
        const grays1 = [];
        const grays2 = [];
        
        for (let i = 0; i < data1.length; i += 4) {
            const gray1 = 0.299 * data1[i] + 0.587 * data1[i + 1] + 0.114 * data1[i + 2];
            const gray2 = 0.299 * data2[i] + 0.587 * data2[i + 1] + 0.114 * data2[i + 2];
            grays1.push(gray1);
            grays2.push(gray2);
            mu1 += gray1;
            mu2 += gray2;
        }
        
        mu1 /= pixelCount;
        mu2 /= pixelCount;
        
        for (let i = 0; i < grays1.length; i++) {
            const diff1 = grays1[i] - mu1;
            const diff2 = grays2[i] - mu2;
            sigma1Sq += diff1 * diff1;
            sigma2Sq += diff2 * diff2;
            sigma12 += diff1 * diff2;
        }
        
        sigma1Sq /= pixelCount;
        sigma2Sq /= pixelCount;
        sigma12 /= pixelCount;
        
        const numerator = (2 * mu1 * mu2 + C1) * (2 * sigma12 + C2);
        const denominator = (mu1 * mu1 + mu2 * mu2 + C1) * (sigma1Sq + sigma2Sq + C2);
        
        if (denominator === 0) return 0;
        return numerator / denominator;
    }

    /**
     * Calculate PSNR (Peak Signal-to-Noise Ratio) between two images
     * Returns value in dB, higher is better (typically 20-50 dB)
     * Images must be same size
     */
    function _calculatePSNR(img1Data, img2Data) {
        if (img1Data.width !== img2Data.width || img1Data.height !== img2Data.height) {
            console.warn('PSNR: Images must be same size');
            return 0;
        }
        
        const data1 = img1Data.data;
        const data2 = img2Data.data;
        const pixelCount = img1Data.width * img1Data.height;
        
        let mse = 0;
        for (let i = 0; i < data1.length; i += 4) {
            const rDiff = data1[i] - data2[i];
            const gDiff = data1[i + 1] - data2[i + 1];
            const bDiff = data1[i + 2] - data2[i + 2];
            mse += (rDiff * rDiff + gDiff * gDiff + bDiff * bDiff) / 3;
        }
        
        mse /= pixelCount;
        
        if (mse === 0) return Infinity;
        if (mse < 1e-10) return 100;
        
        const maxPixelValue = 255;
        const psnr = 20 * Math.log10(maxPixelValue / Math.sqrt(mse));
        
        return psnr;
    }

    /**
     * Get ImageData from canvas or image
     */
    async function _getImageData(source) {
        if (typeof ImageData !== 'undefined' && source instanceof ImageData) {
            return source;
        }
        
        if (!_imageDataCanvas) {
            if (typeof document === 'undefined') {
                throw new Error('Canvas is not available in this environment');
            }
            _imageDataCanvas = document.createElement('canvas');
        }
        const canvas = _imageDataCanvas;
        try {
            if ((typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) ||
                (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement)) {
                canvas.width = source.width;
                canvas.height = source.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(source, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                // Clean up temporary canvas
                canvas.width = 0;
                canvas.height = 0;
                return imageData;
            }
            
            if (typeof OffscreenCanvas !== 'undefined' && source instanceof OffscreenCanvas) {
                const ctx = source.getContext('2d');
                return ctx.getImageData(0, 0, source.width, source.height);
            }
            
            throw new Error('Unsupported image source type');
        } catch (e) {
            // Clean up canvas on error
            canvas.width = 0;
            canvas.height = 0;
            throw e;
        }
    }

    /**
     * Resize image using Canvas API (for comparison)
     */
    function _resizeWithCanvas(img, targetWidth, targetHeight) {
        if (!_resizeCanvas) {
            if (typeof document === 'undefined') {
                throw new Error('Canvas is not available in this environment');
            }
            _resizeCanvas = document.createElement('canvas');
        }
        const canvas = _resizeCanvas;
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        return canvas;
    }

    // ==================== Benchmark Functions ====================

    /**
     * Benchmark image processing performance
     */
    async function _benchmarkImageProcessing() {
        console.log('%c[Benchmark] Starting image processing benchmarks...', 'color: #4CAF50; font-weight: bold');
        
        const results = [];
        
        for (const size of CONFIG.TEST_IMAGE_SIZES) {
            console.log(`\n%c[Benchmark] Testing ${size.name} (${size.w}x${size.h})...`, 'color: #2196F3');
            
            try {
                // Create test image
                const testFile = await _createTestImage(size.w, size.h);
                const fileSize = testFile.size || (testFile instanceof Blob ? testFile.size : 0);
                const pixels = size.w * size.h;
                
                console.log(`  Image size: ${_formatBytes(fileSize)}, Pixels: ${(pixels / 1000000).toFixed(2)}MP`);
                
                // Test with ImageProcessor
                if (typeof ImageProcessor !== 'undefined' && ImageProcessor.processImage) {
                    const times = [];
                    
                    for (let i = 0; i < CONFIG.BENCHMARK_ITERATIONS; i++) {
                        const start = performance.now();
                        try {
                            await ImageProcessor.processImage(testFile, {
                                maxWidth: 1920,
                                maxHeight: 1080
                            });
                            const end = performance.now();
                            times.push(end - start);
                        } catch (e) {
                            console.warn(`  Iteration ${i + 1} failed:`, e);
                        }
                    }
                    
                    if (times.length > 0) {
                        const avg = times.reduce((a, b) => a + b, 0) / times.length;
                        const min = Math.min(...times);
                        const max = Math.max(...times);
                        
                        results.push({
                            size: size.name,
                            dimensions: `${size.w}x${size.h}`,
                            pixels: `${(pixels / 1000000).toFixed(2)}MP`,
                            avg: avg,
                            min: min,
                            max: max,
                            iterations: times.length
                        });
                        
                        console.log(`  Average: ${_formatTime(avg)}`);
                        console.log(`  Min: ${_formatTime(min)}, Max: ${_formatTime(max)}`);
                    }
                } else {
                    console.warn('  ImageProcessor not available');
                }
            } catch (e) {
                console.error(`  Failed to benchmark ${size.name}:`, e);
            }
        }
        
        return results;
    }

    /**
     * Benchmark WASM vs Canvas performance
     */
    async function _benchmarkWasmVsCanvas() {
        console.log('%c[Benchmark] Comparing WASM vs Canvas performance...', 'color: #4CAF50; font-weight: bold');
        
        if (typeof ImageProcessor === 'undefined') {
            console.warn('ImageProcessor not available');
            return null;
        }
        
        const wasmStatus = ImageProcessor.getWasmStatus();
        console.log(`WASM Status: ${wasmStatus.loaded ? '[YES] Loaded' : '[NO] Not loaded'}`);
        
        if (!wasmStatus.loaded) {
            console.warn('WASM not loaded, cannot compare');
            return null;
        }
        
        // This would require exposing internal methods or creating test images
        // For now, just report WASM status
        return {
            wasmLoaded: wasmStatus.loaded,
            wasmUrl: wasmStatus.url,
            autoEnableThreshold: '20MP'
        };
    }

    // ==================== Status Functions ====================

    /**
     * Get system status
     */
    function _getSystemStatus() {
        const status = {
            timestamp: new Date().toISOString(),
            modules: {},
            memory: _getMemoryInfo(),
            performance: {}
        };
        
        // Check module availability
        status.modules = {
            ImageProcessor: typeof ImageProcessor !== 'undefined',
            WallpaperManager: typeof WallpaperManager !== 'undefined',
            SearchBar: typeof window.SearchBar !== 'undefined',
            I18n: typeof I18n !== 'undefined',
            AccessibilityManager: typeof AccessibilityManager !== 'undefined',
            SnowEffect: typeof SnowEffect !== 'undefined'
        };
        
        // Get WASM status
        if (typeof ImageProcessor !== 'undefined' && ImageProcessor.getWasmStatus) {
            status.wasm = ImageProcessor.getWasmStatus();
        }
        
        // Performance metrics
        try {
            if (typeof performance !== 'undefined' && performance && performance.timing) {
                const timing = performance.timing;
                const paintEntries = typeof performance.getEntriesByType === 'function'
                    ? performance.getEntriesByType('paint')
                    : [];
                const firstPaintEntry = paintEntries.find(e => e.name === 'first-paint');
                const fcpEntry = paintEntries.find(e => e.name === 'first-contentful-paint');
                
                status.performance = {
                    pageLoad: timing.loadEventEnd && timing.navigationStart ? timing.loadEventEnd - timing.navigationStart : undefined,
                    domContentLoaded: timing.domContentLoadedEventEnd && timing.navigationStart ? timing.domContentLoadedEventEnd - timing.navigationStart : undefined,
                    firstPaint: firstPaintEntry?.startTime,
                    firstContentfulPaint: fcpEntry?.startTime
                };
            }
        } catch (e) {
            // Ignore performance API errors; keep status.performance empty
        }
        
        return status;
    }

    /**
     * Get cache information
     */
    function _getCacheInfo() {
        const info = {
            localStorage: {},
            indexedDB: 'Not accessible from main thread'
        };
        
        // Check localStorage usage
        try {
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    const value = localStorage.getItem(key);
                    totalSize += key.length + value.length;
                }
            }
            info.localStorage = {
                keys: Object.keys(localStorage).length,
                estimatedSize: _formatBytes(totalSize * 2) // UTF-16 encoding
            };
        } catch (e) {
            info.localStorage = { error: e.message };
        }
        
        // ImageProcessor cache
        if (typeof ImageProcessor !== 'undefined' && ImageProcessor.getCacheInfo) {
            info.imageProcessor = ImageProcessor.getCacheInfo();
        }
        
        return info;
    }

    // ==================== Public API ====================

    /**
     * Show help message in the browser console.
     * 
     * @returns {void}
     */
    function help() {
        console.log(`
%cGenresFox Debug Console
%cAvailable Commands:

%cStatus & Information:
  GenresFox.debug.status()        - Show system status
  GenresFox.debug.cache()          - Show cache information
  GenresFox.debug.memory()         - Show memory usage

%cPerformance & Quality Testing:
  GenresFox.debug.benchmark()      - Run comprehensive performance and quality benchmarks
  GenresFox.debug.testImage(w, h)  - Test image processing with custom size
  GenresFox.debug.performance()    - Run performance benchmarks only
  GenresFox.debug.quality()        - Run quality metrics (SSIM/PSNR) only

%cUtilities:
  GenresFox.debug.help()           - Show this help message
  GenresFox.debug.clear()          - Clear console

%cExamples:
  GenresFox.debug.benchmark()
  GenresFox.debug.testImage(3840, 2160)
        `, 
        LOG_STYLES.helpTitle,
        LOG_STYLES.helpSubtitle,
        LOG_STYLES.helpCategory,
        LOG_STYLES.helpCategory,
        LOG_STYLES.helpCategory,
        LOG_STYLES.helpExamples
        );
    }

    /**
     * Show system status, including module availability, WASM status,
     * memory usage (if available) and basic performance timing.
     *
     * @returns {Object} structured status information
     */
    function status() {
        const status = _getSystemStatus();
        console.group('%cSystem Status', LOG_STYLES.sectionInfo);
        console.log('Timestamp:', status.timestamp);
        
        console.group('%cModules', LOG_STYLES.sectionModules);
        Object.entries(status.modules).forEach(([name, loaded]) => {
            console.log(`${name}:`, loaded ? '[YES]' : '[NO]');
        });
        console.groupEnd();
        
        if (status.wasm) {
            console.group('%cWASM', LOG_STYLES.sectionPerformance);
            console.log('Loaded:', status.wasm.loaded ? '[YES]' : '[NO]');
            if (status.wasm.url) console.log('URL:', status.wasm.url);
            console.groupEnd();
        }
        
        if (status.memory.available !== false) {
            console.group('%cMemory', LOG_STYLES.sectionMemory);
            console.log('Used:', status.memory.used);
            console.log('Total:', status.memory.total);
            console.log('Limit:', status.memory.limit);
            console.groupEnd();
        }
        
        if (Object.keys(status.performance).length > 0) {
            console.group('%cPerformance', LOG_STYLES.sectionPerfGroup);
            Object.entries(status.performance).forEach(([key, value]) => {
                if (value) console.log(key + ':', _formatTime(value));
            });
            console.groupEnd();
        }
        
        console.groupEnd();
        return status;
    }

    /**
     * Show cache information such as localStorage usage and
     * ImageProcessor internal cache (if available).
     *
     * @returns {Object} structured cache info
     */
    function cache() {
        const info = _getCacheInfo();
        console.group('%cCache Information', LOG_STYLES.sectionCache);
        
        console.group('%cLocalStorage', LOG_STYLES.sectionLocalStorage);
        console.log('Keys:', info.localStorage.keys || 'N/A');
        console.log('Estimated Size:', info.localStorage.estimatedSize || 'N/A');
        console.groupEnd();
        
        if (info.imageProcessor) {
            console.group('%cImageProcessor Cache', LOG_STYLES.sectionImageProcessorCache);
            console.log(info.imageProcessor);
            console.groupEnd();
        }
        
        console.groupEnd();
        return info;
    }

    /**
     * Show JS heap memory usage if supported by the browser.
     *
     * @returns {Object|null} memory info object, or null if not available
     */
    function memory() {
        const mem = _getMemoryInfo();
        if (mem.available === false) {
            console.warn('Memory information not available in this browser');
            return null;
        }
        
        console.group('%cMemory Usage', LOG_STYLES.sectionMemory);
        console.log('Used:', mem.used);
        console.log('Total:', mem.total);
        console.log('Limit:', mem.limit);
        console.groupEnd();
        return mem;
    }

    /**
     * Run comprehensive performance and quality benchmarks.
     * This will run both performance and quality suites and
     * return raw data plus a summarized view.
     *
     * @returns {Promise<{performance: Array, quality: Array, summary: Array, skipped?: boolean, reason?: string}|null>}
     *          benchmark result object, or a skipped result when ImageProcessor is unavailable.
     */
    async function benchmark() {
        if (_state.isRunning) {
            console.warn('Benchmark already running');
            return;
        }

        if (typeof ImageProcessor === 'undefined' || !ImageProcessor || !ImageProcessor.processImage) {
            const reason = 'ImageProcessor is not available; benchmark requires image processing capabilities.';
            console.warn('[Benchmark] Skipped:', reason);
            const skippedResult = {
                performance: [],
                quality: [],
                summary: [],
                skipped: true,
                reason
            };
            return skippedResult;
        }
        
        _state.isRunning = true;
        console.log('%c=== GenresFox Comprehensive Benchmark Suite ===', LOG_STYLES.title);
        console.log('%cThis will test both performance and quality metrics', LOG_STYLES.subtitle);
        
        try {
            const results = {
                performance: await _runPerformanceBenchmarks(),
                quality: await _runQualityBenchmarks(),
                summary: {}
            };
            
            results.summary = _generateBenchmarkSummary(results);
            
            console.log('\n%c=== Benchmark Complete ===', 'color: #4CAF50; font-weight: bold');
            console.log('%cPerformance Results:', 'color: #FF9800; font-weight: bold');
            console.table(results.performance);
            console.log('%cQuality Results:', 'color: #9C27B0; font-weight: bold');
            console.table(results.quality);
            console.log('%cSummary:', 'color: #4CAF50; font-weight: bold');
            console.table(results.summary);
            
            _state.benchmarks.push({
                timestamp: new Date().toISOString(),
                results: results
            });
            
            return results;
        } catch (e) {
            console.error('Benchmark failed:', e);
            return null;
        } finally {
            _state.isRunning = false;
        }
    }

    /**
     * Run performance benchmarks
     */
    async function _runPerformanceBenchmarks() {
        console.log('\n%c[Performance] Starting performance benchmarks...', LOG_STYLES.sectionPerformance);
        
        const results = [];
        const wasmStatus = typeof ImageProcessor !== 'undefined' && ImageProcessor.getWasmStatus ? ImageProcessor.getWasmStatus() : null;

        if (typeof ImageProcessor === 'undefined' || !ImageProcessor || !ImageProcessor.processImage) {
            console.warn('[Performance] ImageProcessor not available, skipping performance benchmarks.');
            return [{
                size: 'all',
                error: 'ImageProcessor not available',
                skipped: true
            }];
        }
        
        for (const size of CONFIG.TEST_IMAGE_SIZES) {
            console.log(`\n%c[Performance] Testing ${size.name} (${size.w}x${size.h})...`, 'color: #2196F3');
            
            try {
                const testFile = await _createTestImage(size.w, size.h);
                const pixels = size.w * size.h;
                const targetWidth = 1920;
                const targetHeight = 1080;
                
                const perfData = {
                    size: size.name,
                    dimensions: `${size.w}x${size.h}`,
                    pixels: `${(pixels / 1000000).toFixed(2)}MP`,
                    targetSize: `${targetWidth}x${targetHeight}`,
                    wasmAvailable: wasmStatus && wasmStatus.loaded
                };
                
                if (typeof ImageProcessor !== 'undefined' && ImageProcessor.processImage) {
                    const times = [];
                    const canMeasureMemory = (function() {
                        try {
                            return typeof performance !== 'undefined' && performance && performance.memory && typeof performance.memory.usedJSHeapSize === 'number';
                        } catch (e) {
                            return false;
                        }
                    })();
                    
                    const memoryBefore = canMeasureMemory ? performance.memory.usedJSHeapSize : 0;
                    
                    for (let i = 0; i < CONFIG.BENCHMARK_ITERATIONS; i++) {
                        const start = performance.now();
                        try {
                            await ImageProcessor.processImage(testFile, {
                                maxWidth: targetWidth,
                                maxHeight: targetHeight
                            });
                            const end = performance.now();
                            times.push(end - start);
                        } catch (e) {
                            console.warn(`  Iteration ${i + 1} failed:`, e);
                        }
                    }
                    
                    const memoryAfter = canMeasureMemory ? performance.memory.usedJSHeapSize : 0;
                    const memoryDelta = canMeasureMemory ? (memoryAfter - memoryBefore) : 0;
                    
                    if (times.length > 0) {
                        const avg = times.reduce((a, b) => a + b, 0) / times.length;
                        const min = Math.min(...times);
                        const max = Math.max(...times);
                        const stdDev = Math.sqrt(times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length);
                        
                        perfData.avgTime = _formatTime(avg);
                        perfData.minTime = _formatTime(min);
                        perfData.maxTime = _formatTime(max);
                        perfData.stdDev = _formatTime(stdDev);
                        perfData.throughput = `${((pixels / 1000000) / (avg / 1000)).toFixed(2)} MP/s`;
                        perfData.memoryDelta = canMeasureMemory ? _formatBytes(Math.abs(memoryDelta)) : 'N/A';
                        perfData.iterations = times.length;
                        
                        console.log(`  Average: ${perfData.avgTime}`);
                        console.log(`  Throughput: ${perfData.throughput}`);
                        console.log(`  Memory: ${perfData.memoryDelta}`);
                    }
                }
                
                results.push(perfData);
            } catch (e) {
                console.error(`  Failed to benchmark ${size.name}:`, e);
                results.push({
                    size: size.name,
                    dimensions: `${size.w}x${size.h}`,
                    error: e.message || String(e)
                });
            }
        }
        
        return results;
    }

    /**
     * Run quality benchmarks (SSIM/PSNR) comparing ImageProcessor
     * output against Canvas-based resizing.
     *
     * @returns {Promise<Array>} array of quality result objects
     */
    async function _runQualityBenchmarks() {
        console.log('\n%c[Quality] Starting quality benchmarks...', LOG_STYLES.sectionQuality);
        
        const results = [];
        const testSizes = [
            { w: 1920, h: 1080, name: '1080p', targetW: 960, targetH: 540 },
            { w: 3840, h: 2160, name: '4K', targetW: 1920, targetH: 1080 }
        ];
        
        if (typeof ImageProcessor === 'undefined' || !ImageProcessor || !ImageProcessor.processImage) {
            console.warn('[Quality] ImageProcessor not available, skipping quality benchmarks.');
            return [{
                size: 'all',
                error: 'ImageProcessor not available',
                skipped: true
            }];
        }

        for (const size of testSizes) {
            console.log(`\n%c[Quality] Testing ${size.name} (${size.w}x${size.h} -> ${size.targetW}x${size.targetH})...`, 'color: #2196F3');
            
            try {
                const testFile = await _createTestImage(size.w, size.h);
                const img = await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = URL.createObjectURL(testFile);
                });
                
                const qualityData = {
                    size: size.name,
                    sourceDimensions: `${size.w}x${size.h}`,
                    targetDimensions: `${size.targetW}x${size.targetH}`,
                    scaleFactor: `${(size.w / size.targetW).toFixed(2)}x`
                };
                
                if (typeof ImageProcessor !== 'undefined' && ImageProcessor.processImage) {
                    const processedResult = await ImageProcessor.processImage(testFile, {
                        maxWidth: size.targetW,
                        maxHeight: size.targetH,
                        useCache: false // Don't cache test images
                    });
                    
                    // processImage returns { blob, ...metadata }, extract blob
                    const processedBlob = processedResult?.blob || processedResult;
                    if (!(processedBlob instanceof Blob)) {
                        throw new Error('processImage did not return a Blob');
                    }
                    
                    const processedImg = await new Promise((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.onerror = reject;
                        img.src = URL.createObjectURL(processedBlob);
                    });
                    
                    const canvasResized = _resizeWithCanvas(img, size.targetW, size.targetH);
                    const originalResized = _resizeWithCanvas(img, size.targetW, size.targetH);
                    
                    const originalResizedData = await _getImageData(originalResized);
                    const processedData = await _getImageData(processedImg);
                    const canvasData = await _getImageData(canvasResized);
                    
                    // Clean up Canvas objects
                    canvasResized.width = 0;
                    canvasResized.height = 0;
                    originalResized.width = 0;
                    originalResized.height = 0;
                    
                    // Clean up object URLs safely
                    if (processedImg.src && processedImg.src.startsWith('blob:')) {
                        URL.revokeObjectURL(processedImg.src);
                    }
                    if (img.src && img.src.startsWith('blob:')) {
                        URL.revokeObjectURL(img.src);
                    }
                    
                    // Clean up Image objects (remove references)
                    processedImg.src = '';
                    img.src = '';
                    
                    const ssim = _calculateSSIM(originalResizedData, processedData);
                    const psnr = _calculatePSNR(originalResizedData, processedData);
                    const canvasSSIM = _calculateSSIM(originalResizedData, canvasData);
                    const canvasPSNR = _calculatePSNR(originalResizedData, canvasData);
                    
                    qualityData.ssim = ssim.toFixed(4);
                    qualityData.psnr = psnr === Infinity ? 'Infinity' : psnr.toFixed(2) + ' dB';
                    qualityData.canvasSSIM = canvasSSIM.toFixed(4);
                    qualityData.canvasPSNR = canvasPSNR === Infinity ? 'Infinity' : canvasPSNR.toFixed(2) + ' dB';
                    qualityData.qualityRating = ssim > 0.95 ? 'Excellent' : ssim > 0.90 ? 'Very Good' : ssim > 0.85 ? 'Good' : ssim > 0.80 ? 'Fair' : 'Poor';
                    
                    console.log(`  SSIM: ${qualityData.ssim} (${qualityData.qualityRating})`);
                    console.log(`  PSNR: ${qualityData.psnr}`);
                    console.log(`  vs Canvas SSIM: ${qualityData.canvasSSIM}`);
                    console.log(`  vs Canvas PSNR: ${qualityData.canvasPSNR}`);
                }
                
                // Ensure cleanup even if errors occur
                try {
                    if (img && img.src && img.src.startsWith('blob:')) {
                        URL.revokeObjectURL(img.src);
                    }
                } catch (e) {
                    // Ignore cleanup errors
                }
                
                results.push(qualityData);
            } catch (e) {
                console.error(`  Failed to test quality for ${size.name}:`, e);
                results.push({
                    size: size.name,
                    error: e.message || String(e)
                });
            }
        }
        
        return results;
    }

    /**
     * Generate benchmark summary
     */
    function _generateBenchmarkSummary(results) {
        const summary = [];
        
        if (results.performance && results.performance.length > 0 && !results.performance.every(r => r.skipped)) {
            const avgPerf = results.performance.reduce((sum, r) => {
                const timeStr = r.avgTime || '0 ms';
                const timeMs = parseFloat(timeStr.replace(/[^\d.]/g, '')) || 0;
                return sum + timeMs;
            }, 0) / results.performance.length;
            
            summary.push({
                metric: 'Average Processing Time',
                value: _formatTime(avgPerf),
                category: 'Performance'
            });
        }
        
        if (results.quality && results.quality.length > 0 && !results.quality.every(r => r.skipped)) {
            const avgSSIM = results.quality.reduce((sum, r) => sum + parseFloat(r.ssim || 0), 0) / results.quality.length;
            const avgPSNR = results.quality.reduce((sum, r) => {
                const psnrStr = r.psnr || '0 dB';
                const psnr = psnrStr === 'Infinity' ? 100 : parseFloat(psnrStr.replace(/[^\d.]/g, '')) || 0;
                return sum + psnr;
            }, 0) / results.quality.length;
            
            summary.push({
                metric: 'Average SSIM',
                value: avgSSIM.toFixed(4),
                category: 'Quality'
            });
            
            summary.push({
                metric: 'Average PSNR',
                value: avgPSNR.toFixed(2) + ' dB',
                category: 'Quality'
            });
        }
        
        return summary;
    }

    /**
     * Test image processing with custom dimensions.
     *
     * @param {number} [width=1920]  source image width
     * @param {number} [height=1080] source image height
     * @returns {Promise<*>} result returned by ImageProcessor.processImage, or null when unavailable
     */
    async function testImage(width = 1920, height = 1080) {
        console.log(`%c[Test] Creating test image: ${width}x${height}`, 'color: #4CAF50; font-weight: bold');
        
        try {
            const testFile = await _createTestImage(width, height);
            console.log(`Created: ${_formatBytes(testFile.size)}`);
            
            if (typeof ImageProcessor !== 'undefined' && ImageProcessor.processImage) {
                const start = performance.now();
                const result = await ImageProcessor.processImage(testFile, {
                    maxWidth: 1920,
                    maxHeight: 1080
                });
                const end = performance.now();
                
                console.log(`Processing time: ${_formatTime(end - start)}`);
                console.log('Result:', result);
                return result;
            } else {
                console.warn('ImageProcessor not available');
                return null;
            }
        } catch (e) {
            console.error('Test failed:', e);
            return null;
        }
    }

    /**
     * Clear console
     */
    function clear() {
        console.clear();
        console.log('%cGenresFox Debug Console - Ready', LOG_STYLES.debugReady);
        help();
    }

    /**
     * Enable debug mode, which activates various console easter eggs
     * and special getters on the window object.
     *
     * @returns {void}
     */
    function debugMode() {
        _state.debugMode = true;
    }

    /**
     * Trigger the internal 6-7 easter egg output when in debug mode.
     *
     * @returns {void}
     */
    function easterEgg67() {
        if (!_state.debugMode) {
            return;
        }
        console.log('%c?', 'color: #4CAF50; font-size: 48px; font-weight: bold');
    }

    if (typeof window !== 'undefined') {
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        
        window.__originalConsole = {
            log: originalLog,
            error: originalError,
            warn: originalWarn
        };
    }

    /**
     * Check if debug mode is currently active.
     *
     * @returns {boolean}
     */
    function isDebugMode() {
        return _state.debugMode;
    }

    // ==================== Exports ====================
    /**
     * Get a shallow copy of the current debug configuration.
     *
     * @returns {{BENCHMARK_ITERATIONS: number, TEST_IMAGE_SIZES: Array, QUALITY_TEST_ITERATIONS: number}}
     */
    function getConfig() {
        return {
            BENCHMARK_ITERATIONS: CONFIG.BENCHMARK_ITERATIONS,
            TEST_IMAGE_SIZES: CONFIG.TEST_IMAGE_SIZES.slice(),
            QUALITY_TEST_ITERATIONS: CONFIG.QUALITY_TEST_ITERATIONS
        };
    }

    /**
     * Update selected configuration options at runtime.
     * Only known keys will be applied and basic validation is performed.
     *
     * @param {Object} options
     * @param {number} [options.BENCHMARK_ITERATIONS]
     * @param {Array<{w:number,h:number,name:string}>} [options.TEST_IMAGE_SIZES]
     * @param {number} [options.QUALITY_TEST_ITERATIONS]
     * @returns {void}
     */
    function configure(options) {
        if (!options || typeof options !== 'object') return;

        if (typeof options.BENCHMARK_ITERATIONS === 'number' && options.BENCHMARK_ITERATIONS > 0) {
            CONFIG.BENCHMARK_ITERATIONS = Math.floor(options.BENCHMARK_ITERATIONS);
        }

        if (Array.isArray(options.TEST_IMAGE_SIZES) && options.TEST_IMAGE_SIZES.length > 0) {
            CONFIG.TEST_IMAGE_SIZES = options.TEST_IMAGE_SIZES
                .filter(size => size && typeof size.w === 'number' && typeof size.h === 'number')
                .map(size => ({
                    w: Math.floor(size.w),
                    h: Math.floor(size.h),
                    name: size.name || `${size.w}x${size.h}`
                }));
        }

        if (typeof options.QUALITY_TEST_ITERATIONS === 'number' && options.QUALITY_TEST_ITERATIONS > 0) {
            CONFIG.QUALITY_TEST_ITERATIONS = Math.floor(options.QUALITY_TEST_ITERATIONS);
        }
    }

    return {
        help,
        status,
        cache,
        memory,
        benchmark,
        performance: _runPerformanceBenchmarks,
        quality: _runQualityBenchmarks,
        testImage,
        clear,
        debugMode,
        easterEgg67,
        isDebugMode,
        getConfig,
        configure
    };
})();

// Expose to global scope
if (typeof window !== 'undefined') {
    if (!window.GenresFox) {
        window.GenresFox = {};
    }
    window.GenresFox.debug = DebugConsole;
    
    // Also expose as $debug for convenience
    window.$debug = DebugConsole;
    
    Object.defineProperty(window, 'debug_mode', {
        get: function() {
            DebugConsole.debugMode();
            return 0; // Return 0 so -debug_mode = -0, which doesn't error
        },
        configurable: true,
        enumerable: true
    });
    
    Object.defineProperty(window, 'six', {
        get: function() {
            if (DebugConsole.isDebugMode && DebugConsole.isDebugMode()) {
                window.__expectingSeven = true;
                setTimeout(() => {
                    if (window.__expectingSeven) {
                        window.__expectingSeven = false;
                    }
                }, 1000);
            }
            return 6;
        },
        configurable: true,
        enumerable: false
    });
    
    Object.defineProperty(window, 'seven', {
        get: function() {
            if (DebugConsole.isDebugMode && DebugConsole.isDebugMode() && window.__expectingSeven) {
                window.__expectingSeven = false;
                DebugConsole.easterEgg67();
            }
            return 7;
        },
        configurable: true,
        enumerable: false
    });
    
    Object.defineProperty(window, 'sixseven', {
        get: function() {
            if (DebugConsole.isDebugMode && DebugConsole.isDebugMode()) {
                DebugConsole.easterEgg67();
            }
            return 67;
        },
        configurable: true,
        enumerable: false
    });
    
    Object.defineProperty(window, 'AnswerToTheUltimateQuestionOfLifeTheUniverseAndEverything', {
        get: function() {
            if (DebugConsole.isDebugMode && DebugConsole.isDebugMode()) {
                console.log('%c42', 'color: #4CAF50; font-size: 48px; font-weight: bold');
            }
            return 42;
        },
        configurable: true,
        enumerable: false
    });
    
    Object.defineProperty(window, 'AnswerToEverything', {
        get: function() {
            if (DebugConsole.isDebugMode && DebugConsole.isDebugMode()) {
                console.log('%c42', 'color: #4CAF50; font-size: 48px; font-weight: bold');
            }
            return 42;
        },
        configurable: true,
        enumerable: false
    });
    
    Object.defineProperty(window, 'sudoMakeMeASandwich', {
        get: function() {
            if (DebugConsole.isDebugMode && DebugConsole.isDebugMode()) {
                console.log('%cok.', 'color: #4CAF50; font-size: 16px; font-weight: bold');
            }
            return 'ok.';
        },
        configurable: true,
        enumerable: false
    });
}

