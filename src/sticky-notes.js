/**
 * Sticky Notes Module
 * True sticky note experience: click to edit, drag anywhere on the page.
 */
const StickyNotes = (function() {
    'use strict';

    const CONFIG = {
        STORAGE_KEY: 'stickyNotes',
        SETTINGS_KEY: 'stickyNotesSettings',
        DEFAULT_WIDTH: 200,
        DEFAULT_HEIGHT: 200,
        MIN_WIDTH: 140,
        MIN_HEIGHT: 100,
        MAX_WIDTH: 360,
        MAX_HEIGHT: 360,
        MAX_NOTES: 100,
        MAX_NOTE_ID: 1000000000,
        MAX_CONTENT_LENGTH: 20000,
        COLORS: [
            { name: 'yellow', bg: '#fef3c7', border: '#f59e0b', text: '#78350f' },
            { name: 'pink',   bg: '#fce7f3', border: '#ec4899', text: '#831843' },
            { name: 'blue',   bg: '#dbeafe', border: '#3b82f6', text: '#1e3a8a' },
            { name: 'green',  bg: '#dcfce7', border: '#22c55e', text: '#14532d' },
            { name: 'purple', bg: '#f3e8ff', border: '#a855f7', text: '#581c87' },
        ],
        Z_INDEX_BASE: 50,
        DEFAULT_FONT: {
            size: 14,
            weight: 'normal',
            style: 'normal',
            letterSpacing: 0,
            lineHeight: 1.5,
        },
    };

    let _state = {
        notes: [],
        isInitialized: false,
        nextZIndex: CONFIG.Z_INDEX_BASE,
        maxId: 0,
        settings: { enabled: true },
    };

    let _elements = {
        container: null,
    };

    let _dragState = {
        active: false,
        noteId: null,
        pointerId: null,
        noteEl: null,
        startX: 0,
        startY: 0,
        initialLeft: 0,
        initialTop: 0,
        hasMoved: false,
        dragThreshold: 5,
        contentEl: null,
        wasContentEditable: false,
    };

    // ==================== Context Menu ====================

    let _contextMenuState = {
        menu: null,
        noteId: null,
    };

    function _closeContextMenu() {
        if (_contextMenuState.menu) {
            _contextMenuState.menu.remove();
            _contextMenuState.menu = null;
            _contextMenuState.noteId = null;
        }
        document.removeEventListener('click', _onDocumentClickCloseMenu);
        document.removeEventListener('keydown', _onEscapeCloseMenu);
    }

    function _onDocumentClickCloseMenu(e) {
        if (_contextMenuState.menu && !_contextMenuState.menu.contains(e.target)) {
            _closeContextMenu();
        }
    }

    function _onEscapeCloseMenu(e) {
        if (e.key === 'Escape') {
            _closeContextMenu();
        }
    }

    function _createContextMenuItem(label, onClick, options) {
        options = options || {};
        var item = document.createElement('div');
        item.className = 'sn-context-menu-item';
        if (options.danger) item.classList.add('danger');
        if (options.separator) {
            item.className = 'sn-context-menu-separator';
            return item;
        }

        item.textContent = label;
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            onClick();
            _closeContextMenu();
        });
        return item;
    }

    function _createColorOption(color, isActive, onClick) {
        var dot = document.createElement('span');
        dot.className = 'sn-context-color-dot';
        if (isActive) dot.classList.add('active');
        dot.style.backgroundColor = color.bg;
        dot.style.borderColor = color.border;
        dot.title = color.name;
        dot.addEventListener('click', function(e) {
            e.stopPropagation();
            onClick(color);
            _closeContextMenu();
        });
        return dot;
    }

    function _showContextMenu(x, y, items) {
        _closeContextMenu();

        var menu = document.createElement('div');
        menu.className = 'sn-context-menu';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';

        items.forEach(function(item) {
            menu.appendChild(item);
        });

        document.body.appendChild(menu);
        _contextMenuState.menu = menu;

        // Adjust position to keep menu within viewport
        var rect = menu.getBoundingClientRect();
        var vpW = window.innerWidth;
        var vpH = window.innerHeight;

        if (rect.right > vpW) {
            menu.style.left = (x - rect.width) + 'px';
        }
        if (rect.bottom > vpH) {
            menu.style.top = (y - rect.height) + 'px';
        }

        document.addEventListener('click', _onDocumentClickCloseMenu);
        document.addEventListener('keydown', _onEscapeCloseMenu);
    }

    function _onContainerContextMenu(e) {
        if (!_state.settings.enabled) return;

        var noteEl = e.target.closest('.sticky-note');
        if (noteEl) {
            // Right-click on a sticky note
            e.preventDefault();
            var noteId = parseInt(noteEl.dataset.id, 10);
            var note = _state.notes.find(function(n) { return n.id === noteId; });
            if (!note) return;

            var currentColor = note.color || CONFIG.COLORS[0];
            var items = [];

            // Delete Note
            items.push(_createContextMenuItem(
                _getLocalizedMessage('deleteStickyNote', 'Delete Note'),
                function() { _deleteNote(noteId); },
                { danger: true }
            ));

            // Separator
            items.push(_createContextMenuItem(null, null, { separator: true }));

            // Color options row
            var colorRow = document.createElement('div');
            colorRow.className = 'sn-context-menu-colors';
            CONFIG.COLORS.forEach(function(c) {
                var isActive = currentColor.bg === c.bg;
                colorRow.appendChild(_createColorOption(c, isActive, function(color) {
                    _changeNoteColor(noteId, color);
                }));
            });
            items.push(colorRow);

            // Separator
            items.push(_createContextMenuItem(null, null, { separator: true }));

            // Font Settings
            items.push(_createContextMenuItem(
                _getLocalizedMessage('stickyNoteFontSettings', 'Font Settings'),
                function() {
                    var note = _state.notes.find(function(n) { return n.id === noteId; });
                    if (note) {
                        var el = _elements.container.querySelector('.sticky-note[data-id="' + noteId + '"]');
                        if (el) _showFontPanel(note, el);
                    }
                }
            ));

            // Separator
            items.push(_createContextMenuItem(null, null, { separator: true }));

            // Bring to Front
            items.push(_createContextMenuItem(
                _getLocalizedMessage('bringToFront', 'Bring to Front'),
                function() { _bringToFront(noteId); }
            ));

            _showContextMenu(e.clientX, e.clientY, items);
            _contextMenuState.noteId = noteId;
        } else {
            // Right-click on empty area inside container
            e.preventDefault();
            var items = [];
            items.push(_createContextMenuItem(
                _getLocalizedMessage('addStickyNote', 'Create Note'),
                function() { _createNote(); }
            ));
            _showContextMenu(e.clientX, e.clientY, items);
        }
    }

    // ==================== IndexedDB Storage ====================

    const DB_NAME = 'GenresFoxStickyNotesDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'notesData';

    let _db = null;

    function _openDB() {
        return new Promise(function(resolve, reject) {
            var request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = function() {
                reject(request.error);
            };
            request.onsuccess = function() {
                _db = request.result;
                resolve(_db);
            };
            request.onupgradeneeded = function(event) {
                var db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
        });
    }

    function _runDBRequest(mode, createRequest) {
        return new Promise(function(resolve, reject) {
            if (!_db) {
                reject(new Error('Sticky notes database is unavailable'));
                return;
            }

            var settled = false;
            var result;
            var finish = function(callback, value) {
                if (settled) return;
                settled = true;
                callback(value);
            };

            try {
                var tx = _db.transaction([STORE_NAME], mode);
                var req = createRequest(tx.objectStore(STORE_NAME));
                req.onsuccess = function() { result = req.result; };
                req.onerror = function() {
                    finish(reject, req.error || tx.error || new Error('Sticky notes request failed'));
                };
                tx.oncomplete = function() { finish(resolve, result); };
                tx.onerror = function() {
                    finish(reject, tx.error || new Error('Sticky notes transaction failed'));
                };
                tx.onabort = function() {
                    finish(reject, tx.error || new Error('Sticky notes transaction aborted'));
                };
            } catch (e) {
                finish(reject, e);
            }
        });
    }

    function _dbGet(key) {
        return _runDBRequest('readonly', function(store) { return store.get(key); });
    }

    function _dbSet(key, value) {
        return _runDBRequest('readwrite', function(store) { return store.put(value, key); });
    }

    function _dbDelete(key) {
        return _runDBRequest('readwrite', function(store) { return store.delete(key); });
    }

    // Migrate legacy localStorage data to IndexedDB
    async function _migrateFromLocalStorage() {
        var rawNotes = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (rawNotes) {
            try {
                var data = JSON.parse(rawNotes);
                if (!Array.isArray(data.notes)) throw new Error('Invalid legacy note data');
                var usedIds = new Set();
                var normalizedNotes = [];
                data.notes.slice(0, CONFIG.MAX_NOTES).forEach(function(rawNote, index) {
                    var normalized = _normalizeNote(rawNote, index, usedIds);
                    if (normalized) normalizedNotes.push(normalized);
                });
                await _dbSet('data', {
                    notes: normalizedNotes,
                    maxId: normalizedNotes.reduce(function(max, note) { return Math.max(max, note.id); }, 0),
                    nextZIndex: normalizedNotes.reduce(function(max, note) { return Math.max(max, note.zIndex); }, CONFIG.Z_INDEX_BASE),
                });
                localStorage.removeItem(CONFIG.STORAGE_KEY);
                console.log('[StickyNotes] Migrated notes from localStorage to IndexedDB');
            } catch (e) {
                console.warn('[StickyNotes] Note migration from localStorage failed:', e);
            }
        }

        var rawSettings = localStorage.getItem(CONFIG.SETTINGS_KEY);
        if (rawSettings) {
            try {
                var settings = JSON.parse(rawSettings);
                if (!settings || typeof settings.enabled !== 'boolean') throw new Error('Invalid legacy note settings');
                await _dbSet('settings', { enabled: settings.enabled });
                localStorage.removeItem(CONFIG.SETTINGS_KEY);
                console.log('[StickyNotes] Migrated settings from localStorage to IndexedDB');
            } catch (e) {
                console.warn('[StickyNotes] Settings migration from localStorage failed:', e);
            }
        }
    }

    function _normalizeNote(rawNote, index, usedIds) {
        if (!rawNote || typeof rawNote !== 'object' || Array.isArray(rawNote)) return null;

        var idValue = Number(rawNote.id);
        var id = Number.isFinite(idValue) ? Math.floor(idValue) : 0;
        if (id > CONFIG.MAX_NOTE_ID) id = 0;
        if (id <= 0 || usedIds.has(id)) {
            id = index + 1;
            while (usedIds.has(id)) id++;
        }
        usedIds.add(id);

        var numberInRange = function(value, fallback, min, max) {
            var number = Number(value);
            if (!Number.isFinite(number)) return fallback;
            return Math.min(max, Math.max(min, number));
        };
        var rawColor = rawNote.color && typeof rawNote.color === 'object' ? rawNote.color : null;
        var color = CONFIG.COLORS.find(function(candidate) {
            return rawColor && candidate.bg === rawColor.bg;
        }) || CONFIG.COLORS[0];
        var rawFont = rawNote.font && typeof rawNote.font === 'object' ? rawNote.font : {};

        return {
            id: id,
            x: Math.round(numberInRange(rawNote.x, 20, 0, 10000)),
            y: Math.round(numberInRange(rawNote.y, 20, 0, 10000)),
            zIndex: Math.round(numberInRange(rawNote.zIndex, CONFIG.Z_INDEX_BASE, CONFIG.Z_INDEX_BASE, 1000000)),
            content: typeof rawNote.content === 'string' ? rawNote.content.slice(0, CONFIG.MAX_CONTENT_LENGTH) : '',
            color: color,
            width: Math.round(numberInRange(rawNote.width, CONFIG.DEFAULT_WIDTH, CONFIG.MIN_WIDTH, CONFIG.MAX_WIDTH)),
            height: Math.round(numberInRange(rawNote.height, CONFIG.DEFAULT_HEIGHT, CONFIG.MIN_HEIGHT, CONFIG.MAX_HEIGHT)),
            rotation: numberInRange(rawNote.rotation, 0, -5, 5),
            createdAt: Number.isFinite(Number(rawNote.createdAt)) ? Number(rawNote.createdAt) : Date.now(),
            font: {
                size: Math.round(numberInRange(rawFont.size, CONFIG.DEFAULT_FONT.size, 12, 24)),
                weight: rawFont.weight === 'bold' ? 'bold' : 'normal',
                style: rawFont.style === 'italic' ? 'italic' : 'normal',
                letterSpacing: numberInRange(rawFont.letterSpacing, CONFIG.DEFAULT_FONT.letterSpacing, -1, 3),
                lineHeight: numberInRange(rawFont.lineHeight, CONFIG.DEFAULT_FONT.lineHeight, 1, 2.5),
            },
        };
    }

    async function _loadSettings() {
        try {
            var settings = await _dbGet('settings');
            if (settings && typeof settings.enabled === 'boolean') {
                _state.settings.enabled = settings.enabled;
            }
        } catch (e) {
            console.warn('[StickyNotes] Failed to load settings from IndexedDB:', e);
        }
    }

    async function _saveSettings() {
        try {
            await _dbSet('settings', _state.settings);
        } catch (e) {
            console.warn('[StickyNotes] Failed to save settings to IndexedDB:', e);
        }
    }

    async function _loadNotes() {
        try {
            var data = await _dbGet('data');
            if (data && Array.isArray(data.notes)) {
                var usedIds = new Set();
                var normalizedNotes = [];
                data.notes.slice(0, CONFIG.MAX_NOTES).forEach(function(rawNote, index) {
                    var normalized = _normalizeNote(rawNote, index, usedIds);
                    if (normalized) normalizedNotes.push(normalized);
                });
                _state.notes = normalizedNotes;
                var storedMaxId = Number(data.maxId);
                if (!Number.isFinite(storedMaxId)) storedMaxId = 0;
                _state.maxId = Math.min(CONFIG.MAX_NOTE_ID, Math.max(
                    0,
                    Math.floor(storedMaxId),
                    normalizedNotes.reduce(function(max, note) { return Math.max(max, note.id); }, 0)
                ));
                _state.nextZIndex = Math.max(
                    CONFIG.Z_INDEX_BASE,
                    Number.isFinite(Number(data.nextZIndex)) ? Math.floor(Number(data.nextZIndex)) : CONFIG.Z_INDEX_BASE,
                    normalizedNotes.reduce(function(max, note) { return Math.max(max, note.zIndex); }, CONFIG.Z_INDEX_BASE)
                );
                await _dbSet('data', {
                    notes: _state.notes,
                    maxId: _state.maxId,
                    nextZIndex: _state.nextZIndex,
                });
            }
        } catch (e) {
            console.warn('[StickyNotes] Failed to load notes from IndexedDB:', e);
            _state.notes = [];
        }
    }

    async function _saveNotes() {
        try {
            await _dbSet('data', {
                notes: _state.notes,
                maxId: _state.maxId,
                nextZIndex: _state.nextZIndex,
            });
        } catch (e) {
            console.warn('[StickyNotes] Failed to save notes to IndexedDB:', e);
        }
    }

    // ==================== Helpers ====================

    function _getLocalizedMessage(key, fallback) {
        if (typeof I18n !== 'undefined' && I18n.getMessage) {
            const msg = I18n.getMessage(key);
            if (msg && msg !== key) return msg;
        }
        return fallback || key;
    }

    // ==================== DOM Creation ====================

    function _createNoteElement(note) {
        const el = document.createElement('div');
        el.className = 'sticky-note';
        el.dataset.id = note.id;
        el.style.left = note.x + 'px';
        el.style.top = note.y + 'px';
        el.style.width = (note.width || CONFIG.DEFAULT_WIDTH) + 'px';
        el.style.height = (note.height || CONFIG.DEFAULT_HEIGHT) + 'px';
        el.style.zIndex = note.zIndex;

        const color = note.color || CONFIG.COLORS[0];
        el.style.setProperty('--sn-bg', color.bg);
        el.style.setProperty('--sn-border', color.border);
        el.style.setProperty('--sn-text', color.text);

        // Slight random rotation for realism (-1.5 to +1.5 deg)
        if (note.rotation !== undefined) {
            el.style.transform = 'rotate(' + note.rotation + 'deg)';
        }

        // Header / drag handle
        const header = document.createElement('div');
        header.className = 'sticky-note-header';

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'sticky-note-delete';
        deleteBtn.setAttribute('aria-label', _getLocalizedMessage('deleteStickyNote', 'Delete note'));
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            _deleteNote(note.id);
        });
        header.appendChild(deleteBtn);

        // Color picker dots
        const colorPicker = document.createElement('div');
        colorPicker.className = 'sticky-note-colors';
        CONFIG.COLORS.forEach(function(c) {
            const dot = document.createElement('span');
            dot.className = 'sticky-note-color-dot';
            if (color.bg === c.bg) dot.classList.add('active');
            dot.style.backgroundColor = c.bg;
            dot.style.borderColor = c.border;
            dot.addEventListener('click', function(e) {
                e.stopPropagation();
                _changeNoteColor(note.id, c);
            });
            colorPicker.appendChild(dot);
        });
        header.appendChild(colorPicker);

        // Font settings button
        const fontBtn = document.createElement('button');
        fontBtn.className = 'sticky-note-font-btn';
        fontBtn.setAttribute('aria-label', _getLocalizedMessage('stickyNoteFontSettings', 'Font settings'));
        fontBtn.textContent = 'Aa';
        fontBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            _showFontPanel(note, el);
        });
        header.appendChild(fontBtn);

        el.appendChild(header);

        // Content area (click to edit)
        const content = document.createElement('div');
        content.className = 'sticky-note-content';
        content.contentEditable = 'true';
        content.setAttribute('role', 'textbox');
        content.setAttribute('aria-multiline', 'true');
        content.setAttribute('data-placeholder', _getLocalizedMessage('stickyNotePlaceholder', 'Type here...'));
        content.textContent = note.content || '';

        // Apply font styles
        _applyFontStyles(content, note.font || CONFIG.DEFAULT_FONT);

        // Save content on blur
        content.addEventListener('blur', function() {
            _updateNoteContent(note.id, content.textContent);
        });

        // Handle Enter key to insert line break instead of submitting
        content.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                // Allow default behavior (insert <br> or <div>)
                // No special handling needed for contenteditable
            }
        });

        el.appendChild(content);

        el.addEventListener('pointerdown', function(e) {
            if (e.button !== 0) return;
            if (!e.isPrimary) return;
            if (e.target.closest('button, .sticky-note-color-dot')) return;
            _bringToFront(note.id);
            _startDrag(
                e,
                note.id,
                e.target.closest('.sticky-note-content') ? content : null,
                el
            );
        });

        return el;
    }

    function _renderNotes() {
        if (!_elements.container) return;
        _elements.container.innerHTML = '';

        if (!_state.settings.enabled) {
            _elements.container.classList.add('is-hidden');
            return;
        }
        _elements.container.classList.remove('is-hidden');

        _state.notes.forEach(function(note) {
            const el = _createNoteElement(note);
            _elements.container.appendChild(el);
        });
    }

    // ==================== Note Operations ====================

    function _createNote() {
        if (_state.notes.length >= CONFIG.MAX_NOTES) return null;

        var id = ++_state.maxId;
        var colorIndex = Math.floor(Math.random() * CONFIG.COLORS.length);
        var color = CONFIG.COLORS[colorIndex];

        // Position: default center-ish with slight random offset
        var vpW = window.innerWidth;
        var vpH = window.innerHeight;
        var defW = CONFIG.DEFAULT_WIDTH;
        var defH = CONFIG.DEFAULT_HEIGHT;

        var x = Math.max(20, (vpW - defW) / 2 + (Math.random() - 0.5) * 120);
        var y = Math.max(20, (vpH - defH) / 2 + (Math.random() - 0.5) * 80);

        // Clamp to viewport
        x = Math.max(0, Math.min(x, Math.max(0, vpW - defW - 20)));
        y = Math.max(0, Math.min(y, Math.max(0, vpH - defH - 20)));

        var note = {
            id: id,
            x: Math.round(x),
            y: Math.round(y),
            zIndex: ++_state.nextZIndex,
            content: '',
            color: color,
            width: defW,
            height: defH,
            rotation: (Math.random() - 0.5) * 3, // -1.5 to +1.5 deg
            createdAt: Date.now(),
            font: Object.assign({}, CONFIG.DEFAULT_FONT),
        };

        _state.notes.push(note);
        _saveNotes();
        _renderNotes();

        // Auto-focus the new note content
        setTimeout(function() {
            var el = _elements.container.querySelector('.sticky-note[data-id="' + id + '"] .sticky-note-content');
            if (el) el.focus();
        }, 60);

        return note;
    }

    function _deleteNote(id) {
        _state.notes = _state.notes.filter(function(n) { return n.id !== id; });
        _saveNotes();
        _renderNotes();
    }

    function _updateNoteContent(id, content) {
        var note = _state.notes.find(function(n) { return n.id === id; });
        if (note) {
            note.content = typeof content === 'string' ? content.slice(0, CONFIG.MAX_CONTENT_LENGTH) : '';
            _saveNotes();
        }
    }

    function _changeNoteColor(id, color) {
        var note = _state.notes.find(function(n) { return n.id === id; });
        if (note) {
            note.color = color;
            _saveNotes();
            _renderNotes();
        }
    }

    function _applyFontStyles(contentEl, font) {
        var f = font || CONFIG.DEFAULT_FONT;
        contentEl.style.fontSize = (f.size || 14) + 'px';
        contentEl.style.fontWeight = f.weight || 'normal';
        contentEl.style.fontStyle = f.style || 'normal';
        contentEl.style.letterSpacing = (f.letterSpacing || 0) + 'px';
        contentEl.style.lineHeight = (f.lineHeight || 1.5).toString();
    }

    function _updateNoteFont(id, patch) {
        var note = _state.notes.find(function(n) { return n.id === id; });
        if (!note) return;
        if (!note.font) note.font = Object.assign({}, CONFIG.DEFAULT_FONT);
        Object.assign(note.font, patch);
        _saveNotes();
        _renderNotes();
    }

    let _fontPanel = null;
    let _fontPanelNoteId = null;

    function _closeFontPanel() {
        if (_fontPanel) {
            _fontPanel.remove();
            _fontPanel = null;
            _fontPanelNoteId = null;
        }
        document.removeEventListener('click', _onDocumentClickCloseFontPanel);
        document.removeEventListener('keydown', _onEscapeCloseFontPanel);
    }

    function _onDocumentClickCloseFontPanel(e) {
        if (_fontPanel && !_fontPanel.contains(e.target)) {
            _closeFontPanel();
        }
    }

    function _onEscapeCloseFontPanel(e) {
        if (e.key === 'Escape') {
            _closeFontPanel();
        }
    }

    function _createFontControlRow(label, control) {
        var row = document.createElement('div');
        row.className = 'sn-font-row';
        var lbl = document.createElement('span');
        lbl.className = 'sn-font-label';
        lbl.textContent = label;
        row.appendChild(lbl);
        row.appendChild(control);
        return row;
    }

    function _showFontPanel(note, targetEl) {
        _closeFontPanel();
        _fontPanelNoteId = note.id;

        var panel = document.createElement('div');
        panel.className = 'sn-font-panel';

        if (!note.font) note.font = Object.assign({}, CONFIG.DEFAULT_FONT);
        var font = note.font;

        // Size
        var sizeInput = document.createElement('input');
        sizeInput.type = 'range';
        sizeInput.min = '12';
        sizeInput.max = '24';
        sizeInput.step = '1';
        sizeInput.value = font.size || 14;
        sizeInput.addEventListener('input', function() {
            _updateNoteFont(note.id, { size: parseInt(sizeInput.value, 10) });
        });
        panel.appendChild(_createFontControlRow(
            _getLocalizedMessage('stickyNoteFontSize', 'Size'),
            sizeInput
        ));

        // Style toggles
        var toggleRow = document.createElement('div');
        toggleRow.className = 'sn-font-row sn-font-toggles';

        var boldBtn = document.createElement('button');
        boldBtn.className = 'sn-font-toggle';
        boldBtn.textContent = 'B';
        if (font.weight === 'bold') boldBtn.classList.add('active');
        boldBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var isBold = font.weight === 'bold';
            _updateNoteFont(note.id, { weight: isBold ? 'normal' : 'bold' });
        });
        toggleRow.appendChild(boldBtn);

        var italicBtn = document.createElement('button');
        italicBtn.className = 'sn-font-toggle';
        italicBtn.textContent = 'I';
        italicBtn.style.fontStyle = 'italic';
        if (font.style === 'italic') italicBtn.classList.add('active');
        italicBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            var isItalic = font.style === 'italic';
            _updateNoteFont(note.id, { style: isItalic ? 'normal' : 'italic' });
        });
        toggleRow.appendChild(italicBtn);

        panel.appendChild(toggleRow);

        // Letter spacing
        var lsInput = document.createElement('input');
        lsInput.type = 'range';
        lsInput.min = '-1';
        lsInput.max = '3';
        lsInput.step = '0.5';
        lsInput.value = font.letterSpacing || 0;
        lsInput.addEventListener('input', function() {
            _updateNoteFont(note.id, { letterSpacing: parseFloat(lsInput.value) });
        });
        panel.appendChild(_createFontControlRow(
            _getLocalizedMessage('stickyNoteLetterSpacing', 'Spacing'),
            lsInput
        ));

        // Line height
        var lhInput = document.createElement('input');
        lhInput.type = 'range';
        lhInput.min = '1';
        lhInput.max = '2.5';
        lhInput.step = '0.1';
        lhInput.value = font.lineHeight || 1.5;
        lhInput.addEventListener('input', function() {
            _updateNoteFont(note.id, { lineHeight: parseFloat(lhInput.value) });
        });
        panel.appendChild(_createFontControlRow(
            _getLocalizedMessage('stickyNoteLineHeight', 'Line Height'),
            lhInput
        ));

        // Close button
        var closeRow = document.createElement('div');
        closeRow.className = 'sn-font-panel-close';
        var closeBtn = document.createElement('button');
        closeBtn.textContent = _getLocalizedMessage('closeModal', 'Close');
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            _closeFontPanel();
        });
        closeRow.appendChild(closeBtn);
        panel.appendChild(closeRow);

        document.body.appendChild(panel);
        _fontPanel = panel;

        // Position panel near the target element
        var rect = targetEl.getBoundingClientRect();
        var panelRect = panel.getBoundingClientRect();
        var left = rect.left + rect.width / 2 - panelRect.width / 2;
        var top = rect.bottom + 8;
        left = Math.max(8, Math.min(left, window.innerWidth - panelRect.width - 8));
        if (top + panelRect.height > window.innerHeight - 8) {
            top = rect.top - panelRect.height - 8;
        }
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';

        document.addEventListener('click', _onDocumentClickCloseFontPanel);
        document.addEventListener('keydown', _onEscapeCloseFontPanel);
    }

    function _bringToFront(id) {
        var note = _state.notes.find(function(n) { return n.id === id; });
        if (note) {
            note.zIndex = ++_state.nextZIndex;
            _saveNotes();
            var el = _elements.container.querySelector('.sticky-note[data-id="' + id + '"]');
            if (el) el.style.zIndex = note.zIndex;
        }
    }

    // ==================== Drag ====================

    function _startDrag(e, noteId, contentEl, noteEl) {
        if (e.button !== 0) return;
        if (_dragState.active) return;

        var note = _state.notes.find(function(n) { return n.id === noteId; });
        if (!note) return;

        _dragState = {
            active: true,
            noteId: noteId,
            pointerId: e.pointerId,
            noteEl: noteEl || null,
            startX: e.clientX,
            startY: e.clientY,
            initialLeft: note.x,
            initialTop: note.y,
            hasMoved: false,
            dragThreshold: 5,
            contentEl: contentEl || null,
            wasContentEditable: contentEl ? contentEl.isContentEditable : false,
        };

        if (noteEl && noteEl.setPointerCapture) {
            noteEl.setPointerCapture(e.pointerId);
        }

        document.addEventListener('pointermove', _onDragMove, { passive: false });
        document.addEventListener('pointerup', _onDragEnd);
        document.addEventListener('pointercancel', _onDragEnd);
    }

    function _onDragMove(e) {
        if (!_dragState.active) return;
        if (e.pointerId !== _dragState.pointerId) return;

        var dx = e.clientX - _dragState.startX;
        var dy = e.clientY - _dragState.startY;
        var distance = Math.sqrt(dx * dx + dy * dy);

        // Check if we have moved enough to enter drag mode
        if (!_dragState.hasMoved && distance > _dragState.dragThreshold) {
            _dragState.hasMoved = true;
            e.preventDefault();

            // If drag started from contenteditable, blur and disable editing
            if (_dragState.contentEl && _dragState.wasContentEditable) {
                _dragState.contentEl.blur();
                _dragState.contentEl.contentEditable = 'false';
            }

            var el = _dragState.noteEl || _elements.container.querySelector('.sticky-note[data-id="' + _dragState.noteId + '"]');
            if (el) el.classList.add('dragging');
        }

        if (!_dragState.hasMoved) return;

        e.preventDefault();

        var note = _state.notes.find(function(n) { return n.id === _dragState.noteId; });
        if (!note) return;

        var el = _dragState.noteEl || _elements.container.querySelector('.sticky-note[data-id="' + _dragState.noteId + '"]');
        var noteWidth = el ? el.offsetWidth : (note.width || CONFIG.DEFAULT_WIDTH);
        var noteHeight = el ? el.offsetHeight : (note.height || CONFIG.DEFAULT_HEIGHT);
        var maxX = Math.max(0, window.innerWidth - noteWidth);
        var maxY = Math.max(0, window.innerHeight - noteHeight);
        note.x = Math.min(maxX, Math.max(0, Math.round(_dragState.initialLeft + dx)));
        note.y = Math.min(maxY, Math.max(0, Math.round(_dragState.initialTop + dy)));

        if (el) {
            el.style.left = note.x + 'px';
            el.style.top = note.y + 'px';
        }
    }

    function _onDragEnd(e) {
        if (!_dragState.active) return;
        if (e.pointerId !== _dragState.pointerId) return;

        var el = _dragState.noteEl || _elements.container.querySelector('.sticky-note[data-id="' + _dragState.noteId + '"]');
        if (el) el.classList.remove('dragging');

        // If it was a click (no significant movement), focus content if clicked there
        if (!_dragState.hasMoved) {
            if (_dragState.contentEl && _dragState.wasContentEditable) {
                _dragState.contentEl.contentEditable = 'true';
                _dragState.contentEl.focus();
            }
        } else {
            // Drag completed: restore contenteditable and save position
            if (_dragState.contentEl && _dragState.wasContentEditable) {
                _dragState.contentEl.contentEditable = 'true';
            }
            _saveNotes();
        }

        if (el && el.releasePointerCapture && el.hasPointerCapture && el.hasPointerCapture(_dragState.pointerId)) {
            el.releasePointerCapture(_dragState.pointerId);
        }

        _dragState.active = false;
        _dragState.noteId = null;
        _dragState.pointerId = null;
        _dragState.noteEl = null;
        _dragState.contentEl = null;

        document.removeEventListener('pointermove', _onDragMove);
        document.removeEventListener('pointerup', _onDragEnd);
        document.removeEventListener('pointercancel', _onDragEnd);
    }

    // ==================== Public API ====================

    async function init() {
        if (_state.isInitialized) return;
        _state.isInitialized = true;

        try {
            await _openDB();
            await _migrateFromLocalStorage();
            await _loadSettings();
            await _loadNotes();
        } catch (e) {
            console.warn('[StickyNotes] IndexedDB initialization failed, falling back to in-memory only:', e);
        }

        _elements.container = document.createElement('div');
        _elements.container.id = 'sticky-notes-container';
        _elements.container.setAttribute('aria-label', _getLocalizedMessage('stickyNotes', 'Sticky notes'));
        document.body.appendChild(_elements.container);

        _renderNotes();
        _elements.container.addEventListener('contextmenu', _onContainerContextMenu);
    }

    function createNote() {
        if (!_state.settings.enabled) {
            _state.settings.enabled = true;
            _saveSettings();
        }
        return _createNote();
    }

    function getAll() {
        return _state.notes.slice();
    }

    function clearAll() {
        _state.notes = [];
        _saveNotes();
        _renderNotes();
    }

    function isEnabled() {
        return _state.settings.enabled;
    }

    function setEnabled(enabled) {
        _state.settings.enabled = !!enabled;
        _saveSettings();
        _renderNotes();
    }

    return {
        init: init,
        createNote: createNote,
        getAll: getAll,
        clearAll: clearAll,
        isEnabled: isEnabled,
        setEnabled: setEnabled,
    };
})();
