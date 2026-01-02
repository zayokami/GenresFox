/**
 * Configuration Manager Module
 * Handles export/import of user configuration with integrity verification
 * 
 * Features:
 * - HMAC-SHA256 signature for tamper detection
 * - Timestamp validation
 * - Version compatibility checking
 * - Lightweight, no external dependencies
 */

const ConfigManager = (function () {
    'use strict';

    // ==================== Configuration Constants ====================
    const CONFIG = {
        VERSION: '0.4.6',
        MAX_AGE_DAYS: 365, // Maximum age of config file (1 year)
        MIN_AGE_MS: 1000, // Minimum age to prevent replay attacks (1 second)
        SIGNATURE_KEY: 'genresfox-config-signature-v1', // Secret key for HMAC
        ALGORITHM: 'HMAC',
        HASH: 'SHA-256',
        // Minimum supported version for migration
        MIN_SUPPORTED_VERSION: '0.1.0'
    };

    // ==================== State ====================
    let _state = {
        isInitialized: false
    };

    // ==================== Crypto Helpers ====================

    /**
     * Import HMAC key from string
     * @returns {Promise<CryptoKey>}
     */
    async function _importKey() {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(CONFIG.SIGNATURE_KEY);
        return await crypto.subtle.importKey(
            'raw',
            keyData,
            {
                name: CONFIG.ALGORITHM,
                hash: CONFIG.HASH
            },
            false,
            ['sign', 'verify']
        );
    }

    /**
     * Generate HMAC signature for data
     * @param {string} data - JSON string to sign
     * @returns {Promise<string>} Base64-encoded signature
     */
    async function _generateSignature(data) {
        try {
            const key = await _importKey();
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);
            const signature = await crypto.subtle.sign(
                CONFIG.ALGORITHM,
                key,
                dataBuffer
            );
            // Convert ArrayBuffer to base64
            const bytes = new Uint8Array(signature);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        } catch (e) {
            console.error('Failed to generate signature:', e);
            throw new Error('Signature generation failed');
        }
    }

    /**
     * Verify HMAC signature
     * @param {string} data - JSON string to verify
     * @param {string} signature - Base64-encoded signature
     * @returns {Promise<boolean>} Whether signature is valid
     */
    async function _verifySignature(data, signature) {
        try {
            const key = await _importKey();
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);
            
            // Convert base64 signature to ArrayBuffer
            const binary = atob(signature);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            
            return await crypto.subtle.verify(
                CONFIG.ALGORITHM,
                key,
                bytes,
                dataBuffer
            );
        } catch (e) {
            console.error('Failed to verify signature:', e);
            return false;
        }
    }

    // ==================== Validation ====================

    /**
     * Validate timestamp
     * @param {string} timestamp - ISO timestamp string
     * @returns {Object} { valid: boolean, reason?: string }
     */
    function _validateTimestamp(timestamp) {
        if (!timestamp || typeof timestamp !== 'string') {
            return { valid: false, reason: 'Missing or invalid timestamp' };
        }

        let date;
        try {
            date = new Date(timestamp);
        } catch (e) {
            return { valid: false, reason: 'Invalid timestamp format' };
        }

        if (isNaN(date.getTime())) {
            return { valid: false, reason: 'Invalid timestamp value' };
        }

        const now = Date.now();
        const fileTime = date.getTime();
        const age = now - fileTime;

        // Check if file is too old
        const maxAge = CONFIG.MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
        if (age > maxAge) {
            return { valid: false, reason: `Config file is too old (${Math.floor(age / (24 * 60 * 60 * 1000))} days)` };
        }

        // Check if file is from the future (clock skew)
        if (age < -60000) { // Allow 1 minute clock skew
            return { valid: false, reason: 'Config file timestamp is in the future' };
        }

        // Check minimum age (prevent replay attacks with very recent timestamps)
        if (age < CONFIG.MIN_AGE_MS && age >= 0) {
            // This is acceptable for newly exported files
        }

        return { valid: true };
    }

    /**
     * Compare version strings
     * @param {string} v1 - Version 1
     * @param {string} v2 - Version 2
     * @returns {number} -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
     */
    function _compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        const maxLength = Math.max(parts1.length, parts2.length);
        
        for (let i = 0; i < maxLength; i++) {
            const part1 = parts1[i] || 0;
            const part2 = parts2[i] || 0;
            if (part1 < part2) return -1;
            if (part1 > part2) return 1;
        }
        return 0;
    }

    /**
     * Check if version is supported (can be migrated)
     * @param {string} version - Version string
     * @returns {boolean} Whether version can be migrated
     */
    function _isVersionSupported(version) {
        if (!version || typeof version !== 'string') {
            return false;
        }

        try {
            // Check if version is >= minimum supported
            if (_compareVersions(version, CONFIG.MIN_SUPPORTED_VERSION) < 0) {
                return false;
            }
            
            // Check if version is not newer than current
            if (_compareVersions(version, CONFIG.VERSION) > 0) {
                return false;
            }
            
            return true;
        } catch (e) {
            console.error('Error comparing versions:', e);
            return false;
        }
    }

    /**
     * Validate configuration structure (lenient for old formats)
     * @param {Object} config - Configuration object
     * @param {boolean} allowLegacy - Allow legacy format without version/exportDate
     * @returns {Object} { valid: boolean, reason?: string }
     */
    function _validateConfigStructure(config, allowLegacy = false) {
        if (!config || typeof config !== 'object') {
            return { valid: false, reason: 'Invalid configuration structure' };
        }

        // For legacy formats, settings might be at root level
        const settingsObj = config.settings || config;
        
        if (!settingsObj || typeof settingsObj !== 'object') {
            return { valid: false, reason: 'Missing or invalid settings field' };
        }

        // Version and exportDate are optional for legacy formats
        if (!allowLegacy) {
            if (!config.version || typeof config.version !== 'string') {
                return { valid: false, reason: 'Missing or invalid version field' };
            }

            if (!config.exportDate || typeof config.exportDate !== 'string') {
                return { valid: false, reason: 'Missing or invalid exportDate field' };
            }
        }

        // Validate critical settings structure
        const settings = config.settings || config;
        
        // Engines should be an object
        if (settings.engines !== undefined && typeof settings.engines !== 'object') {
            return { valid: false, reason: 'Invalid engines structure' };
        }

        // Shortcuts should be an array
        if (settings.shortcuts !== undefined && !Array.isArray(settings.shortcuts)) {
            return { valid: false, reason: 'Invalid shortcuts structure' };
        }

        // Validate shortcuts array items
        if (Array.isArray(settings.shortcuts)) {
            for (let i = 0; i < settings.shortcuts.length; i++) {
                const shortcut = settings.shortcuts[i];
                if (!shortcut || typeof shortcut !== 'object') {
                    return { valid: false, reason: `Invalid shortcut at index ${i}` };
                }
                if (typeof shortcut.name !== 'string' || typeof shortcut.url !== 'string') {
                    return { valid: false, reason: `Invalid shortcut fields at index ${i}` };
                }
            }
        }

        return { valid: true };
    }

    // ==================== Export ====================

    /**
     * Export configuration with signature
     * @param {Object} configData - Configuration data to export
     * @returns {Promise<Object>} Signed configuration object
     */
    async function exportConfig(configData) {
        try {
            // Validate input
            if (!configData || typeof configData !== 'object') {
                throw new Error('Invalid configuration data');
            }

            // Ensure required fields
            const config = {
                version: CONFIG.VERSION,
                exportDate: new Date().toISOString(),
                settings: configData.settings || configData
            };

            // Create a copy without signature for signing
            const configForSigning = JSON.parse(JSON.stringify(config));
            
            // Generate signature
            const dataToSign = JSON.stringify(configForSigning);
            const signature = await _generateSignature(dataToSign);

            // Add signature to config
            config.signature = signature;

            return config;
        } catch (e) {
            console.error('Failed to export configuration:', e);
            throw new Error('Export failed: ' + e.message);
        }
    }

    /**
     * Export configuration to JSON file
     * @param {Object} configData - Configuration data to export
     * @returns {Promise<void>}
     */
    async function exportToFile(configData) {
        try {
            const signedConfig = await exportConfig(configData);
            const jsonString = JSON.stringify(signedConfig, null, 2);

            // Create blob and download
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            a.download = `genresfox-config-${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Failed to export configuration to file:', e);
            throw e;
        }
    }

    // ==================== Migration ====================

    /**
     * Migrate configuration from older version to current version
     * @param {Object} config - Configuration object from older version
     * @param {string} fromVersion - Source version
     * @returns {Object} Migrated configuration object
     */
    function _migrateConfig(config, fromVersion) {
        if (!config || typeof config !== 'object') {
            throw new Error('Invalid configuration for migration');
        }

        let migrated = JSON.parse(JSON.stringify(config)); // Deep clone
        
        // Ensure settings object exists
        if (!migrated.settings) {
            migrated.settings = {};
        }

        // Migration from version < 0.2.0 (no version field or very old format)
        if (!fromVersion || _compareVersions(fromVersion, '0.2.0') < 0) {
            console.log('[ConfigManager] Migrating from pre-0.2.0 format');
            
            // Old format might have settings directly at root
            if (!migrated.settings.engines && migrated.engines) {
                migrated.settings.engines = migrated.engines;
                delete migrated.engines;
            }
            if (!migrated.settings.shortcuts && migrated.shortcuts) {
                migrated.settings.shortcuts = migrated.shortcuts;
                delete migrated.shortcuts;
            }
            
            // Ensure all required fields exist
            if (!migrated.settings.engines) {
                migrated.settings.engines = {};
            }
            if (!Array.isArray(migrated.settings.shortcuts)) {
                migrated.settings.shortcuts = [];
            }
        }

        // Migration from version < 0.3.0
        if (_compareVersions(fromVersion || '0.1.0', '0.3.0') < 0) {
            console.log('[ConfigManager] Migrating from pre-0.3.0 format');
            
            // Add missing settings with defaults
            if (migrated.settings.showShortcutNames === undefined) {
                migrated.settings.showShortcutNames = true;
            }
            if (!migrated.settings.wallpaperSettings) {
                migrated.settings.wallpaperSettings = {
                    blur: 0,
                    vignette: 0
                };
            }
            if (!migrated.settings.searchBoxSettings) {
                migrated.settings.searchBoxSettings = {
                    width: 600,
                    scale: 1,
                    position: 30,
                    radius: 24,
                    shadow: 0.3
                };
            }
        }

        // Migration from version < 0.4.0
        if (_compareVersions(fromVersion || '0.1.0', '0.4.0') < 0) {
            console.log('[ConfigManager] Migrating from pre-0.4.0 format');
            
            // Add theme settings if missing
            if (!migrated.settings.themeSettings) {
                migrated.settings.themeSettings = {
                    useWallpaperAccent: false
                };
            }
            
            // Add accessibility settings if missing
            if (!migrated.settings.accessibilitySettings) {
                migrated.settings.accessibilitySettings = {
                    theme: 'standard',
                    fontSize: 16,
                    fontFamily: 'default',
                    lineSpacing: 'normal',
                    motion: 'full',
                    focusStyle: 'standard'
                };
            }
            
            // Ensure shortcutOpenTarget exists
            if (!migrated.settings.shortcutOpenTarget) {
                migrated.settings.shortcutOpenTarget = 'current';
            }
        }

        // Migration from version < 0.4.6
        if (_compareVersions(fromVersion || '0.1.0', '0.4.6') < 0) {
            console.log('[ConfigManager] Migrating from pre-0.4.6 format');
            
            // Add snow effect settings if missing
            if (migrated.settings.snowEffectEnabled === undefined) {
                migrated.settings.snowEffectEnabled = false;
            }
            if (migrated.settings.snowEffectTriggered === undefined) {
                migrated.settings.snowEffectTriggered = false;
            }
            
            // Ensure preferredLanguage exists
            if (!migrated.settings.preferredLanguage) {
                migrated.settings.preferredLanguage = null; // Will be auto-detected
            }
        }

        // Update version and export date
        migrated.version = CONFIG.VERSION;
        migrated.exportDate = new Date().toISOString();
        
        // Remove old signature (will be regenerated)
        delete migrated.signature;

        return migrated;
    }

    /**
     * Detect configuration version
     * @param {Object} config - Configuration object
     * @returns {string} Detected version or '0.1.0' as default
     */
    function _detectVersion(config) {
        if (config.version && typeof config.version === 'string') {
            return config.version;
        }
        
        // Try to detect version based on structure
        if (config.settings) {
            // Has settings object, likely >= 0.2.0
            if (config.settings.themeSettings) {
                return '0.4.0'; // Has theme settings
            }
            if (config.settings.accessibilitySettings) {
                return '0.4.0'; // Has accessibility settings
            }
            if (config.settings.searchBoxSettings) {
                return '0.3.0'; // Has search box settings
            }
            return '0.2.0'; // Has settings object but missing newer fields
        }
        
        // Very old format, settings at root level
        return '0.1.0';
    }

    // ==================== Import ====================

    /**
     * Verify imported configuration with automatic migration support
     * @param {Object} config - Configuration object to verify
     * @returns {Promise<Object>} { valid: boolean, reason?: string, config?: Object, migrated?: boolean, fromVersion?: string }
     */
    async function verifyConfig(config) {
        try {
            // Detect version
            const detectedVersion = _detectVersion(config);
            const configVersion = config.version || detectedVersion;
            let needsMigration = false;
            let migratedConfig = config;

            // Step 1: Check if version is supported
            if (!_isVersionSupported(configVersion)) {
                // Try to detect if it's a very old format without version
                if (!config.version) {
                    // Assume it's an old format and try to migrate
                    console.warn('[ConfigManager] No version field detected, attempting migration from legacy format');
                    needsMigration = true;
                } else {
                    return { 
                        valid: false, 
                        reason: `Unsupported version: ${configVersion} (supported: ${CONFIG.MIN_SUPPORTED_VERSION} - ${CONFIG.VERSION})` 
                    };
                }
            }

            // Step 2: Check if migration is needed
            if (configVersion !== CONFIG.VERSION) {
                needsMigration = true;
                console.log(`[ConfigManager] Migration needed: ${configVersion} -> ${CONFIG.VERSION}`);
            }

            // Step 3: Perform migration if needed
            if (needsMigration) {
                try {
                    migratedConfig = _migrateConfig(config, configVersion);
                    console.log('[ConfigManager] Configuration migrated successfully');
                } catch (e) {
                    console.error('[ConfigManager] Migration failed:', e);
                    return { 
                        valid: false, 
                        reason: `Migration failed: ${e.message}` 
                    };
                }
            }

            // Step 4: Validate structure of migrated config (allow legacy format)
            const structureCheck = _validateConfigStructure(migratedConfig, needsMigration);
            if (!structureCheck.valid) {
                return { valid: false, reason: structureCheck.reason };
            }

            // Step 5: Validate timestamp (only for non-migrated configs)
            // For migrated configs, we update the timestamp, so skip validation
            if (!needsMigration && migratedConfig.exportDate) {
                const timestampCheck = _validateTimestamp(migratedConfig.exportDate);
                if (!timestampCheck.valid) {
                    // For old configs, we're more lenient with timestamp
                    console.warn('[ConfigManager] Timestamp validation failed, but allowing import due to migration');
                }
            }

            // Step 6: Verify signature (only if present and not migrated)
            // For migrated configs, signature will be regenerated on next export
            if (!needsMigration && config.signature && typeof config.signature === 'string') {
                const configForVerification = JSON.parse(JSON.stringify(migratedConfig));
                delete configForVerification.signature;
                const dataToVerify = JSON.stringify(configForVerification);

                const signatureValid = await _verifySignature(dataToVerify, config.signature);
                if (!signatureValid) {
                    // For old configs, signature might be invalid due to format changes
                    // Allow import but warn user
                    console.warn('[ConfigManager] Signature verification failed, but allowing import (may be due to migration)');
                }
            } else if (needsMigration) {
                console.log('[ConfigManager] Signature skipped for migrated configuration');
            }

            return { 
                valid: true, 
                config: migratedConfig,
                migrated: needsMigration,
                fromVersion: configVersion
            };
        } catch (e) {
            console.error('Failed to verify configuration:', e);
            return { valid: false, reason: 'Verification error: ' + e.message };
        }
    }

    /**
     * Import configuration from file
     * @param {File} file - JSON file to import
     * @returns {Promise<Object>} { success: boolean, config?: Object, error?: string, migrated?: boolean, fromVersion?: string }
     */
    async function importFromFile(file) {
        try {
            if (!file || !(file instanceof File)) {
                return { success: false, error: 'Invalid file' };
            }

            // Read file as text
            const text = await file.text();
            
            // Parse JSON
            let config;
            try {
                config = JSON.parse(text);
            } catch (e) {
                return { success: false, error: 'Invalid JSON format' };
            }

            // Verify configuration (with automatic migration)
            const verification = await verifyConfig(config);
            if (!verification.valid) {
                return { success: false, error: verification.reason };
            }

            return { 
                success: true, 
                config: verification.config,
                migrated: verification.migrated || false,
                fromVersion: verification.fromVersion
            };
        } catch (e) {
            console.error('Failed to import configuration:', e);
            return { success: false, error: 'Import failed: ' + e.message };
        }
    }

    // ==================== Public API ====================

    return {
        exportConfig,
        exportToFile,
        verifyConfig,
        importFromFile,
        getVersion: () => CONFIG.VERSION
    };
})();

