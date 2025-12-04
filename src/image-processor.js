/**
 * High-Performance Image Processor Module
 * Handles large images (up to 100MB+) with optimized memory management
 * 
 * Features:
 * - Smart resizing based on screen resolution
 * - Progressive loading (quick preview + background optimization)
 * - Chunked processing for very large images
 * - Memory leak prevention
 * - Quality/size optimization
 */

const ImageProcessor = (function() {
    'use strict';

    // ==================== Configuration ====================
    const CONFIG = {
        // Maximum dimensions (based on common 4K displays with some margin)
        MAX_WIDTH: 3840,
        MAX_HEIGHT: 2160,
        
        // Quality settings
        QUALITY_HIGH: 0.92,
        QUALITY_MEDIUM: 0.85,
        QUALITY_LOW: 0.7,
        QUALITY_PREVIEW: 0.5,
        
        // Preview settings (for quick loading)
        PREVIEW_MAX_WIDTH: 800,
        PREVIEW_MAX_HEIGHT: 600,
        
        // Processing thresholds
        LARGE_IMAGE_THRESHOLD: 10 * 1024 * 1024,  // 10MB - use chunked processing
        HUGE_IMAGE_THRESHOLD: 30 * 1024 * 1024,   // 30MB - use extra optimization
        
        // Pixel count limits - reject images that are too large
        MAX_PIXELS: 50 * 1000 * 1000,  // 50 megapixels max (e.g. 8660x5773 or 10000x5000)
        
        // Memory management
        CHUNK_SIZE: 2048,  // Process in 2048px chunks for large images
        GC_DELAY: 100,     // Delay before garbage collection hint
        
        // Supported formats
        OUTPUT_FORMAT: 'image/webp',  // WebP for best compression
        FALLBACK_FORMAT: 'image/jpeg', // Fallback if WebP not supported
        
        // File size limits
        MAX_FILE_SIZE: 50 * 1024 * 1024,  // 50MB max file size
        TARGET_OUTPUT_SIZE: 5 * 1024 * 1024, // Target 5MB output for storage efficiency
    };

    // ==================== State ====================
    let _state = {
        isProcessing: false,
        supportsWebP: null,
        supportsOffscreenCanvas: typeof OffscreenCanvas !== 'undefined',
        activeObjectUrls: new Set(),  // Track active URLs for cleanup
    };

    // ==================== Utility Functions ====================

    /**
     * Check if browser supports WebP encoding
     * @returns {Promise<boolean>}
     */
    async function _checkWebPSupport() {
        if (_state.supportsWebP !== null) return _state.supportsWebP;
        
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const dataUrl = canvas.toDataURL('image/webp');
            _state.supportsWebP = dataUrl.startsWith('data:image/webp');
        } catch (e) {
            _state.supportsWebP = false;
        }
        return _state.supportsWebP;
    }

    /**
     * Get optimal output format
     * @returns {Promise<string>}
     */
    async function _getOutputFormat() {
        return await _checkWebPSupport() ? CONFIG.OUTPUT_FORMAT : CONFIG.FALLBACK_FORMAT;
    }

    /**
     * Calculate optimal dimensions while maintaining aspect ratio
     * @param {number} width - Original width
     * @param {number} height - Original height
     * @param {number} maxWidth - Maximum width
     * @param {number} maxHeight - Maximum height
     * @returns {{width: number, height: number}}
     */
    function _calculateDimensions(width, height, maxWidth, maxHeight) {
        // Get actual screen dimensions (with device pixel ratio for retina)
        const screenWidth = Math.min(maxWidth, window.screen.width * (window.devicePixelRatio || 1));
        const screenHeight = Math.min(maxHeight, window.screen.height * (window.devicePixelRatio || 1));
        
        // Use screen dimensions as target if smaller than max
        const targetWidth = Math.min(screenWidth, maxWidth);
        const targetHeight = Math.min(screenHeight, maxHeight);
        
        // If image is smaller than target, no resize needed
        if (width <= targetWidth && height <= targetHeight) {
            return { width, height };
        }
        
        // Calculate scale to fit
        const scaleX = targetWidth / width;
        const scaleY = targetHeight / height;
        const scale = Math.min(scaleX, scaleY);
        
        return {
            width: Math.round(width * scale),
            height: Math.round(height * scale)
        };
    }

    /**
     * Create an object URL and track it for cleanup
     * @param {Blob} blob - Blob to create URL for
     * @returns {string}
     */
    function _createTrackedObjectUrl(blob) {
        const url = URL.createObjectURL(blob);
        _state.activeObjectUrls.add(url);
        return url;
    }

    /**
     * Revoke a tracked object URL
     * @param {string} url - URL to revoke
     */
    function _revokeTrackedObjectUrl(url) {
        if (url && _state.activeObjectUrls.has(url)) {
            URL.revokeObjectURL(url);
            _state.activeObjectUrls.delete(url);
        }
    }

    /**
     * Clean up all tracked object URLs
     */
    function _cleanupAllObjectUrls() {
        _state.activeObjectUrls.forEach(url => {
            URL.revokeObjectURL(url);
        });
        _state.activeObjectUrls.clear();
    }

    /**
     * Force garbage collection hint (not guaranteed)
     */
    function _hintGC() {
        return new Promise(resolve => {
            setTimeout(() => {
                // Create and discard a large array to hint GC
                if (typeof gc === 'function') {
                    gc(); // Only available in Node.js or with --expose-gc
                }
                resolve();
            }, CONFIG.GC_DELAY);
        });
    }

    // ==================== Image Loading ====================

    /**
     * Load image from file with progress tracking
     * @param {File} file - Image file
     * @param {Function} onProgress - Progress callback (0-100)
     * @returns {Promise<HTMLImageElement>}
     */
    async function _loadImageFromFile(file, onProgress) {
        return new Promise((resolve, reject) => {
            const url = _createTrackedObjectUrl(file);
            const img = new Image();
            
            img.onload = () => {
                if (onProgress) onProgress(30); // 30% - image decoded
                resolve(img);
            };
            
            img.onerror = () => {
                _revokeTrackedObjectUrl(url);
                reject(new Error('Failed to load image'));
            };
            
            img.src = url;
        });
    }

    /**
     * Load image from Blob
     * @param {Blob} blob - Image blob
     * @returns {Promise<HTMLImageElement>}
     */
    async function _loadImageFromBlob(blob) {
        return new Promise((resolve, reject) => {
            const url = _createTrackedObjectUrl(blob);
            const img = new Image();
            
            img.onload = () => resolve(img);
            img.onerror = () => {
                _revokeTrackedObjectUrl(url);
                reject(new Error('Failed to load image from blob'));
            };
            
            img.src = url;
        });
    }

    // ==================== Canvas Processing ====================

    /**
     * Create a canvas with optimal settings
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}}
     */
    function _createCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d', {
            alpha: false,  // Disable alpha for better performance
            desynchronized: true,  // Reduce latency
            willReadFrequently: false  // Optimize for write-heavy operations
        });
        
        // Enable image smoothing for quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        return { canvas, ctx };
    }

    /**
     * Process image in chunks (for large images)
     * @param {HTMLImageElement} img - Source image
     * @param {number} targetWidth - Target width
     * @param {number} targetHeight - Target height
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<HTMLCanvasElement>}
     */
    async function _processInChunks(img, targetWidth, targetHeight, onProgress) {
        const { canvas: finalCanvas, ctx: finalCtx } = _createCanvas(targetWidth, targetHeight);
        
        const scaleX = targetWidth / img.width;
        const scaleY = targetHeight / img.height;
        
        const chunkSize = CONFIG.CHUNK_SIZE;
        const chunksX = Math.ceil(img.width / chunkSize);
        const chunksY = Math.ceil(img.height / chunkSize);
        const totalChunks = chunksX * chunksY;
        let processedChunks = 0;
        
        console.log(`Processing ${chunksX}x${chunksY} = ${totalChunks} chunks`);
        
        // Process each chunk
        for (let cy = 0; cy < chunksY; cy++) {
            for (let cx = 0; cx < chunksX; cx++) {
                // Source coordinates
                const sx = cx * chunkSize;
                const sy = cy * chunkSize;
                const sw = Math.min(chunkSize, img.width - sx);
                const sh = Math.min(chunkSize, img.height - sy);
                
                // Destination coordinates
                const dx = Math.round(sx * scaleX);
                const dy = Math.round(sy * scaleY);
                const dw = Math.max(1, Math.round(sw * scaleX));
                const dh = Math.max(1, Math.round(sh * scaleY));
                
                // Skip if destination is too small
                if (dw < 1 || dh < 1) {
                    processedChunks++;
                    continue;
                }
                
                // Create temporary canvas for this chunk
                const { canvas: tempCanvas, ctx: tempCtx } = _createCanvas(dw, dh);
                
                try {
                    // Draw chunk
                    tempCtx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
                    
                    // Copy to final canvas
                    finalCtx.drawImage(tempCanvas, dx, dy);
                } catch (e) {
                    console.warn(`Failed to process chunk (${cx}, ${cy}):`, e);
                }
                
                // Clean up temp canvas immediately
                tempCanvas.width = 0;
                tempCanvas.height = 0;
                
                processedChunks++;
                if (onProgress) {
                    // Progress from 35% to 75%
                    onProgress(35 + Math.round((processedChunks / totalChunks) * 40));
                }
                
                // Yield to main thread periodically to prevent UI freeze
                if (processedChunks % 4 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        }
        
        return finalCanvas;
    }

    /**
     * Process image directly (for smaller images)
     * @param {HTMLImageElement} img - Source image
     * @param {number} targetWidth - Target width
     * @param {number} targetHeight - Target height
     * @returns {HTMLCanvasElement}
     */
    function _processDirect(img, targetWidth, targetHeight) {
        const { canvas, ctx } = _createCanvas(targetWidth, targetHeight);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        return canvas;
    }

    /**
     * Multi-step downscaling for better quality
     * @param {HTMLImageElement} img - Source image
     * @param {number} targetWidth - Target width
     * @param {number} targetHeight - Target height
     * @returns {HTMLCanvasElement}
     */
    function _processWithSteps(img, targetWidth, targetHeight) {
        let currentWidth = img.width;
        let currentHeight = img.height;
        let source = img;
        
        // Step down by factor of 2 until close to target
        while (currentWidth > targetWidth * 2 || currentHeight > targetHeight * 2) {
            const stepWidth = Math.max(targetWidth, Math.round(currentWidth / 2));
            const stepHeight = Math.max(targetHeight, Math.round(currentHeight / 2));
            
            const { canvas, ctx } = _createCanvas(stepWidth, stepHeight);
            ctx.drawImage(source, 0, 0, stepWidth, stepHeight);
            
            // Clean up previous canvas if it's not the original image
            if (source !== img && source.width) {
                source.width = 0;
                source.height = 0;
            }
            
            source = canvas;
            currentWidth = stepWidth;
            currentHeight = stepHeight;
        }
        
        // Final step to exact target size
        if (currentWidth !== targetWidth || currentHeight !== targetHeight) {
            const { canvas: finalCanvas, ctx: finalCtx } = _createCanvas(targetWidth, targetHeight);
            finalCtx.drawImage(source, 0, 0, targetWidth, targetHeight);
            
            // Clean up intermediate canvas
            if (source !== img && source.width) {
                source.width = 0;
                source.height = 0;
            }
            
            return finalCanvas;
        }
        
        return source;
    }

    // ==================== Output Generation ====================

    /**
     * Convert canvas to blob with optimal compression
     * @param {HTMLCanvasElement} canvas - Canvas to convert
     * @param {number} quality - Quality (0-1)
     * @returns {Promise<Blob>}
     */
    async function _canvasToBlob(canvas, quality) {
        const format = await _getOutputFormat();
        
        return new Promise((resolve, reject) => {
            canvas.toBlob(
                blob => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to convert canvas to blob'));
                    }
                },
                format,
                quality
            );
        });
    }

    /**
     * Optimize blob size by adjusting quality
     * @param {HTMLCanvasElement} canvas - Source canvas
     * @param {number} targetSize - Target size in bytes
     * @returns {Promise<Blob>}
     */
    async function _optimizeBlobSize(canvas, targetSize) {
        // Start with high quality
        let quality = CONFIG.QUALITY_HIGH;
        let blob = await _canvasToBlob(canvas, quality);
        
        // If already under target, return
        if (blob.size <= targetSize) {
            return blob;
        }
        
        // Binary search for optimal quality
        let minQuality = 0.3;
        let maxQuality = quality;
        
        for (let i = 0; i < 5; i++) {  // Max 5 iterations
            quality = (minQuality + maxQuality) / 2;
            blob = await _canvasToBlob(canvas, quality);
            
            if (blob.size > targetSize) {
                maxQuality = quality;
            } else if (blob.size < targetSize * 0.8) {
                minQuality = quality;
            } else {
                break;  // Close enough
            }
        }
        
        return blob;
    }

    // ==================== Main Processing Functions ====================

    /**
     * Generate quick preview (low quality, fast)
     * @param {File} file - Image file
     * @returns {Promise<{url: string, cleanup: Function}>}
     */
    async function generatePreview(file) {
        const img = await _loadImageFromFile(file);
        const { width, height } = _calculateDimensions(
            img.width, 
            img.height,
            CONFIG.PREVIEW_MAX_WIDTH,
            CONFIG.PREVIEW_MAX_HEIGHT
        );
        
        const canvas = _processDirect(img, width, height);
        const blob = await _canvasToBlob(canvas, CONFIG.QUALITY_PREVIEW);
        
        // Clean up
        canvas.width = 0;
        canvas.height = 0;
        _revokeTrackedObjectUrl(img.src);
        
        const url = _createTrackedObjectUrl(blob);
        
        return {
            url,
            width: img.width,
            height: img.height,
            cleanup: () => _revokeTrackedObjectUrl(url)
        };
    }

    /**
     * Process image for optimal storage and display
     * @param {File} file - Image file
     * @param {Object} options - Processing options
     * @param {Function} options.onProgress - Progress callback (0-100)
     * @param {Function} options.onPreview - Preview ready callback
     * @param {number} options.maxWidth - Max width override
     * @param {number} options.maxHeight - Max height override
     * @returns {Promise<{blob: Blob, width: number, height: number, originalSize: number, processedSize: number}>}
     */
    async function processImage(file, options = {}) {
        if (_state.isProcessing) {
            throw new Error('Already processing an image');
        }
        
        _state.isProcessing = true;
        const startTime = performance.now();
        
        const {
            onProgress = () => {},
            onPreview = () => {},
            maxWidth = CONFIG.MAX_WIDTH,
            maxHeight = CONFIG.MAX_HEIGHT
        } = options;
        
        try {
            // Validate file size
            if (file.size > CONFIG.MAX_FILE_SIZE) {
                throw new Error(`File too large. Maximum size is ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`);
            }
            
            onProgress(5);
            
            // Generate quick preview first
            const preview = await generatePreview(file);
            onPreview(preview.url);
            onProgress(15);
            
            // Load full image
            const img = await _loadImageFromFile(file, onProgress);
            const originalWidth = img.width;
            const originalHeight = img.height;
            const totalPixels = originalWidth * originalHeight;
            
            onProgress(35);
            
            // Reject images that exceed pixel limit
            if (totalPixels > CONFIG.MAX_PIXELS) {
                const megapixels = (totalPixels / 1000000).toFixed(1);
                const maxMP = (CONFIG.MAX_PIXELS / 1000000).toFixed(0);
                _revokeTrackedObjectUrl(img.src);
                preview.cleanup();
                throw new Error(`Image resolution too high (${megapixels}MP). Maximum supported: ${maxMP}MP`);
            }
            
            // Calculate target dimensions
            const { width: targetWidth, height: targetHeight } = _calculateDimensions(
                img.width,
                img.height,
                maxWidth,
                maxHeight
            );
            
            let canvas;
            
            // Choose processing method based on image size
            if (file.size > CONFIG.HUGE_IMAGE_THRESHOLD) {
                // Very large file - use chunked processing
                console.log(`Using chunked processing for large image (${(totalPixels / 1000000).toFixed(1)}MP)`);
                canvas = await _processInChunks(img, targetWidth, targetHeight, onProgress);
            } else if (file.size > CONFIG.LARGE_IMAGE_THRESHOLD || 
                       img.width > targetWidth * 3 || 
                       img.height > targetHeight * 3) {
                // Large image - use multi-step downscaling
                console.log('Using multi-step processing for large image');
                canvas = _processWithSteps(img, targetWidth, targetHeight);
                onProgress(70);
            } else {
                // Normal image - direct processing
                canvas = _processDirect(img, targetWidth, targetHeight);
                onProgress(70);
            }
            
            // Clean up source image URL
            _revokeTrackedObjectUrl(img.src);
            
            onProgress(75);
            
            // Generate optimized output blob
            const blob = await _optimizeBlobSize(canvas, CONFIG.TARGET_OUTPUT_SIZE);
            
            onProgress(90);
            
            // Clean up canvas
            canvas.width = 0;
            canvas.height = 0;
            
            // Clean up preview
            preview.cleanup();
            
            // Hint garbage collection
            await _hintGC();
            
            onProgress(100);
            
            const endTime = performance.now();
            console.log(`Image processed in ${Math.round(endTime - startTime)}ms`);
            console.log(`Original: ${file.size} bytes, Processed: ${blob.size} bytes`);
            console.log(`Dimensions: ${originalWidth}x${originalHeight} → ${targetWidth}x${targetHeight}`);
            
            return {
                blob,
                width: targetWidth,
                height: targetHeight,
                originalWidth,
                originalHeight,
                originalSize: file.size,
                processedSize: blob.size,
                compressionRatio: (1 - blob.size / file.size) * 100
            };
            
        } finally {
            _state.isProcessing = false;
        }
    }

    /**
     * Process image and return as Object URL
     * @param {File} file - Image file
     * @param {Object} options - Processing options
     * @returns {Promise<{url: string, ...metadata}>}
     */
    async function processImageToUrl(file, options = {}) {
        const result = await processImage(file, options);
        const url = _createTrackedObjectUrl(result.blob);
        
        return {
            ...result,
            url,
            cleanup: () => _revokeTrackedObjectUrl(url)
        };
    }

    // ==================== Cleanup ====================

    /**
     * Clean up all resources
     */
    function cleanup() {
        _cleanupAllObjectUrls();
        _state.isProcessing = false;
    }

    // ==================== Public API ====================
    return {
        // Main functions
        processImage,
        processImageToUrl,
        generatePreview,
        
        // Cleanup
        cleanup,
        revokeUrl: _revokeTrackedObjectUrl,
        
        // Utilities
        calculateDimensions: _calculateDimensions,
        
        // Configuration
        getConfig: () => ({ ...CONFIG }),
        setMaxDimensions: (width, height) => {
            if (width > 0) CONFIG.MAX_WIDTH = width;
            if (height > 0) CONFIG.MAX_HEIGHT = height;
        },
        
        // State
        isProcessing: () => _state.isProcessing,
        getActiveUrlCount: () => _state.activeObjectUrls.size
    };
})();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.ImageProcessor = ImageProcessor;
}

