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
        COLORS: [
            { name: 'yellow', bg: '#fef3c7', border: '#f59e0b', text: '#78350f' },
            { name: 'pink',   bg: '#fce7f3', border: '#ec4899', text: '#831843' },
            { name: 'blue',   bg: '#dbeafe', border: '#3b82f6', text: '#1e3a8a' },
            { name: 'green',  bg: '#dcfce7', border: '#22c55e', text: '#14532d' },
            { name: 'purple', bg: '#f3e8ff', border: '#a855f7', text: '#581c87' },
        ],
        Z_INDEX_BASE: 50,
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
        startX: 0,
        startY: 0,
        initialLeft: 0,
        initialTop: 0,
    };

    // ==================== Storage ====================

    function _loadSettings() {
        try {
            const raw = localStorage.getItem(CONFIG.SETTINGS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed.enabled === 'boolean') {
                    _state.settings.enabled = parsed.enabled;
                }
            }
        } catch (e) {
            console.warn('[StickyNotes] Failed to load settings:', e);
        }
    }

    function _saveSettings() {
        try {
            localStorage.setItem(CONFIG.SETTINGS_KEY, JSON.stringify(_state.settings));
        } catch (e) {
            console.warn('[StickyNotes] Failed to save settings:', e);
        }
    }

    function _loadNotes() {
        try {
            const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                if (Array.isArray(data.notes)) {
                    _state.notes = data.notes;
                    _state.maxId = data.maxId || 0;
                    _state.nextZIndex = data.nextZIndex || CONFIG.Z_INDEX_BASE;
                }
            }
        } catch (e) {
            console.warn('[StickyNotes] Failed to load notes:', e);
            _state.notes = [];
        }
    }

    function _saveNotes() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
                notes: _state.notes,
                maxId: _state.maxId,
                nextZIndex: _state.nextZIndex,
            }));
        } catch (e) {
            console.warn('[StickyNotes] Failed to save notes:', e);
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

        el.appendChild(header);

        // Content area (click to edit)
        const content = document.createElement('div');
        content.className = 'sticky-note-content';
        content.contentEditable = 'true';
        content.setAttribute('role', 'textbox');
        content.setAttribute('aria-multiline', 'true');
        content.setAttribute('data-placeholder', _getLocalizedMessage('stickyNotePlaceholder', 'Type here...'));
        content.textContent = note.content || '';

        // Save content on blur
        content.addEventListener('blur', function() {
            _updateNoteContent(note.id, content.textContent);
        });

        // Stop propagation on mousedown inside content so it doesn't trigger drag
        content.addEventListener('mousedown', function(e) {
            e.stopPropagation();
        });

        // Handle Enter key to insert line break instead of submitting
        content.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                // Allow default behavior (insert <br> or <div>)
                // No special handling needed for contenteditable
            }
        });

        el.appendChild(content);

        // Drag: only on the note background, not on content or header buttons
        el.addEventListener('mousedown', function(e) {
            if (e.target === content || e.target.closest('.sticky-note-header')) return;
            _startDrag(e, note.id);
        });

        // Bring to front on any click
        el.addEventListener('mousedown', function() {
            _bringToFront(note.id);
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
        x = Math.min(x, vpW - defW - 20);
        y = Math.min(y, vpH - defH - 20);

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
            note.content = content;
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

    function _startDrag(e, noteId) {
        if (e.button !== 0) return;

        var note = _state.notes.find(function(n) { return n.id === noteId; });
        if (!note) return;

        _dragState = {
            active: true,
            noteId: noteId,
            startX: e.clientX,
            startY: e.clientY,
            initialLeft: note.x,
            initialTop: note.y,
        };

        var el = _elements.container.querySelector('.sticky-note[data-id="' + noteId + '"]');
        if (el) el.classList.add('dragging');

        document.addEventListener('mousemove', _onDragMove);
        document.addEventListener('mouseup', _onDragEnd);
    }

    function _onDragMove(e) {
        if (!_dragState.active) return;

        var dx = e.clientX - _dragState.startX;
        var dy = e.clientY - _dragState.startY;

        var note = _state.notes.find(function(n) { return n.id === _dragState.noteId; });
        if (!note) return;

        note.x = Math.max(0, Math.round(_dragState.initialLeft + dx));
        note.y = Math.max(0, Math.round(_dragState.initialTop + dy));

        var el = _elements.container.querySelector('.sticky-note[data-id="' + _dragState.noteId + '"]');
        if (el) {
            el.style.left = note.x + 'px';
            el.style.top = note.y + 'px';
        }
    }

    function _onDragEnd() {
        if (!_dragState.active) return;

        var el = _elements.container.querySelector('.sticky-note[data-id="' + _dragState.noteId + '"]');
        if (el) el.classList.remove('dragging');

        _saveNotes();

        _dragState.active = false;
        _dragState.noteId = null;

        document.removeEventListener('mousemove', _onDragMove);
        document.removeEventListener('mouseup', _onDragEnd);
    }

    // ==================== Public API ====================

    function init() {
        if (_state.isInitialized) return;
        _state.isInitialized = true;

        _loadSettings();
        _loadNotes();

        _elements.container = document.createElement('div');
        _elements.container.id = 'sticky-notes-container';
        _elements.container.setAttribute('aria-label', _getLocalizedMessage('stickyNotes', 'Sticky notes'));
        document.body.appendChild(_elements.container);

        _renderNotes();
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
