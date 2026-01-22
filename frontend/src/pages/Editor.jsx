import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export default function Editor({ docId, onBack }) {
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const ydocRef = useRef(null);
  const providerRef = useRef(null);

  useEffect(() => {
    if (!docId) return;

    // Initialize Yjs document and WebSocket provider
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    const wsUrl = backendUrl.replace(/^http/, 'ws') + ':1234';

    console.log(`Connecting to Yjs server at ${wsUrl} for room: doc-${docId}`);

    const provider = new WebsocketProvider(
      wsUrl,
      `doc-${docId}`,
      ydoc,
      { connect: true }
    );
    providerRef.current = provider;

    // Track awareness for connected users
    provider.awareness.on('change', () => {
      const states = Array.from(provider.awareness.getStates().values());
      setUsers(
        states
          .filter((state) => state.user)
          .map((state) => state.user.name || 'Anonymous')
      );
    });

    return () => {
      provider.disconnect();
      ydoc.destroy();
    };
  }, [docId]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Collaboration.configure({
        document: ydocRef.current,
      }),
      CollaborationCursor.configure({
        provider: providerRef.current,
      }),
    ],
    content: '<p>Start typing...</p>',
  });

  const handleSave = async () => {
    if (!editor || !docId) return;
    setSaving(true);
    try {
      const content = editor.getJSON();
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/docs/${docId}/save`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, snapshot: content }),
        }
      );
      if (response.ok) {
        console.log('Document saved successfully');
      }
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!editor) {
    return <div className="editor"><p>Loading editor...</p></div>;
  }

  return (
    <div className="editor-container">
      <div className="editor-header">
        <button onClick={onBack}>← Back</button>
        <h2>Document: {docId}</h2>
        <div className="presence">
          Connected: {users.length + 1} {users.length > 0 && `(${users.join(', ')})`}
        </div>
        <button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      <div className="editor-toolbar">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
        >
          Bold
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
        >
          Italic
        </button>
      </div>
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
}
