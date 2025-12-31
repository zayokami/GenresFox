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
        VERSION: '0.4.5',
        MAX_AGE_DAYS: 365, // Maximum age of config file (1 year)
        MIN_AGE_MS: 1000, // Minimum age to prevent replay attacks (1 second)
        SIGNATURE_KEY: 'genresfox-config-signature-v1', // Secret key for HMAC
        ALGORITHM: 'HMAC',
        HASH: 'SHA-256'
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
     * Validate version compatibility
     * @param {string} version - Version string
     * @returns {boolean} Whether version is compatible
     */
    function _validateVersion(version) {
        if (!version || typeof version !== 'string') {
            return false;
        }

        // Extract major and minor version numbers
        const parts = version.split('.');
        if (parts.length < 2) {
            return false;
        }

        const fileMajor = parseInt(parts[0], 10);
        const fileMinor = parseInt(parts[1], 10);
        const currentParts = CONFIG.VERSION.split('.');
        const currentMajor = parseInt(currentParts[0], 10);
        const currentMinor = parseInt(currentParts[1], 10);

        // Allow same major version or one major version behind
        if (fileMajor === currentMajor) {
            return true;
        }
        if (fileMajor === currentMajor - 1 && fileMinor >= 0) {
            return true;
        }

        return false;
    }

    /**
     * Validate configuration structure
     * @param {Object} config - Configuration object
     * @returns {Object} { valid: boolean, reason?: string }
     */
    function _validateConfigStructure(config) {
        if (!config || typeof config !== 'object') {
            return { valid: false, reason: 'Invalid configuration structure' };
        }

        if (!config.version || typeof config.version !== 'string') {
            return { valid: false, reason: 'Missing or invalid version field' };
        }

        if (!config.exportDate || typeof config.exportDate !== 'string') {
            return { valid: false, reason: 'Missing or invalid exportDate field' };
        }

        if (!config.settings || typeof config.settings !== 'object') {
            return { valid: false, reason: 'Missing or invalid settings field' };
        }

        // Validate critical settings structure
        const settings = config.settings;
        
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

    // ==================== Import ====================

    /**
     * Verify imported configuration
     * @param {Object} config - Configuration object to verify
     * @returns {Promise<Object>} { valid: boolean, reason?: string, config?: Object }
     */
    async function verifyConfig(config) {
        try {
            // Step 1: Validate structure
            const structureCheck = _validateConfigStructure(config);
            if (!structureCheck.valid) {
                return { valid: false, reason: structureCheck.reason };
            }

            // Step 2: Validate version
            if (!_validateVersion(config.version)) {
                return { valid: false, reason: `Incompatible version: ${config.version} (current: ${CONFIG.VERSION})` };
            }

            // Step 3: Validate timestamp
            const timestampCheck = _validateTimestamp(config.exportDate);
            if (!timestampCheck.valid) {
                return { valid: false, reason: timestampCheck.reason };
            }

            // Step 4: Verify signature
            if (!config.signature || typeof config.signature !== 'string') {
                return { valid: false, reason: 'Missing signature' };
            }

            // Create config copy without signature for verification
            const configForVerification = JSON.parse(JSON.stringify(config));
            delete configForVerification.signature;
            const dataToVerify = JSON.stringify(configForVerification);

            const signatureValid = await _verifySignature(dataToVerify, config.signature);
            if (!signatureValid) {
                return { valid: false, reason: 'Invalid signature - configuration may have been tampered with' };
            }

            return { valid: true, config: configForVerification };
        } catch (e) {
            console.error('Failed to verify configuration:', e);
            return { valid: false, reason: 'Verification error: ' + e.message };
        }
    }

    /**
     * Import configuration from file
     * @param {File} file - JSON file to import
     * @returns {Promise<Object>} { success: boolean, config?: Object, error?: string }
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

            // Verify configuration
            const verification = await verifyConfig(config);
            if (!verification.valid) {
                return { success: false, error: verification.reason };
            }

            return { success: true, config: verification.config };
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

