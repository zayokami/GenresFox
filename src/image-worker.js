/**
 * Image Processing Web Worker
 * Handles heavy image processing off the main thread
 * 
 * WASM Support:
 * - WASM can be enabled via CONFIG.WASM_URL and CONFIG.WASM_ENABLED
 * - Automatically enabled for large images (>20MP) when WASM_URL is set
 * - Requires WASM module exporting: resize_rgba(srcPtr, srcW, srcH, dstPtr, dstW, dstH)
 * - Falls back to Canvas API if WASM is unavailable
 * 
 * To use WASM:
 * 1. Build or obtain a WASM module with resize_rgba function
 * 2. Place it in the extension's web_accessible_resources
 * 3. Call ImageProcessor.setWasmUrl('path/to/resize.wasm') from main thread
 */

// Worker context
const ctx = self;

// Configuration (synced from main thread)
let CONFIG = {
    MAX_WIDTH: 3840,
    MAX_HEIGHT: 2160,
    QUALITY_HIGH: 0.95,      // Increased for better quality
    QUALITY_MEDIUM: 0.88,    // Balanced quality/size
    QUALITY_LOW: 0.75,       // Minimum acceptable quality
    CHUNK_SIZE: 2048,
    OUTPUT_FORMAT: 'image/webp',
    FALLBACK_FORMAT: 'image/jpeg',
    TARGET_OUTPUT_SIZE: 5 * 1024 * 1024,
    WASM_URL: null,
    WASM_ENABLED: false,
    WASM_AUTO_ENABLE_THRESHOLD: 20 * 1000 * 1000, // 20MP - auto-enable threshold
    MAX_PIXELS: 80 * 1000 * 1000 // Keep for symmetry; enforced in main thread
};

// WASM state
const WASM = {
    instance: null,
    exports: null,
    ready: false,
    allocPtr: 0,
    heapCapacity: 0,
    hasNearest: false,      // Whether nearest neighbor resize is available
    hasLanczos: false,      // Whether Lanczos resampling is available
    hasGammaCorrect: false  // Whether gamma-correct resampling is available
};

/**
 * Calculate optimal dimensions while maintaining aspect ratio
 */
function calculateDimensions(width, height, maxWidth, maxHeight, screenWidth, screenHeight) {
    const targetWidth = Math.min(screenWidth || maxWidth, maxWidth);
    const targetHeight = Math.min(screenHeight || maxHeight, maxHeight);
    
    if (width <= targetWidth && height <= targetHeight) {
        return { width, height };
    }
    
    const scaleX = targetWidth / width;
    const scaleY = targetHeight / height;
    const scale = Math.min(scaleX, scaleY);
    
    return {
        width: Math.round(width * scale),
        height: Math.round(height * scale)
    };
}

/**
 * Process image using OffscreenCanvas (Worker-compatible)
 * @param {ImageData} imageData - Source image data
 * @param {number} targetWidth - Target width
 * @param {number} targetHeight - Target height
 * @param {Function} onProgress - Progress callback
 * @param {Object} options - Processing options (optional)
 * @param {boolean} options.gammaCorrect - Use gamma-correct resampling
 * @param {string} options.algorithm - Resize algorithm
 */
async function processImageData(imageData, targetWidth, targetHeight, onProgress, options = {}) {
    const { width: srcWidth, height: srcHeight } = imageData;
    const totalPixels = srcWidth * srcHeight;
    
    // Prefer WASM path for large images if enabled and ready
    // WASM is especially beneficial for images > 20MP where chunked Canvas processing is slow
    if (CONFIG.WASM_ENABLED) {
        // If WASM is still loading, wait a bit (max 500ms) for it to become ready
        if (!WASM.ready && CONFIG.WASM_URL) {
            const startWait = Date.now();
            while (!WASM.ready && (Date.now() - startWait) < 500) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
        
        // Try WASM if ready
        if (WASM.ready) {
            // Extract processing options
            const wasmOptions = {
                gammaCorrect: options.gammaCorrect || false,
                algorithm: options.algorithm || 'auto'
            };
            
            console.log(`[Worker] Using WASM for image resize: ${srcWidth}x${srcHeight} -> ${targetWidth}x${targetHeight} (${(totalPixels / 1000000).toFixed(1)}MP, gammaCorrect: ${wasmOptions.gammaCorrect}, algorithm: ${wasmOptions.algorithm})`);
            const wasmCanvas = await processImageDataWithWasm(imageData, targetWidth, targetHeight, onProgress, wasmOptions);
            if (wasmCanvas) {
                console.log(`[Worker] WASM resize completed successfully`);
                return wasmCanvas;
            } else {
                console.warn(`[Worker] WASM resize returned null, falling back to Canvas`);
            }
        } else if (CONFIG.WASM_ENABLED && CONFIG.WASM_URL) {
            console.log(`[Worker] WASM enabled but not ready yet, using Canvas fallback`);
        }
    }

    // Fallback to Canvas API processing
    // Create OffscreenCanvas for processing
    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d', {
        alpha: false,
        desynchronized: true
    });
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Create ImageBitmap from ImageData for efficient drawing
    const bitmap = await createImageBitmap(imageData);
    
    // Check if we need chunked processing
    // Note: For very large images (>20MP), WASM would be faster, but Canvas chunked processing works as fallback
    const useChunked = totalPixels > 20 * 1000 * 1000; // 20MP threshold for chunked
    
    if (useChunked) {
        // Chunked processing for large images
        const chunkSize = CONFIG.CHUNK_SIZE;
        const scaleX = targetWidth / srcWidth;
        const scaleY = targetHeight / srcHeight;
        const chunksX = Math.ceil(srcWidth / chunkSize);
        const chunksY = Math.ceil(srcHeight / chunkSize);
        const totalChunks = chunksX * chunksY;
        let processedChunks = 0;
        
        for (let cy = 0; cy < chunksY; cy++) {
            for (let cx = 0; cx < chunksX; cx++) {
                const sx = cx * chunkSize;
                const sy = cy * chunkSize;
                const sw = Math.min(chunkSize, srcWidth - sx);
                const sh = Math.min(chunkSize, srcHeight - sy);
                
                const dx = Math.round(sx * scaleX);
                const dy = Math.round(sy * scaleY);
                const dw = Math.max(1, Math.round(sw * scaleX));
                const dh = Math.max(1, Math.round(sh * scaleY));
                
                if (dw >= 1 && dh >= 1) {
                    ctx.drawImage(bitmap, sx, sy, sw, sh, dx, dy, dw, dh);
                }
                
                processedChunks++;
                if (onProgress && processedChunks % 4 === 0) {
                    onProgress(35 + Math.round((processedChunks / totalChunks) * 40));
                }
            }
        }
    } else {
        // Direct processing for smaller images
        ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    }
    
    bitmap.close();
    
    return canvas;
}

/**
 * Calculate image complexity (simplified version for Worker)
 * Returns complexity score 0-1
 */
function calculateImageComplexity(imageData) {
    try {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Sample a subset for performance
        const sampleWidth = Math.min(width, 128);
        const sampleHeight = Math.min(height, 128);
        const stepX = Math.max(1, Math.floor(width / sampleWidth));
        const stepY = Math.max(1, Math.floor(height / sampleHeight));
        
        let sum = 0;
        let sumSq = 0;
        let count = 0;
        
        for (let y = 0; y < height; y += stepY) {
            for (let x = 0; x < width; x += stepX) {
                const idx = (y * width + x) * 4;
                if (idx + 2 < data.length) {
                    const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                    sum += gray;
                    sumSq += gray * gray;
                    count++;
                }
            }
        }
        
        if (count === 0) return 0.5;
        
        const mean = sum / count;
        const variance = (sumSq / count) - (mean * mean);
        const stdDev = Math.sqrt(Math.max(0, variance));
        
        // Normalize to 0-1 (typical stdDev: 20-80)
        return Math.min(1.0, stdDev / 80.0);
    } catch (e) {
        return 0.5; // Fallback
    }
}

/**
 * Optimize blob size with intelligent quality selection and progressive compression
 */
async function optimizeBlobSize(canvas, targetSize, format) {
    // Get image data for complexity analysis
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 256), Math.min(canvas.height, 256));
    const complexity = calculateImageComplexity(imageData);
    
    // Adjust quality based on complexity
    const baseQuality = CONFIG.QUALITY_HIGH + (complexity - 0.5) * 0.1;
    const adjustedQuality = Math.max(0.7, Math.min(0.98, baseQuality));
    
    let quality = adjustedQuality;
    let blob = await canvas.convertToBlob({ type: format, quality });
    
    if (blob.size <= targetSize) {
        return blob;
    }
    
    // Progressive compression steps
    const qualitySteps = [
        adjustedQuality,
        adjustedQuality * 0.9,
        adjustedQuality * 0.8,
        CONFIG.QUALITY_MEDIUM,
        0.75,
        0.7
    ];
    
    let minQuality = 0.5;
    let maxQuality = adjustedQuality;
    let bestBlob = blob;
    let bestQuality = quality;
    const tolerance = 0.05; // 5% tolerance
    
    // Try progressive steps
    for (const stepQuality of qualitySteps) {
        if (stepQuality < minQuality || stepQuality > maxQuality) continue;
        
        const testBlob = await canvas.convertToBlob({ type: format, quality: stepQuality });
        
        if (testBlob.size <= targetSize * (1 + tolerance)) {
            if (stepQuality > bestQuality || bestBlob.size > targetSize) {
                bestBlob = testBlob;
                bestQuality = stepQuality;
                maxQuality = stepQuality;
            }
        } else {
            minQuality = stepQuality;
        }
    }
    
    // Fine-tune with binary search if needed
    if (bestBlob.size > targetSize * (1 + tolerance)) {
        for (let i = 0; i < 5; i++) {
            quality = (minQuality + maxQuality) / 2;
            blob = await canvas.convertToBlob({ type: format, quality });
            
            if (blob.size > targetSize * (1 + tolerance)) {
                maxQuality = quality;
            } else if (blob.size < targetSize * (1 - tolerance)) {
                minQuality = quality;
                if (quality > bestQuality) {
                    bestBlob = blob;
                    bestQuality = quality;
                }
            } else {
                return blob;
            }
        }
    }
    
    return bestBlob;
}

/**
 * Load WASM module (if provided)
 * @param {string} url - URL to WASM file
 * @returns {Promise<void>}
 */
async function loadWasm(url) {
    if (WASM.ready) {
        return; // Already loaded
    }
    
    try {
        if (!url) {
            throw new Error('WASM URL not provided');
        }

        let instance = null;
        let wasmBinary = null;

        // Try instantiateStreaming first (more efficient, single network fetch)
        try {
            const resp = await fetch(url);
            if (!resp.ok) {
                throw new Error(`Failed to fetch WASM: ${resp.status} ${resp.statusText}`);
            }
            const streamingModule = await WebAssembly.instantiateStreaming(resp);
            instance = streamingModule.instance;
        } catch (streamErr) {
            // Fallback for browsers that don't support streaming
            const resp = await fetch(url);
            if (!resp.ok) {
                throw new Error(`Failed to fetch WASM (fallback): ${resp.status} ${resp.statusText}`);
            }
            wasmBinary = await resp.arrayBuffer();
            if (!wasmBinary || wasmBinary.byteLength === 0) {
                throw new Error('WASM file is empty');
            }
            const module = await WebAssembly.instantiate(wasmBinary, {});
            instance = module.instance;
        }
        
        if (!instance?.exports) {
            throw new Error('WASM instance missing exports');
        }
        
        // Verify required exports exist
        if (typeof instance.exports.resize_rgba !== 'function') {
            throw new Error('WASM missing required export: resize_rgba');
        }
        
        // Optional exports (for better performance/quality)
        if (typeof instance.exports.resize_rgba_nearest === 'function') {
            WASM.hasNearest = true;
        }
        if (typeof instance.exports.resize_rgba_lanczos === 'function') {
            WASM.hasLanczos = true;
        }
        if (typeof instance.exports.resize_rgba_gamma_bilinear === 'function') {
            WASM.hasGammaCorrect = true;
        }
        
        if (!instance.exports.memory) {
            throw new Error('WASM missing required export: memory');
        }
        
        WASM.instance = instance;
        WASM.exports = instance.exports;
        WASM.ready = true;
        WASM.allocPtr = 0;
        WASM.heapCapacity = instance.exports.memory.buffer.byteLength || 0;
        
        // wasmBinary may be null if instantiateStreaming succeeded; guard size logging
        const sizeKB = wasmBinary ? (wasmBinary.byteLength / 1024).toFixed(1) : 'unknown';
        console.log(`[Worker] WASM loaded successfully (${sizeKB}KB)`);
        console.log(
            `[Worker] WASM exports: ` +
            `resize_rgba=${!!WASM.exports.resize_rgba}, ` +
            `memory=${!!WASM.exports.memory}, ` +
            `resize_rgba_nearest=${!!WASM.exports.resize_rgba_nearest}, ` +
            `resize_rgba_lanczos=${!!WASM.exports.resize_rgba_lanczos}, ` +
            `resize_rgba_gamma_bilinear=${!!WASM.exports.resize_rgba_gamma_bilinear}, ` +
            `get_last_error=${!!WASM.exports.get_last_error}`
        );
    } catch (err) {
        console.warn('[Worker] WASM load failed, will use Canvas fallback:', err.message);
        WASM.instance = null;
        WASM.exports = null;
        WASM.ready = false;
        // Don't throw - allow fallback to Canvas processing
    }
}

/**
 * Simple bump allocator on WASM memory
 */
function wasmAlloc(size) {
    const memory = WASM.exports?.memory;
    if (!memory) return null;
    const pageSize = 64 * 1024;
    const alignedSize = (size + 7) & ~7;
    let needed = WASM.allocPtr + alignedSize;
    if (needed > WASM.heapCapacity) {
        const growPages = Math.ceil((needed - WASM.heapCapacity) / pageSize);
        try {
            memory.grow(growPages);
            WASM.heapCapacity = memory.buffer.byteLength;
        } catch (e) {
            return null;
        }
    }
    const ptr = WASM.allocPtr;
    WASM.allocPtr += alignedSize;
    return ptr;
}

/**
 * Process image data via WASM (expects export resize_rgba)
 * resize_rgba(srcPtr, srcW, srcH, dstPtr, dstW, dstH) -> error_code
 * Returns 0 on success, non-zero on error
 * 
 * @param {ImageData} imageData - Source image data
 * @param {number} targetWidth - Target width
 * @param {number} targetHeight - Target height
 * @param {Function} onProgress - Progress callback
 * @param {Object} options - Processing options
 * @param {boolean} options.gammaCorrect - Use gamma-correct resampling (default: false)
 * @param {string} options.algorithm - Resize algorithm: 'auto', 'nearest', 'bilinear', 'lanczos' (default: 'auto')
 */
async function processImageDataWithWasm(imageData, targetWidth, targetHeight, onProgress, options = {}) {
    const exports = WASM.exports;
    if (!exports || !exports.memory) {
        return null;
    }

    // Determine which resize function to use
    const { gammaCorrect = false, algorithm = 'auto' } = options;
    let resizeFunc = null;
    
    if (gammaCorrect && WASM.hasGammaCorrect && typeof exports.resize_rgba_gamma_bilinear === 'function') {
        resizeFunc = exports.resize_rgba_gamma_bilinear;
    } else if (algorithm === 'nearest' && WASM.hasNearest && typeof exports.resize_rgba_nearest === 'function') {
        resizeFunc = exports.resize_rgba_nearest;
    } else if (algorithm === 'lanczos' && WASM.hasLanczos && typeof exports.resize_rgba_lanczos === 'function') {
        resizeFunc = exports.resize_rgba_lanczos;
    } else if (typeof exports.resize_rgba === 'function') {
        resizeFunc = exports.resize_rgba;
    } else {
        console.warn('[Worker] No suitable WASM resize function available');
        return null;
    }

    try {
        WASM.allocPtr = 0; // reset bump pointer per call
        const srcSize = imageData.width * imageData.height * 4;
        const dstSize = targetWidth * targetHeight * 4;

        // Use WASM memory allocation if available, otherwise use JavaScript allocation
        let srcPtr, dstPtr;
        if (typeof exports.alloc_memory === 'function') {
            srcPtr = exports.alloc_memory(srcSize);
            dstPtr = exports.alloc_memory(dstSize);
        } else {
            // Fallback: allocate in WASM memory using bump allocator
            srcPtr = wasmAlloc(srcSize);
            dstPtr = wasmAlloc(dstSize);
        }
        
        if (srcPtr === null || dstPtr === null || srcPtr === 0 || dstPtr === 0) {
            console.warn('[Worker] WASM memory allocation failed');
            return null;
        }

        const memoryU8 = new Uint8Array(exports.memory.buffer);
        memoryU8.set(imageData.data, srcPtr);

        // Call resize function and check return code
        const errorCode = resizeFunc(
            srcPtr, 
            imageData.width, 
            imageData.height, 
            dstPtr, 
            targetWidth, 
            targetHeight
        );
        
        if (errorCode !== 0) {
            let errorMsg = '';
            try {
                if (typeof exports.get_last_error === 'function') {
                    const errPtr = exports.get_last_error();
                    if (errPtr) {
                        const mem = new Uint8Array(exports.memory.buffer);
                        let chars = [];
                        // Read up to 256 bytes to avoid runaway in case of missing terminator
                        for (let i = errPtr; i < mem.length && chars.length < 256; i++) {
                            const code = mem[i];
                            if (code === 0) break; // null-terminated
                            chars.push(code);
                        }
                        errorMsg = String.fromCharCode.apply(null, chars);
                    }
                }
            } catch (_) {
                // Ignore get_last_error failures; we'll fall back to error code mapping
            }
            
            // Fallback error message mapping if get_last_error fails
            if (!errorMsg) {
                const errorCodeMap = {
                    1: 'NULL pointer',
                    2: 'Invalid size or dimensions',
                    3: 'Overflow in size calculation',
                    4: 'Memory error',
                    5: 'Pointer alignment error',
                    6: 'Memory regions overlap'
                };
                errorMsg = errorCodeMap[errorCode] || `Unknown error (code: ${errorCode})`;
            }
            
            console.warn(`[Worker] WASM resize failed with error code: ${errorCode}, message: ${errorMsg}`);
            
            // Clean up allocated memory
            if (typeof exports.dealloc_memory === 'function') {
                exports.dealloc_memory(srcPtr, srcSize);
                exports.dealloc_memory(dstPtr, dstSize);
            }
            return null;
        }

        if (onProgress) onProgress(70);

        const dstView = memoryU8.subarray(dstPtr, dstPtr + dstSize);
        const outImageData = new ImageData(
            new Uint8ClampedArray(dstView.slice().buffer),
            targetWidth,
            targetHeight
        );

        // Clean up allocated memory
        if (typeof exports.dealloc_memory === 'function') {
            exports.dealloc_memory(srcPtr, srcSize);
            exports.dealloc_memory(dstPtr, dstSize);
        }

        const canvas = new OffscreenCanvas(targetWidth, targetHeight);
        const ctx = canvas.getContext('2d');
        ctx.putImageData(outImageData, 0, 0);
        return canvas;
    } catch (e) {
        console.warn('[Worker] WASM processing failed, fallback to canvas:', e);
        return null;
    }
}

/**
 * Main message handler
 */
ctx.onmessage = async function(e) {
    const { type, data, id } = e.data;
    
    try {
        switch (type) {
            case 'init':
                // Initialize with config from main thread
                if (data.config) {
                    CONFIG = { ...CONFIG, ...data.config };
                }
                // Load WASM asynchronously if enabled (don't block ready signal)
                if (CONFIG.WASM_ENABLED && CONFIG.WASM_URL) {
                    loadWasm(CONFIG.WASM_URL)
                        .then(() => {
                            // Notify main thread that WASM loaded successfully
                            ctx.postMessage({ type: 'wasmLoaded', id });
                        })
                        .catch(err => {
                            console.warn('[Worker] WASM initialization failed, will use Canvas fallback:', err);
                            // Notify main thread that WASM load failed
                            ctx.postMessage({ type: 'wasmLoadFailed', id });
                        });
                }
                ctx.postMessage({ type: 'ready', id });
                break;
                
            case 'process':
                // Process image
                const { 
                    imageData, 
                    imageBitmap,
                    maxWidth, 
                    maxHeight, 
                    screenWidth, 
                    screenHeight,
                    format,
                    alreadyScaled,
                    originalWidth,
                    originalHeight
                } = data;
                
                const startTime = performance.now();
                
                let targetWidth = maxWidth || CONFIG.MAX_WIDTH;
                let targetHeight = maxHeight || CONFIG.MAX_HEIGHT;
                let canvas;

                if (alreadyScaled) {
                    // Already scaled: prefer ImageBitmap path if provided
                    const source = imageBitmap || imageData;
                    targetWidth = source.width;
                    targetHeight = source.height;
                    canvas = new OffscreenCanvas(targetWidth, targetHeight);
                    const outCtx = canvas.getContext('2d', { alpha: false, desynchronized: true });
                    if (imageBitmap) {
                        outCtx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
                        imageBitmap.close();
                    } else {
                        outCtx.putImageData(imageData, 0, 0);
                    }
                    // Progress update for scaled path
                    ctx.postMessage({ type: 'progress', progress: 60, id });
                } else {
                    // Calculate target dimensions
                    const dims = calculateDimensions(
                        (imageBitmap && imageBitmap.width) || imageData.width,
                        (imageBitmap && imageBitmap.height) || imageData.height,
                        maxWidth || CONFIG.MAX_WIDTH,
                        maxHeight || CONFIG.MAX_HEIGHT,
                        screenWidth,
                        screenHeight
                    );
                    targetWidth = dims.width;
                    targetHeight = dims.height;
                    
                    // Process image
                    const src = imageBitmap || imageData;
                    if (imageBitmap) {
                        canvas = new OffscreenCanvas(targetWidth, targetHeight);
                        const ctx2d = canvas.getContext('2d', { alpha: false, desynchronized: true });
                        ctx2d.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
                        imageBitmap.close();
                    } else {
                        // Extract processing options from data
                        const processOptions = {
                            gammaCorrect: data.gammaCorrect || false,
                            algorithm: data.algorithm || 'auto'
                        };
                        
                        canvas = await processImageData(
                            imageData,
                            targetWidth,
                            targetHeight,
                            (progress) => {
                                // Reduce progress chatter: only key stages
                                if (progress === 35 || progress === 70 || progress === 90) {
                                    ctx.postMessage({ type: 'progress', progress, id });
                                }
                            },
                            processOptions
                        );
                    }
                }
                
                ctx.postMessage({ type: 'progress', progress: 75, id });
                
                // Generate optimized blob
                const outputFormat = format || CONFIG.OUTPUT_FORMAT;
                const blob = await optimizeBlobSize(canvas, CONFIG.TARGET_OUTPUT_SIZE, outputFormat);
                
                ctx.postMessage({ type: 'progress', progress: 95, id });
                
                const endTime = performance.now();
                
                // Send result back
                ctx.postMessage({
                    type: 'complete',
                    id,
                    result: {
                        blob,
                        width: targetWidth,
                        height: targetHeight,
                        originalWidth: originalWidth || imageData.width,
                        originalHeight: originalHeight || imageData.height,
                        processedSize: blob.size,
                        processingTime: Math.round(endTime - startTime)
                    }
                });
                break;
                
            case 'generatePreview':
                // Generate quick preview with aggressive downsampling
                const { imageData: previewData, maxSize } = data;
                const previewMaxDim = maxSize || 400; // Very small for quick preview
                
                const previewDims = calculateDimensions(
                    previewData.width,
                    previewData.height,
                    previewMaxDim,
                    previewMaxDim,
                    previewMaxDim,
                    previewMaxDim
                );
                
                const previewCanvas = new OffscreenCanvas(previewDims.width, previewDims.height);
                const previewCtx = previewCanvas.getContext('2d');
                
                const previewBitmap = await createImageBitmap(previewData);
                previewCtx.drawImage(previewBitmap, 0, 0, previewDims.width, previewDims.height);
                previewBitmap.close();
                
                // Use lower quality for preview
                const previewBlob = await previewCanvas.convertToBlob({ 
                    type: 'image/jpeg', 
                    quality: 0.5 
                });
                
                ctx.postMessage({
                    type: 'previewComplete',
                    id,
                    result: {
                        blob: previewBlob,
                        width: previewDims.width,
                        height: previewDims.height
                    }
                });
                break;
                
            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    } catch (error) {
        ctx.postMessage({
            type: 'error',
            id,
            error: error.message
        });
    }
};

// Signal that worker is loaded
ctx.postMessage({ type: 'loaded' });

/** 
 * Violence is the last refuge of the incompetent. 
 * — From Isaac Asimov's novel, "Foundation".
*/