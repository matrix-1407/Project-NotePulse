import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { getDocumentById, getUserDocument, saveDocument, saveDocumentSnapshot, upsertPresence } from '../supabaseClient';
import { useUnsavedWarning } from '../hooks/useUnsavedWarning';
import PresencePanel from './PresencePanel';
import ConnectionStatus from './ConnectionStatus';
import MetadataBar from './MetadataBar';
import HistoryPanel from './HistoryPanel';

export default function Editor({ user, onSignOut }) {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [error, setError] = useState('');
  const [tookTooLong, setTookTooLong] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [provider, setProvider] = useState(null);
  const saveTimeoutRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const initialContentAppliedRef = useRef(false);
  const loadCompletedRef = useRef(false);
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const userColorRef = useRef(null);

  const hashToColor = (input) => {
    if (!input) return '#64748b';
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 70% 45%)`;
  };

  const getWsUrl = () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const url = new URL(backendUrl);
      const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${url.hostname}:1234`;
    } catch {
      return 'ws://localhost:1234';
    }
  };

  // Unsaved changes warning
  useUnsavedWarning(isDirty);

  // Initialize Yjs document (only once)
  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc();
  }

  if (!userColorRef.current) {
    userColorRef.current = hashToColor(user?.id || user?.email || 'anonymous');
  }

  // Define save handlers BEFORE useEditor hook (they are referenced in useEditor config)
  const handleAutoSave = useCallback(
    async (currentEditor) => {
      if (!document || !currentEditor) return;

      setIsSaving(true);
      const content = currentEditor.getJSON();

      const result = await saveDocument(document.id, content);

      if (!result.success) {
        setError('Failed to save document');
        console.error('Save error:', result.error);
      } else {
        setError('');
        setLastSavedAt(new Date());
      }

      setIsSaving(false);
    },
    [document]
  );

  const handleManualSave = async () => {
    if (!editor || !document) return;

    setIsSaving(true);
    const content = editor.getJSON();

    const result = await saveDocument(document.id, content);

    if (result.success) {
      setError('');
      setIsDirty(false);
      setLastSavedAt(new Date());
      setSaveMessage('Saved (manual)');
      
      // Create snapshot for history
      console.log('Creating snapshot for document:', document.id);
      const snapshotResult = await saveDocumentSnapshot(document.id, content, 'manual');
      console.log('Snapshot result:', snapshotResult);

      if (!snapshotResult?.success) {
        setError(snapshotResult?.error || 'Failed to save history snapshot');
      }
      
      setTimeout(() => setSaveMessage(''), 3000);
    } else {
      setError('Failed to save document');
      console.error('Save error:', result.error);
    }

    setIsSaving(false);
  };

  const collaborationCursorExtension = provider
    ? CollaborationCursor.configure({
        provider,
        user: {
          name: user?.email || 'Anonymous',
          color: userColorRef.current,
        },
      })
    : null;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // Disable default history (Yjs handles it)
      }),
      Placeholder.configure({
        placeholder: 'Start typing here...',
      }),
      Collaboration.configure({
        document: ydocRef.current,
      }),
      ...(collaborationCursorExtension ? [collaborationCursorExtension] : []),
    ],
    autofocus: true,
    editorProps: {
      attributes: {
        spellcheck: 'true',
        'aria-label': 'Note editor',
      },
    },
    onUpdate: ({ editor }) => {
      // Mark as dirty when content changes
      setIsDirty(true);
      
      // Debounce auto-save to Supabase as fallback (every 60 seconds)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        handleAutoSave(editor);
      }, 60000); // 60 seconds = 1 minute
    },
  }, [provider, user?.email]);

  // Cleanup on unmount only (do not tie to TipTap editor recreation)
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
    };
  }, []);

  // Load document once editor is ready
  useEffect(() => {
    if (!editor || hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadDocument(editor);

    // Fallback if Supabase request stalls
    const timeoutId = setTimeout(() => {
      if (!loadCompletedRef.current) {
        setTookTooLong(true);
        setLoading(false);
      }
    }, 8000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [editor]);

  // Initialize WebSocket provider AFTER document is loaded
  useEffect(() => {
    if (!user || !document?.id || providerRef.current) return;

    console.log('Initializing WebSocket provider for document:', document.id);
    const wsUrl = getWsUrl();
    providerRef.current = new WebsocketProvider(
      wsUrl,
      `doc-${document.id}`,
      ydocRef.current
    );
    setProvider(providerRef.current);

    // Ensure local awareness state is set for presence UI
    try {
      providerRef.current.awareness?.setLocalStateField('user', {
        id: user.id,
        name: user.email?.split('@')[0] || user.email || 'Anonymous',
        color: userColorRef.current,
      });
    } catch (e) {
      console.warn('Failed to set awareness local state:', e);
    }

    return () => {
      // Don't destroy on unmount, let the cleanup in the load effect handle it
    };
  }, [user, document?.id]);

  // Update presence periodically
  useEffect(() => {
    if (!document?.id) return;

    // Initial presence update
    upsertPresence(document.id, 'online');

    // Update every 15 seconds
    const interval = setInterval(() => {
      upsertPresence(document.id, 'online');
    }, 15000);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      upsertPresence(document.id, 'offline');
    };
  }, [document?.id]);

  // Ctrl+S keyboard shortcut for manual save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, document]);

  // Helper: sanitize content to avoid ProseMirror text selection errors
  const sanitizeContent = (content) => {
    if (!content || !content.type) {
      return { type: 'doc', content: [] };
    }

    // Ensure doc type content has proper structure
    if (content.type === 'doc') {
      const sanitizedChildren = (content.content || []).map((node) => {
        // If node is orderedList/bulletList/etc, ensure it has proper li structure
        if (['orderedList', 'bulletList'].includes(node.type)) {
          return {
            ...node,
            content: (node.content || []).map((li) => {
              if (li.type === 'listItem') {
                return {
                  ...li,
                  content: li.content && li.content.length > 0 ? li.content : [{ type: 'paragraph', content: [] }],
                };
              }
              return li;
            }),
          };
        }
        return node;
      });
      return { type: 'doc', content: sanitizedChildren };
    }

    return content;
  };

  const loadDocument = async (currentEditor) => {
    setLoading(true);
    setError('');
    setTookTooLong(false);
    loadCompletedRef.current = false;

    try {
      const params = new URLSearchParams(window.location.search);
      const docIdFromUrl = params.get('doc');
      const doc = docIdFromUrl
        ? await getDocumentById(docIdFromUrl)
        : await getUserDocument(user?.id);

      if (!doc) {
        setError(docIdFromUrl ? 'Failed to load shared document (permission or missing doc)' : 'Failed to load document');
        setLoading(false);
        return;
      }

      setDocument(doc);

      // Apply initial content once. We do this before WebSocket sync to avoid
      // accidentally showing stale content from a shared/previous Yjs room.
      if (currentEditor && !initialContentAppliedRef.current) {
        const nextContent = doc.content && doc.content.type
          ? sanitizeContent(doc.content)
          : { type: 'doc', content: [] };
        currentEditor.commands.setContent(nextContent);
        initialContentAppliedRef.current = true;
      }
    } catch (err) {
      console.error('Error loading document:', err);
      setError('Failed to load document');
    } finally {
      loadCompletedRef.current = true;
      setLoading(false);
    }
  };

  if (loading || !editor) {
    return (
      <div className="editor-container center">
        <div className="loading-block">
          <p>
            {!editor
              ? 'Initializing editor...'
              : tookTooLong
              ? 'Still trying to load your note...'
              : 'Loading document...'}
          </p>
          {tookTooLong && (
            <button onClick={() => loadDocument(editor)} className="save-btn" disabled={isSaving}>
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="editor-header">
        <div className="editor-title-section">
          <h1>NotePulse Editor</h1>
          <p className="user-info">{user?.email}</p>
        </div>
        <div className="editor-actions">
          <ConnectionStatus provider={provider} />
          <div className="save-status">
            {saveMessage && <span className="save-message">{saveMessage}</span>}
            {error && <span className="error-indicator">{error}</span>}
            {isSaving && <span className="saving-indicator">Saving...</span>}
            {!error && !isSaving && !saveMessage && (
              <span className="saved-indicator">
                {lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString()}` : 'Saved'}
              </span>
            )}
          </div>
          <button onClick={handleManualSave} disabled={isSaving} className="save-btn">
            Save Now
          </button>
          <button
            onClick={async () => {
              if (!document?.id) return;
              const url = new URL(window.location.href);
              url.searchParams.set('doc', document.id);
              try {
                await navigator.clipboard.writeText(url.toString());
                setSaveMessage('Link copied');
                setTimeout(() => setSaveMessage(''), 2000);
              } catch {
                setSaveMessage(url.toString());
                setTimeout(() => setSaveMessage(''), 5000);
              }
            }}
            className="history-btn"
            title="Copy share link"
          >
            Share
          </button>
          <button onClick={() => setShowHistory(!showHistory)} className="history-btn">
            History
          </button>
          <button onClick={onSignOut} className="sign-out-btn">
            Sign Out
          </button>
        </div>
      </div>

      <MetadataBar document={document} />

      <div className="editor-main">
        <div className="editor-workspace">
          <div className="editor-toolbar">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              className={editor.isActive('bold') ? 'is-active' : ''}
              title="Bold (Ctrl+B)"
            >
              <strong>B</strong>
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              className={editor.isActive('italic') ? 'is-active' : ''}
              title="Italic (Ctrl+I)"
            >
              <em>I</em>
            </button>
            <div className="toolbar-divider" />
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
              title="Heading 1"
            >
              H1
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
              title="Heading 2"
            >
              H2
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
              title="Heading 3"
            >
              H3
            </button>
            <div className="toolbar-divider" />
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={editor.isActive('bulletList') ? 'is-active' : ''}
              title="Bullet List"
            >
              • List
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={editor.isActive('orderedList') ? 'is-active' : ''}
              title="Ordered List"
            >
              1. List
            </button>
          </div>

          <EditorContent editor={editor} className="editor-content" />
        </div>

        <PresencePanel provider={provider} documentId={document?.id} />
      </div>

      {showHistory && (
        <HistoryPanel
          documentId={document?.id}
          onClose={() => setShowHistory(false)}
          onLoadSnapshot={(content) => {
            if (editor) {
              let resolved = content;

              // Supabase JSONB should come back as an object, but guard in case it
              // was stored/returned as a string.
              if (typeof resolved === 'string') {
                try {
                  resolved = JSON.parse(resolved);
                } catch {
                  // Keep as string; TipTap will treat it as HTML/text.
                }
              }

              if (resolved && typeof resolved === 'object' && resolved.type) {
                editor.commands.setContent(sanitizeContent(resolved));
              } else {
                editor.commands.setContent(resolved);
              }
              setShowHistory(false);
              setIsDirty(true);
            }
          }}
        />
      )}
    </div>
  );
}
