import { useState, useEffect } from 'react';

export default function Dashboard({ onOpenEditor }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // TODO: Load user's documents from backend
    // For scaffold, placeholder list
    setDocs([]);
  }, []);

  const handleCreateDoc = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled Document' }),
      });
      const data = await response.json();
      if (data.id) {
        onOpenEditor(data.id);
      }
    } catch (error) {
      console.error('Failed to create document:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <h1>My Documents</h1>
      <button onClick={handleCreateDoc} disabled={loading}>
        {loading ? 'Creating...' : 'Create new doc'}
      </button>
      <div className="docs-list">
        {docs.length === 0 ? (
          <p>No documents yet. Create one to get started!</p>
        ) : (
          docs.map((doc) => (
            <div key={doc.id} className="doc-item">
              <h3>{doc.title}</h3>
              <button onClick={() => onOpenEditor(doc.id)}>Open</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
