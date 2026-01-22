import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { getUserDocument, saveDocument } from '../supabaseClient';

export default function Editor({ user, onSignOut }) {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [error, setError] = useState('');
  const [tookTooLong, setTookTooLong] = useState(false);
  const saveTimeoutRef = useRef(null);
  const hasLoadedRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start typing here...',
      }),
    ],
    content: '<p></p>',
    autofocus: true,
    editorProps: {
      attributes: {
        spellcheck: 'true',
        'aria-label': 'Note editor',
      },
    },
    onUpdate: ({ editor }) => {
      // Debounce auto-save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        handleAutoSave(editor);
      }, 1200);
    },
  });

  // Load document once editor is ready
  useEffect(() => {
    if (!editor || hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadDocument(editor);

    // Fallback if Supabase request stalls
    const timeoutId = setTimeout(() => {
      if (loading) {
        setTookTooLong(true);
        setLoading(false);
      }
    }, 8000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      clearTimeout(timeoutId);
    };
  }, [editor]);

  const loadDocument = async (currentEditor) => {
    setLoading(true);
    setError('');
    setTookTooLong(false);

    try {
      const doc = await getUserDocument(user?.id);

      if (!doc) {
        setError('Failed to load document');
        setLoading(false);
        return;
      }

      setDocument(doc);

      // Load content into editor
      if (currentEditor) {
        if (doc.content && doc.content.type) {
          currentEditor.commands.setContent(doc.content);
        } else {
          currentEditor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Start typing...' }] }] });
        }
      }
    } catch (err) {
      console.error('Error loading document:', err);
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  };

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
    } else {
      setError('Failed to save document');
      console.error('Save error:', result.error);
    }

    setIsSaving(false);
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
          <div className="save-status">
            {error && <span className="error-indicator">{error}</span>}
            {isSaving && <span className="saving-indicator">Saving...</span>}
            {!error && !isSaving && (
              <span className="saved-indicator">
                {lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString()}` : 'Saved'}
              </span>
            )}
          </div>
          <button onClick={handleManualSave} disabled={isSaving} className="save-btn">
            Save Now
          </button>
          <button onClick={onSignOut} className="sign-out-btn">
            Sign Out
          </button>
        </div>
      </div>

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
  );
}
