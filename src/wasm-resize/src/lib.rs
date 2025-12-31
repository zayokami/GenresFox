//! WASM module for high-performance image resizing
//! Exports resize_rgba function for RGBA image data with error handling and performance optimizations

// Compile-time assertion: This crate only supports wasm32 target
// This ensures the code is only compiled for WebAssembly, preventing accidental
// compilation for other targets where the code may not work correctly.
#[cfg(not(target_arch = "wasm32"))]
compile_error!("This crate only supports wasm32 target");

use std::alloc::{alloc, dealloc, Layout};
use std::cell::{Cell, RefCell};

// Gamma-correct SIMD module
#[cfg(target_arch = "wasm32")]
mod gamma_simd;

// SIMD optimization helpers for regular resampling
#[cfg(target_arch = "wasm32")]
mod simd_helpers;

#[cfg(target_arch = "wasm32")]
use simd_helpers::{copy_4_pixels_simd, bilinear_interp_4_pixels};

// Export gamma-correct resize function for JavaScript
#[cfg(target_arch = "wasm32")]
pub use gamma_simd::resize_rgba_gamma_bilinear;

// Error codes returned by resize functions
// 0 = success, non-zero = error
pub const RESIZE_OK: i32 = 0;
pub const RESIZE_ERR_NULL_PTR: i32 = 1;
pub const RESIZE_ERR_INVALID_SIZE: i32 = 2;
pub const RESIZE_ERR_OVERFLOW: i32 = 3;
pub const RESIZE_ERR_MEMORY: i32 = 4;
pub const RESIZE_ERR_ALIGNMENT: i32 = 5;
pub const RESIZE_ERR_OVERLAP: i32 = 6;

// Thread-local storage for last error code (wasm32 is effectively single-threaded,
// but this keeps the API future-proof and explicit)
thread_local! {
    static LAST_ERROR_CODE: Cell<i32> = Cell::new(RESIZE_OK);
}

// Thread-local reusable buffers for LUT computation
// These buffers are reused across resize calls to avoid repeated heap allocations
thread_local! {
    static X_INDICES_NEAREST: RefCell<Vec<usize>> = RefCell::new(Vec::new());
    static X0_INDICES_BILINEAR: RefCell<Vec<usize>> = RefCell::new(Vec::new());
    static X1_INDICES_BILINEAR: RefCell<Vec<usize>> = RefCell::new(Vec::new());
    static FX_VALUES_BILINEAR: RefCell<Vec<f32>> = RefCell::new(Vec::new());
    // Lanczos separable convolution buffers
    static LANCZOS_X_WEIGHTS: RefCell<Vec<Vec<f32>>> = RefCell::new(Vec::new()); // Precomputed X-axis weights
    static LANCZOS_Y_WEIGHTS: RefCell<Vec<Vec<f32>>> = RefCell::new(Vec::new()); // Precomputed Y-axis weights
    static LANCZOS_X_INDICES: RefCell<Vec<Vec<i32>>> = RefCell::new(Vec::new()); // Source pixel indices for X
    static LANCZOS_Y_INDICES: RefCell<Vec<Vec<i32>>> = RefCell::new(Vec::new()); // Source pixel indices for Y
    static LANCZOS_TEMP_BUFFER: RefCell<Vec<f32>> = RefCell::new(Vec::new()); // Intermediate buffer for separable convolution
}

#[inline(always)]
fn set_last_error(code: i32) {
    LAST_ERROR_CODE.with(|c| c.set(code));
}

/// Allocate memory (exported for JavaScript to allocate buffers)
/// Returns null pointer on failure
/// 
/// Memory is always zero-initialized for safety. This prevents reading uninitialized
/// memory, which could lead to undefined behavior or security issues. The performance
/// cost of zero-initialization is negligible compared to the actual image processing
/// operations, and the safety benefits outweigh the minimal performance cost.
#[no_mangle]
pub extern "C" fn alloc_memory(size: usize) -> *mut u8 {
    if size == 0 {
        set_last_error(RESIZE_ERR_INVALID_SIZE);
        return std::ptr::null_mut();
    }
    
    unsafe {
        let layout = match Layout::from_size_align(size, 1) {
            Ok(l) => l,
            Err(_) => {
                set_last_error(RESIZE_ERR_MEMORY);
                return std::ptr::null_mut();
            }
        };
        
        let ptr = alloc(layout);
        if ptr.is_null() {
            set_last_error(RESIZE_ERR_MEMORY);
            return std::ptr::null_mut();
        }
        
        // Zero-initialize memory for safety
        // This prevents reading uninitialized memory, which is critical for security
        // and correctness. The performance cost is minimal compared to image processing.
        std::ptr::write_bytes(ptr, 0, size);
        ptr
    }
}

/// Deallocate memory
/// Safe to call with null pointer
#[no_mangle]
pub unsafe extern "C" fn dealloc_memory(ptr: *mut u8, size: usize) {
    if ptr.is_null() || size == 0 {
        return;
    }
    
    let layout = match Layout::from_size_align(size, 1) {
        Ok(l) => l,
        Err(_) => return,
    };
    
    dealloc(ptr, layout);
}

/// Get last error message (for debugging)
/// Returns a pointer to a static string, or null
#[no_mangle]
pub extern "C" fn get_last_error() -> *const u8 {
    // Static null-terminated error messages for WASM consumers
    static OK_MSG: &[u8] = b"OK\0";
    static ERR_NULL_PTR_MSG: &[u8] = b"NULL pointer\0";
    static ERR_INVALID_SIZE_MSG: &[u8] = b"Invalid size or dimensions\0";
    static ERR_OVERFLOW_MSG: &[u8] = b"Overflow in size calculation\0";
    static ERR_MEMORY_MSG: &[u8] = b"Memory error\0";
    static ERR_ALIGNMENT_MSG: &[u8] = b"Pointer alignment error\0";
    static ERR_OVERLAP_MSG: &[u8] = b"Memory regions overlap\0";
    static ERR_UNKNOWN_MSG: &[u8] = b"Unknown error\0";

    let code = LAST_ERROR_CODE.with(|c| c.get());
    match code {
        RESIZE_OK => OK_MSG.as_ptr(),
        RESIZE_ERR_NULL_PTR => ERR_NULL_PTR_MSG.as_ptr(),
        RESIZE_ERR_INVALID_SIZE => ERR_INVALID_SIZE_MSG.as_ptr(),
        RESIZE_ERR_OVERFLOW => ERR_OVERFLOW_MSG.as_ptr(),
        RESIZE_ERR_MEMORY => ERR_MEMORY_MSG.as_ptr(),
        RESIZE_ERR_ALIGNMENT => ERR_ALIGNMENT_MSG.as_ptr(),
        RESIZE_ERR_OVERLAP => ERR_OVERLAP_MSG.as_ptr(),
        _ => ERR_UNKNOWN_MSG.as_ptr(),
    }
}

/// Validate resize parameters and compute safe buffer sizes
#[inline(always)]
fn validate_params(
    src_ptr: *const u8,
    src_w: u32,
    src_h: u32,
    dst_ptr: *mut u8,
    dst_w: u32,
    dst_h: u32,
) -> Result<(usize, usize), i32> {
    // Check null pointers
    if src_ptr.is_null() || dst_ptr.is_null() {
        set_last_error(RESIZE_ERR_NULL_PTR);
        return Err(RESIZE_ERR_NULL_PTR);
    }
    
    // Check pointer alignment for RGBA data (4-byte alignment)
    // RGBA pixel data should be 4-byte aligned for optimal performance and correctness.
    // While WASM memory is byte-addressable, 4-byte alignment ensures:
    // - Better performance on some architectures
    // - Correctness when accessing multi-byte values
    // - Compatibility with SIMD operations (if added in future)
    if (src_ptr as usize) % 4 != 0 {
        set_last_error(RESIZE_ERR_ALIGNMENT);
        return Err(RESIZE_ERR_ALIGNMENT);
    }
    
    if (dst_ptr as usize) % 4 != 0 {
        set_last_error(RESIZE_ERR_ALIGNMENT);
        return Err(RESIZE_ERR_ALIGNMENT);
    }
    
    // Check dimensions
    if src_w == 0 || src_h == 0 || dst_w == 0 || dst_h == 0 {
        set_last_error(RESIZE_ERR_INVALID_SIZE);
        return Err(RESIZE_ERR_INVALID_SIZE);
    }
    
    // Check for overflow in size calculations
    let src_size_u64 = match (src_w as u64)
        .checked_mul(src_h as u64)
        .and_then(|x| x.checked_mul(4))
    {
        Some(s) => s,
        None => {
            set_last_error(RESIZE_ERR_OVERFLOW);
            return Err(RESIZE_ERR_OVERFLOW);
        }
    };
    
    let dst_size_u64 = match (dst_w as u64)
        .checked_mul(dst_h as u64)
        .and_then(|x| x.checked_mul(4))
    {
        Some(s) => s,
        None => {
            set_last_error(RESIZE_ERR_OVERFLOW);
            return Err(RESIZE_ERR_OVERFLOW);
        }
    };
    
    // Check reasonable limits (prevent excessive memory allocation)
    // MAX_DIMENSION: 65535 is the maximum value for u16, chosen to:
    // - Prevent excessive memory allocation (65535^2 * 4 bytes = ~17GB for a single image)
    // - Stay within WASM memory constraints (WASM linear memory is limited, typically 2-4GB)
    // - Provide a reasonable upper bound for practical image processing scenarios
    // - Avoid potential integer overflow issues in intermediate calculations
    const MAX_DIMENSION: u32 = 65535;
    
    // MAX_PIXELS: 268,435,456 pixels = 256 megapixels (256MP)
    // This limit ensures:
    // - Reasonable memory usage (256MP * 4 bytes = 1GB for RGBA)
    // - Prevents processing of unreasonably large images that would cause performance issues
    // - Aligns with common high-resolution camera formats (e.g., 16K at 16:9 ≈ 132MP)
    const MAX_PIXELS: u64 = 268_435_456;
    
    if src_w > MAX_DIMENSION
        || src_h > MAX_DIMENSION
        || dst_w > MAX_DIMENSION
        || dst_h > MAX_DIMENSION
    {
        set_last_error(RESIZE_ERR_INVALID_SIZE);
        return Err(RESIZE_ERR_INVALID_SIZE);
    }
    
    let src_pixels = (src_w as u64) * (src_h as u64);
    let dst_pixels = (dst_w as u64) * (dst_h as u64);
    
    if src_pixels > MAX_PIXELS || dst_pixels > MAX_PIXELS {
        set_last_error(RESIZE_ERR_INVALID_SIZE);
        return Err(RESIZE_ERR_INVALID_SIZE);
    }
    
    // Check for memory region overlap (prevent undefined behavior)
    // This is critical for safety: overlapping buffers can cause data corruption
    // and undefined behavior during resize operations.
    let src_start = src_ptr as usize;
    let src_end = src_start.saturating_add(src_size_u64 as usize);
    let dst_start = dst_ptr as usize;
    let dst_end = dst_start.saturating_add(dst_size_u64 as usize);
    
    // Check if memory regions overlap
    // Two regions overlap if: (src_start < dst_end) && (dst_start < src_end)
    if (src_start < dst_end) && (dst_start < src_end) {
        set_last_error(RESIZE_ERR_OVERLAP);
        return Err(RESIZE_ERR_OVERLAP);
    }
    
    // We've validated everything; now it's safe to downcast to usize on wasm32
    let src_size = src_size_u64 as usize;
    let dst_size = dst_size_u64 as usize;

    set_last_error(RESIZE_OK);
    Ok((src_size, dst_size))
}

/// Check if the resize operation uses integer scaling ratios
/// Returns (is_integer_x, is_integer_y) where true means the scale factor is an integer
/// 
/// Uses integer arithmetic for numerical stability, avoiding floating-point precision issues.
/// Integer scaling can potentially use fixed-point arithmetic for better performance,
/// though this optimization is not yet implemented.
/// 
/// This function is reserved for future fixed-point arithmetic optimization.
#[allow(dead_code)]
#[inline(always)]
fn is_integer_scaling(src_w: u32, src_h: u32, dst_w: u32, dst_h: u32) -> (bool, bool) {
    // Use integer arithmetic to avoid floating-point precision issues
    // For downscaling: check if src_w is an integer multiple of dst_w
    // For upscaling: check if dst_w is an integer multiple of src_w
    
    // Check X direction: integer scaling means either:
    // - Downscaling: src_w % dst_w == 0 (e.g., 2000 -> 1000, scale = 2.0)
    // - Upscaling: dst_w % src_w == 0 (e.g., 1000 -> 2000, scale = 2.0)
    let is_integer_x = if src_w >= dst_w {
        // Downscaling: check if src_w is divisible by dst_w
        src_w % dst_w == 0
    } else {
        // Upscaling: check if dst_w is divisible by src_w
        dst_w % src_w == 0
    };
    
    // Check Y direction: same logic
    let is_integer_y = if src_h >= dst_h {
        // Downscaling: check if src_h is divisible by dst_h
        src_h % dst_h == 0
    } else {
        // Upscaling: check if dst_h is divisible by src_h
        dst_h % src_h == 0
    };
    
    (is_integer_x, is_integer_y)
}

/// Lanczos kernel function (3-lobed, high-quality resampling)
/// L(x) = sinc(x) * sinc(x/3) for |x| < 3, 0 otherwise
#[inline(always)]
fn lanczos_kernel(x: f32, a: f32) -> f32 {
    if x.abs() >= a {
        return 0.0;
    }
    if x == 0.0 {
        return 1.0;
    }
    let pi_x = std::f32::consts::PI * x;
    let pi_x_a = std::f32::consts::PI * x / a;
    (pi_x.sin() / pi_x) * (pi_x_a.sin() / pi_x_a)
}

/// Determine the optimal resize algorithm based on scale factor and image dimensions
/// Returns: 0 = nearest neighbor, 1 = bilinear, 2 = lanczos
/// 
/// Uses integer arithmetic for numerical stability, avoiding floating-point precision issues.
/// The threshold is dynamically adjusted based on image size:
/// - For small images (< 1MP): Use Lanczos for best quality (threshold = 8.0)
/// - For medium images (1-10MP): Use bilinear for balanced quality/performance (threshold = 4.0)
/// - For large images (> 10MP): Prefer nearest neighbor for performance (threshold = 2.0)
#[inline(always)]
fn select_resize_algorithm(src_w: u32, src_h: u32, dst_w: u32, dst_h: u32) -> u32 {
    // Use integer arithmetic to avoid floating-point precision issues
    // For downscaling: scale_factor = src / dst > threshold
    // This is equivalent to: src > dst * threshold (using integer math)
    // For upscaling: scale_factor < 1.0, so it never exceeds threshold (>= 2.0)
    
    // Only check downscaling cases (src > dst)
    let is_downscaling_x = src_w > dst_w;
    let is_downscaling_y = src_h > dst_h;
    
    // If not downscaling in either direction, use Lanczos (best quality for upscaling)
    if !is_downscaling_x && !is_downscaling_y {
        return 2; // Lanczos for upscaling
    }
    
    // For very large downscaling (> 8x), always use nearest neighbor
    // Check: src_w > 8 * dst_w OR src_h > 8 * dst_h
    if (is_downscaling_x && src_w > dst_w.saturating_mul(8))
        || (is_downscaling_y && src_h > dst_h.saturating_mul(8))
    {
        return 0; // Nearest neighbor for very large downscaling
    }
    
    // Dynamic threshold based on image size
    let src_pixels = (src_w as u64) * (src_h as u64);
    let (bilinear_threshold, lanczos_threshold) = if src_pixels < 1_000_000 {
        // Small images: prefer quality, use Lanczos for moderate downscaling
        (8u32, 4u32) // Lanczos up to 4x, bilinear up to 8x
    } else if src_pixels < 10_000_000 {
        // Medium images: balanced approach
        (4u32, 2u32) // Lanczos up to 2x, bilinear up to 4x
    } else {
        // Large images: prefer performance, use bilinear for moderate downscaling
        (2u32, 1u32) // Lanczos only for 1x-2x, bilinear for 2x-4x
    };
    
    // Check if scale factor exceeds threshold using integer arithmetic
    let scale_x_exceeds_bilinear = is_downscaling_x && src_w > dst_w.saturating_mul(bilinear_threshold);
    let scale_y_exceeds_bilinear = is_downscaling_y && src_h > dst_h.saturating_mul(bilinear_threshold);
    let scale_x_exceeds_lanczos = is_downscaling_x && src_w > dst_w.saturating_mul(lanczos_threshold);
    let scale_y_exceeds_lanczos = is_downscaling_y && src_h > dst_h.saturating_mul(lanczos_threshold);
    
    // Select algorithm: Lanczos > Bilinear > Nearest
    if !scale_x_exceeds_lanczos && !scale_y_exceeds_lanczos {
        2 // Lanczos (best quality)
    } else if !scale_x_exceeds_bilinear && !scale_y_exceeds_bilinear {
        1 // Bilinear (balanced)
    } else {
        0 // Nearest neighbor (fastest)
    }
}

/// Legacy function for backward compatibility
#[allow(dead_code)]
#[inline(always)]
fn should_use_nearest_neighbor(src_w: u32, src_h: u32, dst_w: u32, dst_h: u32) -> bool {
    select_resize_algorithm(src_w, src_h, dst_w, dst_h) == 0
}

/// Fast nearest neighbor resize (for downscaling large images)
/// Returns error code: 0 = success, non-zero = error
#[no_mangle]
pub unsafe extern "C" fn resize_rgba_nearest(
    src_ptr: *const u8,
    src_w: u32,
    src_h: u32,
    dst_ptr: *mut u8,
    dst_w: u32,
    dst_h: u32,
) -> i32 {
    let (src_size, dst_size) = match validate_params(src_ptr, src_w, src_h, dst_ptr, dst_w, dst_h) {
        Ok(sizes) => sizes,
        Err(code) => return code,
    };
    
    let src = match std::slice::from_raw_parts(src_ptr, src_size).get(..) {
        Some(s) => s,
        None => {
            set_last_error(RESIZE_ERR_MEMORY);
            return RESIZE_ERR_MEMORY;
        }
    };
    
    let dst = match std::slice::from_raw_parts_mut(dst_ptr, dst_size).get_mut(..) {
        Some(s) => s,
        None => {
            set_last_error(RESIZE_ERR_MEMORY);
            return RESIZE_ERR_MEMORY;
        }
    };
    
    let scale_x = src_w as f32 / dst_w as f32;
    let scale_y = src_h as f32 / dst_h as f32;

    // Precompute X mapping: for each destination x, which source pixel (byte index) to sample
    // This avoids recomputing float math inside the inner loop
    // Reuse thread-local buffer to avoid heap allocation on every call
    X_INDICES_NEAREST.with(|x_indices_cell| {
        let mut x_indices = x_indices_cell.borrow_mut();
        let dst_w_usize = dst_w as usize;
        
        // Clear and reserve capacity if needed (reuses existing capacity)
        x_indices.clear();
        let x_cap = x_indices.capacity();
        if x_cap < dst_w_usize {
            x_indices.reserve(dst_w_usize.saturating_sub(x_cap));
        }
        
        // Precompute X indices
        for x in 0..dst_w {
            let src_x = ((x as f32 + 0.5) * scale_x) as u32;
            let src_x = src_x.min(src_w - 1);
            x_indices.push((src_x as usize) * 4);
        }
        
        // Optimized nearest neighbor with pre-calculated indices
        // Enhanced bounds checking to prevent buffer overflows
        for y in 0..dst_h {
            let src_y = ((y as f32 + 0.5) * scale_y) as u32;
            let src_y = src_y.min(src_h - 1);
            
            // Check for integer overflow in offset calculation
            let src_y_offset = match (src_y as usize)
                .checked_mul(src_w as usize)
                .and_then(|x| x.checked_mul(4))
            {
                Some(offset) => offset,
                None => {
                    set_last_error(RESIZE_ERR_OVERFLOW);
                    return RESIZE_ERR_OVERFLOW;
                }
            };
            
            // Validate offset is within source buffer bounds
            if src_y_offset >= src.len() {
                set_last_error(RESIZE_ERR_INVALID_SIZE);
                return RESIZE_ERR_INVALID_SIZE;
            }
            
            for x in 0..dst_w {
                // Validate LUT index is within bounds
                let x_idx = x as usize;
                if x_idx >= x_indices.len() {
                    set_last_error(RESIZE_ERR_INVALID_SIZE);
                    return RESIZE_ERR_INVALID_SIZE;
                }
                
                let src_idx = match src_y_offset.checked_add(x_indices[x_idx]) {
                    Some(idx) => idx,
                    None => {
                        set_last_error(RESIZE_ERR_OVERFLOW);
                        return RESIZE_ERR_OVERFLOW;
                    }
                };
                
                // Check for integer overflow in destination index calculation
                let dst_idx = match (y as usize)
                    .checked_mul(dst_w as usize)
                    .and_then(|x| x.checked_add(x_idx))
                    .and_then(|x| x.checked_mul(4))
                {
                    Some(idx) => idx,
                    None => {
                        set_last_error(RESIZE_ERR_OVERFLOW);
                        return RESIZE_ERR_OVERFLOW;
                    }
                };
                
                // Enhanced bounds checking: ensure we can safely access 4 bytes
                if src_idx.saturating_add(3) < src.len() && dst_idx.saturating_add(3) < dst.len() {
                    // Additional safety check: ensure indices are within valid range
                    if src_idx < src.len() && dst_idx < dst.len() {
                        // Use SIMD-optimized copy for aligned memory (4 pixels = 16 bytes)
                        // Check if both pointers are 16-byte aligned for optimal SIMD performance
                        #[cfg(target_feature = "simd128")]
                        {
                            if (src.as_ptr().add(src_idx) as usize) % 16 == 0
                                && (dst.as_mut_ptr().add(dst_idx) as usize) % 16 == 0
                            {
                                copy_4_pixels_simd(src.as_ptr().add(src_idx), dst.as_mut_ptr().add(dst_idx));
                            } else {
                                // Unaligned: use scalar copy
                                dst[dst_idx] = src[src_idx];
                                dst[dst_idx + 1] = src[src_idx + 1];
                                dst[dst_idx + 2] = src[src_idx + 2];
                                dst[dst_idx + 3] = src[src_idx + 3];
                            }
                        }
                        #[cfg(not(target_feature = "simd128"))]
                        {
                            dst[dst_idx] = src[src_idx];
                            dst[dst_idx + 1] = src[src_idx + 1];
                            dst[dst_idx + 2] = src[src_idx + 2];
                            dst[dst_idx + 3] = src[src_idx + 3];
                        }
                    }
                }
            }
        }
        
        RESIZE_OK
    })
}

/// Resize RGBA image data with automatic algorithm selection
/// 
/// This function serves as the main entry point and handles:
/// 1. Parameter validation
/// 2. Algorithm selection (nearest neighbor vs bilinear interpolation)
/// 3. Delegation to the appropriate resize implementation
/// 
/// The algorithm is automatically chosen based on:
/// - Scale factor (large downscaling uses nearest neighbor for performance)
/// - Image size (dynamic threshold adjustment for optimal quality/performance balance)
/// 
/// Returns error code: 0 = success, non-zero = error
/// 
/// # Safety
/// This function is unsafe because it operates on raw pointers.
/// The caller must ensure:
/// - src_ptr points to valid memory of size src_w * src_h * 4 bytes
/// - dst_ptr points to valid memory of size dst_w * dst_h * 4 bytes
/// - All dimensions are > 0
/// - Memory regions do not overlap
#[no_mangle]
pub unsafe extern "C" fn resize_rgba(
    src_ptr: *const u8,
    src_w: u32,
    src_h: u32,
    dst_ptr: *mut u8,
    dst_w: u32,
    dst_h: u32,
) -> i32 {
    let (src_size, dst_size) = match validate_params(src_ptr, src_w, src_h, dst_ptr, dst_w, dst_h) {
        Ok(sizes) => sizes,
        Err(code) => return code,
    };
    
    let src = match std::slice::from_raw_parts(src_ptr, src_size).get(..) {
        Some(s) => s,
        None => {
            set_last_error(RESIZE_ERR_MEMORY);
            return RESIZE_ERR_MEMORY;
        }
    };
    
    let dst = match std::slice::from_raw_parts_mut(dst_ptr, dst_size).get_mut(..) {
        Some(s) => s,
        None => {
            set_last_error(RESIZE_ERR_MEMORY);
            return RESIZE_ERR_MEMORY;
        }
    };
    
    // Select optimal algorithm based on scale factor and image size
    let algorithm = select_resize_algorithm(src_w, src_h, dst_w, dst_h);
    match algorithm {
        0 => return resize_rgba_nearest(src_ptr, src_w, src_h, dst_ptr, dst_w, dst_h),
        2 => return resize_rgba_lanczos(src_ptr, src_w, src_h, dst_ptr, dst_w, dst_h),
        _ => {} // Continue with bilinear (algorithm == 1)
    }

    let scale_x = src_w as f32 / dst_w as f32;
    let scale_y = src_h as f32 / dst_h as f32;

    // ==================== Precompute interpolation parameters along X ====================
    //
    // For each destination x:
    // - Precompute the corresponding source coordinate src_x
    // - Derive x0 / x1 (neighboring source pixel indices)
    // - And the interpolation weight fx
    //
    // This avoids repeated floating point division / floor / clamp in the inner loop.
    // Reuse thread-local buffers to avoid heap allocation on every call

    let dst_w_usize = dst_w as usize;
    
    X0_INDICES_BILINEAR.with(|x0_cell| {
        X1_INDICES_BILINEAR.with(|x1_cell| {
            FX_VALUES_BILINEAR.with(|fx_cell| {
                let mut x0_indices = x0_cell.borrow_mut();
                let mut x1_indices = x1_cell.borrow_mut();
                let mut fx_values = fx_cell.borrow_mut();
                
                // Clear and reserve capacity if needed (reuses existing capacity)
                x0_indices.clear();
                x1_indices.clear();
                fx_values.clear();
                
                // Calculate required capacity before reserving to avoid borrow conflicts
                let x0_cap = x0_indices.capacity();
                let x1_cap = x1_indices.capacity();
                let fx_cap = fx_values.capacity();
                
                if x0_cap < dst_w_usize {
                    x0_indices.reserve(dst_w_usize.saturating_sub(x0_cap));
                }
                if x1_cap < dst_w_usize {
                    x1_indices.reserve(dst_w_usize.saturating_sub(x1_cap));
                }
                if fx_cap < dst_w_usize {
                    fx_values.reserve(dst_w_usize.saturating_sub(fx_cap));
                }
                
                // Precompute X-direction LUT
        for x in 0..dst_w {
            let src_x = (x as f32 + 0.5) * scale_x - 0.5;
                    let x0 = src_x.floor() as i32;
                    let x1 = (x0 + 1).min(src_w as i32 - 1);
                    let fx = (src_x - x0 as f32).max(0.0).min(1.0);

                    let x0_clamped = x0.clamp(0, src_w as i32 - 1) as usize * 4;
                    let x1_clamped = x1.clamp(0, src_w as i32 - 1) as usize * 4;

                    x0_indices.push(x0_clamped);
                    x1_indices.push(x1_clamped);
                    fx_values.push(fx);
                }
                
                // Optimized bilinear interpolation with bounds checking
                for y in 0..dst_h {
            let src_y = (y as f32 + 0.5) * scale_y - 0.5;
            let y0 = src_y.floor() as i32;
            let y1 = (y0 + 1).min(src_h as i32 - 1);
                    let fy = (src_y - y0 as f32).max(0.0).min(1.0);
                    
                    // Pre-calculate y offsets with clamping to valid range
                    // Enhanced overflow checking for safety
                    let y0_clamped = y0.clamp(0, src_h as i32 - 1) as usize;
                    let y1_clamped = y1.clamp(0, src_h as i32 - 1) as usize;
                    
                    // Check for integer overflow in offset calculations
                    let y0_offset = match y0_clamped
                        .checked_mul(src_w as usize)
                        .and_then(|x| x.checked_mul(4))
                    {
                        Some(offset) => offset,
                        None => {
                            set_last_error(RESIZE_ERR_OVERFLOW);
                            return RESIZE_ERR_OVERFLOW;
                        }
                    };
                    
                    let y1_offset = match y1_clamped
                        .checked_mul(src_w as usize)
                        .and_then(|x| x.checked_mul(4))
                    {
                        Some(offset) => offset,
                        None => {
                            set_last_error(RESIZE_ERR_OVERFLOW);
                            return RESIZE_ERR_OVERFLOW;
                        }
                    };
                    
                    // Validate offsets are within source buffer bounds
                    if y0_offset >= src.len() || y1_offset >= src.len() {
                        set_last_error(RESIZE_ERR_INVALID_SIZE);
                        return RESIZE_ERR_INVALID_SIZE;
                    }
                    
                    for x in 0..dst_w {
                        // Fetch X-direction parameters from the precomputed LUT
                        // Enhanced bounds checking for LUT access
                        let lut_index = x as usize;
                        
                        // Validate LUT indices are within bounds
                        if lut_index >= x0_indices.len()
                            || lut_index >= x1_indices.len()
                            || lut_index >= fx_values.len()
                        {
                            set_last_error(RESIZE_ERR_INVALID_SIZE);
                            return RESIZE_ERR_INVALID_SIZE;
                        }
                        
                        let x0_clamped = x0_indices[lut_index];
                        let x1_clamped = x1_indices[lut_index];
                        let fx = fx_values[lut_index];
                        
                        // Get four neighboring pixels with clamped edge handling
                        // Enhanced bounds checking with overflow protection
                        let get_pixel_safe = |offset: usize, idx: usize| -> [u8; 4] {
                            // Check for integer overflow in position calculation
                            let mut pos = match offset.checked_add(idx) {
                                Some(p) => p,
                                None => {
                                    // Overflow occurred, return transparent pixel
                                    return [0, 0, 0, 0];
                                }
                            };
                            
                            // Enhanced bounds checking: ensure we can safely access 4 bytes
                            // Clamp to last full pixel within bounds (replicate edge pixel)
                            if pos.saturating_add(3) >= src.len() {
                                if src.len() >= 4 {
                                    // Clamp to the last complete pixel
                                    pos = src.len().saturating_sub(4);
                                } else {
                                    // Source buffer too small, return transparent pixel
                                    return [0, 0, 0, 0];
                                }
                            }
                            
                            // Final safety check: ensure position is within bounds
                            if pos >= src.len() {
                                return [0, 0, 0, 0];
                            }
                            
                            // Safe to access 4 bytes
                            [
                                src[pos],
                                src[pos + 1],
                                src[pos + 2],
                                src[pos + 3],
                            ]
                        };
                        
                        let p00 = get_pixel_safe(y0_offset, x0_clamped);
                        let p10 = get_pixel_safe(y0_offset, x1_clamped);
                        let p01 = get_pixel_safe(y1_offset, x0_clamped);
                        let p11 = get_pixel_safe(y1_offset, x1_clamped);
                        
                        // Use SIMD-optimized bilinear interpolation
                        // This function uses optimized scalar code with SIMD-ready structure
                        // Future: Full SIMD implementation for 4x speedup
                        let result = bilinear_interp_4_pixels(p00, p10, p01, p11, fx, fy);
                        
                        // Write to destination with enhanced bounds checking
                        // Check for integer overflow in destination index calculation
                        let dst_idx = match (y as usize)
                            .checked_mul(dst_w as usize)
                            .and_then(|x| x.checked_add(lut_index))
                            .and_then(|x| x.checked_mul(4))
                        {
                            Some(idx) => idx,
                            None => {
                                set_last_error(RESIZE_ERR_OVERFLOW);
                                return RESIZE_ERR_OVERFLOW;
                            }
                        };
                        
                        // Enhanced bounds checking: ensure we can safely write 4 bytes
                        if dst_idx.saturating_add(3) < dst.len() && dst_idx < dst.len() {
                            dst[dst_idx] = result[0];
                            dst[dst_idx + 1] = result[1];
                            dst[dst_idx + 2] = result[2];
                            dst[dst_idx + 3] = result[3];
                        }
                    }
                }
                
                RESIZE_OK
            })
        })
    })
}

/// Anti-ringing clamp: prevents overshoot/undershoot artifacts
/// Clamps result to min/max of contributing source pixels
#[inline(always)]
fn anti_ringing_clamp(value: f32, min_val: f32, max_val: f32) -> f32 {
    value.max(min_val).min(max_val)
}

/// Precompute Lanczos weights and indices for separable convolution
/// Returns (weights, indices) for a single destination coordinate
#[inline(always)]
fn precompute_lanczos_weights(
    dst_coord: f32,
    src_size: u32,
    scale: f32,
    a: f32,
) -> (Vec<f32>, Vec<i32>) {
    let src_coord = (dst_coord + 0.5) * scale - 0.5;
    let center = src_coord.floor() as i32;
    let start = (center - a as i32 + 1).max(0);
    let end = (center + a as i32).min(src_size as i32 - 1);
    
    let mut weights = Vec::new();
    let mut indices = Vec::new();
    
    for i in start..=end {
        let dist = (i as f32 - src_coord) / scale;
        let weight = lanczos_kernel(dist, a);
        
        if weight.abs() >= 1e-6 {
            weights.push(weight);
            indices.push(i);
        }
    }
    
    (weights, indices)
}

/// High-quality Lanczos resampling using separable convolution
/// Pass 1: Horizontal (X-axis) resampling
/// Pass 2: Vertical (Y-axis) resampling
/// This reduces complexity from O(N²) to O(2N) - from 36 samples to 12 samples per pixel!
/// Returns error code: 0 = success, non-zero = error
#[no_mangle]
pub unsafe extern "C" fn resize_rgba_lanczos(
    src_ptr: *const u8,
    src_w: u32,
    src_h: u32,
    dst_ptr: *mut u8,
    dst_w: u32,
    dst_h: u32,
) -> i32 {
    let (src_size, dst_size) = match validate_params(src_ptr, src_w, src_h, dst_ptr, dst_w, dst_h) {
        Ok(sizes) => sizes,
        Err(code) => return code,
    };
    
    let src = match std::slice::from_raw_parts(src_ptr, src_size).get(..) {
        Some(s) => s,
        None => {
            set_last_error(RESIZE_ERR_MEMORY);
            return RESIZE_ERR_MEMORY;
        }
    };
    
    let dst = match std::slice::from_raw_parts_mut(dst_ptr, dst_size).get_mut(..) {
        Some(s) => s,
        None => {
            set_last_error(RESIZE_ERR_MEMORY);
            return RESIZE_ERR_MEMORY;
        }
    };
    
    const LANCZOS_A: f32 = 3.0; // 3-lobed Lanczos kernel
    let scale_x = src_w as f32 / dst_w as f32;
    let scale_y = src_h as f32 / dst_h as f32;
    
    // Use thread-local buffers for intermediate results and precomputed weights
    LANCZOS_X_WEIGHTS.with(|x_weights_cell| {
        LANCZOS_X_INDICES.with(|x_indices_cell| {
            LANCZOS_Y_WEIGHTS.with(|y_weights_cell| {
                LANCZOS_Y_INDICES.with(|y_indices_cell| {
                    LANCZOS_TEMP_BUFFER.with(|temp_cell| {
                        let mut x_weights = x_weights_cell.borrow_mut();
                        let mut x_indices = x_indices_cell.borrow_mut();
                        let mut y_weights = y_weights_cell.borrow_mut();
                        let mut y_indices = y_indices_cell.borrow_mut();
                        let mut temp_buffer = temp_cell.borrow_mut();
                        
                        // Clear and resize buffers
                        x_weights.clear();
                        x_indices.clear();
                        y_weights.clear();
                        y_indices.clear();
                        
                        // Precompute X-axis weights and indices (Pass 1 preparation)
                        x_weights.reserve(dst_w as usize);
                        x_indices.reserve(dst_w as usize);
                        for x in 0..dst_w {
                            let (weights, indices) = precompute_lanczos_weights(x as f32, src_w, scale_x, LANCZOS_A);
                            x_weights.push(weights);
                            x_indices.push(indices);
                        }
                        
                        // Precompute Y-axis weights and indices (Pass 2 preparation)
                        y_weights.reserve(dst_h as usize);
                        y_indices.reserve(dst_h as usize);
                        for y in 0..dst_h {
                            let (weights, indices) = precompute_lanczos_weights(y as f32, src_h, scale_y, LANCZOS_A);
                            y_weights.push(weights);
                            y_indices.push(indices);
                        }
                        
                        // Allocate intermediate buffer for Pass 1 result (dst_w × src_h × 4 channels)
                        let temp_size = (dst_w as usize) * (src_h as usize) * 4;
                        temp_buffer.clear();
                        temp_buffer.reserve(temp_size);
                        temp_buffer.resize(temp_size, 0.0f32);
                        
                        // ==================== Pass 1: Horizontal (X-axis) resampling ====================
                        // Resize from src_w × src_h to dst_w × src_h
                        for y in 0..src_h {
                            let y_offset_src = match (y as usize)
                                .checked_mul(src_w as usize)
                                .and_then(|x| x.checked_mul(4))
                            {
                                Some(offset) => offset,
                                None => {
                                    set_last_error(RESIZE_ERR_OVERFLOW);
                                    return RESIZE_ERR_OVERFLOW;
                                }
                            };
                            
                            if y_offset_src >= src.len() {
                                continue;
                            }
                            
                            for x in 0..dst_w {
                                let x_idx = x as usize;
                                if x_idx >= x_weights.len() || x_idx >= x_indices.len() {
                                    continue;
                                }
                                
                                let weights = &x_weights[x_idx];
                                let indices = &x_indices[x_idx];
                                
                                // Accumulate weighted samples
                                let mut r_sum = 0.0f32;
                                let mut g_sum = 0.0f32;
                                let mut b_sum = 0.0f32;
                                let mut a_sum = 0.0f32;
                                let mut weight_sum = 0.0f32;
                                
                                // Track min/max for anti-ringing
                                let mut r_min = 255.0f32;
                                let mut r_max = 0.0f32;
                                let mut g_min = 255.0f32;
                                let mut g_max = 0.0f32;
                                let mut b_min = 255.0f32;
                                let mut b_max = 0.0f32;
                                let mut a_min = 255.0f32;
                                let mut a_max = 0.0f32;
                                
                                for (weight, &sx) in weights.iter().zip(indices.iter()) {
                                    let sx_clamped = sx.clamp(0, src_w as i32 - 1) as usize;
                                    let src_idx = match y_offset_src.checked_add(sx_clamped * 4) {
                                        Some(idx) => idx,
                                        None => continue,
                                    };
                                    
                                    if src_idx.saturating_add(3) >= src.len() {
                                        continue;
                                    }
                                    
                                    let r = src[src_idx] as f32;
                                    let g = src[src_idx + 1] as f32;
                                    let b = src[src_idx + 2] as f32;
                                    let a = src[src_idx + 3] as f32;
                                    
                                    r_sum += r * weight;
                                    g_sum += g * weight;
                                    b_sum += b * weight;
                                    a_sum += a * weight;
                                    weight_sum += weight;
                                    
                                    // Track min/max for anti-ringing
                                    r_min = r_min.min(r);
                                    r_max = r_max.max(r);
                                    g_min = g_min.min(g);
                                    g_max = g_max.max(g);
                                    b_min = b_min.min(b);
                                    b_max = b_max.max(b);
                                    a_min = a_min.min(a);
                                    a_max = a_max.max(a);
                                }
                                
                                // Normalize
                                if weight_sum.abs() > 1e-6 {
                                    r_sum /= weight_sum;
                                    g_sum /= weight_sum;
                                    b_sum /= weight_sum;
                                    a_sum /= weight_sum;
                                }
                                
                                // Anti-ringing clamp: prevent overshoot/undershoot
                                r_sum = anti_ringing_clamp(r_sum, r_min, r_max);
                                g_sum = anti_ringing_clamp(g_sum, g_min, g_max);
                                b_sum = anti_ringing_clamp(b_sum, b_min, b_max);
                                a_sum = anti_ringing_clamp(a_sum, a_min, a_max);
                                
                                // Store in temp buffer (dst_w × src_h)
                                let temp_idx = ((y as usize) * (dst_w as usize) + x_idx) * 4;
                                if temp_idx + 3 < temp_buffer.len() {
                                    temp_buffer[temp_idx] = r_sum;
                                    temp_buffer[temp_idx + 1] = g_sum;
                                    temp_buffer[temp_idx + 2] = b_sum;
                                    temp_buffer[temp_idx + 3] = a_sum;
                                }
                            }
                        }
                        
                        // ==================== Pass 2: Vertical (Y-axis) resampling ====================
                        // Resize from dst_w × src_h to dst_w × dst_h
                        for y in 0..dst_h {
                            let y_idx = y as usize;
                            if y_idx >= y_weights.len() || y_idx >= y_indices.len() {
                                continue;
                            }
                            
                            let weights = &y_weights[y_idx];
                            let indices = &y_indices[y_idx];
                            
                            for x in 0..dst_w {
                                let x_idx = x as usize;
                                
                                // Accumulate weighted samples from temp buffer
                                let mut r_sum = 0.0f32;
                                let mut g_sum = 0.0f32;
                                let mut b_sum = 0.0f32;
                                let mut a_sum = 0.0f32;
                                let mut weight_sum = 0.0f32;
                                
                                // Track min/max for anti-ringing
                                let mut r_min = 255.0f32;
                                let mut r_max = 0.0f32;
                                let mut g_min = 255.0f32;
                                let mut g_max = 0.0f32;
                                let mut b_min = 255.0f32;
                                let mut b_max = 0.0f32;
                                let mut a_min = 255.0f32;
                                let mut a_max = 0.0f32;
                                
                                for (weight, &sy) in weights.iter().zip(indices.iter()) {
                                    let sy_clamped = sy.clamp(0, src_h as i32 - 1) as usize;
                                    let temp_idx = (sy_clamped * (dst_w as usize) + x_idx) * 4;
                                    
                                    if temp_idx + 3 >= temp_buffer.len() {
                                        continue;
                                    }
                                    
                                    let r = temp_buffer[temp_idx];
                                    let g = temp_buffer[temp_idx + 1];
                                    let b = temp_buffer[temp_idx + 2];
                                    let a = temp_buffer[temp_idx + 3];
                                    
                                    r_sum += r * weight;
                                    g_sum += g * weight;
                                    b_sum += b * weight;
                                    a_sum += a * weight;
                                    weight_sum += weight;
                                    
                                    // Track min/max for anti-ringing
                                    r_min = r_min.min(r);
                                    r_max = r_max.max(r);
                                    g_min = g_min.min(g);
                                    g_max = g_max.max(g);
                                    b_min = b_min.min(b);
                                    b_max = b_max.max(b);
                                    a_min = a_min.min(a);
                                    a_max = a_max.max(a);
                                }
                                
                                // Normalize
                                if weight_sum.abs() > 1e-6 {
                                    r_sum /= weight_sum;
                                    g_sum /= weight_sum;
                                    b_sum /= weight_sum;
                                    a_sum /= weight_sum;
                                }
                                
                                // Anti-ringing clamp
                                r_sum = anti_ringing_clamp(r_sum, r_min, r_max);
                                g_sum = anti_ringing_clamp(g_sum, g_min, g_max);
                                b_sum = anti_ringing_clamp(b_sum, b_min, b_max);
                                a_sum = anti_ringing_clamp(a_sum, a_min, a_max);
                                
                                // Clamp to valid u8 range
            let result = [
                                    r_sum.max(0.0).min(255.0) as u8,
                                    g_sum.max(0.0).min(255.0) as u8,
                                    b_sum.max(0.0).min(255.0) as u8,
                                    a_sum.max(0.0).min(255.0) as u8,
            ];

            // Write to destination
                                let dst_idx = match (y as usize)
                                    .checked_mul(dst_w as usize)
                                    .and_then(|row| row.checked_add(x_idx))
                                    .and_then(|pixel| pixel.checked_mul(4))
                                {
                                    Some(idx) => idx,
                                    None => {
                                        set_last_error(RESIZE_ERR_OVERFLOW);
                                        return RESIZE_ERR_OVERFLOW;
                                    }
                                };
                                
                                if dst_idx.saturating_add(3) < dst.len() && dst_idx < dst.len() {
            dst[dst_idx] = result[0];
            dst[dst_idx + 1] = result[1];
            dst[dst_idx + 2] = result[2];
            dst[dst_idx + 3] = result[3];
        }
    }
}

                        RESIZE_OK
                    })
                })
            })
        })
    })
}

/* 
 * Empty your mind, be formless, shapeless, like water. 
 * Now you put water into a cup, it becomes the cup; Put it in a teapot, it becomes the teapot. 
 * Water can flow, or creep, or drip, or crash. 
 * Be water, my friend.
 * -- Bruce Lee
*/