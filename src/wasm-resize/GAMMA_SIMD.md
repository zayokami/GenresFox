# Gamma-Correct SIMD Resampling Module

This module implements high-performance gamma-correct image resampling with SIMD acceleration support.

## Features

- **Gamma Correction**: Proper sRGB <-> linear RGB conversion for accurate color interpolation
- **SIMD Optimization**: Uses WASM SIMD128 instructions for 4x parallel processing (when enabled)
- **Bilinear Interpolation**: High-quality resampling with gamma-correct color space
- **Zero Dependencies**: Pure Rust implementation using only standard library

## Building with SIMD Support

To enable SIMD acceleration, compile with SIMD target features:

```bash
RUSTFLAGS="-C target-feature=+simd128" cargo build --release --target wasm32-unknown-unknown
```

Or set it permanently in `.cargo/config.toml`:

```toml
[build]
target = "wasm32-unknown-unknown"

[target.wasm32-unknown-unknown]
rustflags = ["-C", "target-feature=+simd128"]
```

## API

### `resize_rgba_gamma_bilinear`

Gamma-correct bilinear interpolation resize function.

```rust
pub unsafe extern "C" fn resize_rgba_gamma_bilinear(
    src_ptr: *const u8,
    src_w: u32,
    src_h: u32,
    dst_ptr: *mut u8,
    dst_w: u32,
    dst_h: u32,
) -> i32
```

**Parameters:**
- `src_ptr`: Pointer to source RGBA image data (4 bytes per pixel)
- `src_w`, `src_h`: Source image dimensions
- `dst_ptr`: Pointer to destination RGBA buffer (must be pre-allocated)
- `dst_w`, `dst_h`: Destination image dimensions

**Returns:**
- `0` (RESIZE_OK) on success
- Non-zero error code on failure

**Algorithm:**
1. Convert sRGB pixels to linear RGB (gamma decode)
2. Perform bilinear interpolation in linear color space
3. Convert result back to sRGB (gamma encode)

This ensures accurate color interpolation without color shifts or banding artifacts.

## Performance

- **Without SIMD**: ~2-3x slower than regular bilinear (due to gamma conversion overhead)
- **With SIMD**: Target ~1.5-2x slower than regular bilinear (4x parallel processing compensates for gamma overhead)

## Future Enhancements

- Full SIMD pipeline implementation for `srgb_to_linear_simd` and `linear_to_srgb_simd`
- Gamma-correct Lanczos resampling
- Multi-threaded processing (when WASM threads are available)

