import { useState, useEffect } from 'react';
import { getDocumentHistory } from '../supabaseClient';

export default function HistoryPanel({ documentId, onLoadSnapshot, onClose }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHistory = async () => {
    if (!documentId) return;
    
    try {
      setLoading(true);
      setError('');
      const result = await getDocumentHistory(documentId, 20);
      if (result?.error) {
        console.error('Error loading history:', result.error);
        setError(result.error.message || 'Failed to load history');
        setSnapshots([]);
        return;
      }
      console.log('Fetched history:', result?.data);
      setSnapshots(result?.data || []);
    } catch (err) {
      console.error('Error in HistoryPanel fetchHistory:', err);
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [documentId]);

  const handleLoad = (snapshot) => {
    if (!confirm('Load this snapshot? Any unsaved changes will be lost.')) {
      return;
    }

    onLoadSnapshot(snapshot.content);
    onClose();
  };

  const getPreview = (content) => {
    try {
      if (typeof content === 'string') {
        return content.substring(0, 120);
      }
      if (content && content.content && Array.isArray(content.content)) {
        const text = extractText(content.content);
        return text.substring(0, 120) || '(Empty document)';
      }
      return '(No preview)';
    } catch {
      return '(No preview)';
    }
  };

  const extractText = (nodes) => {
    let text = '';
    for (const node of nodes) {
      if (node.type === 'text') {
        text += node.text || '';
      } else if (node.content && Array.isArray(node.content)) {
        text += extractText(node.content) + ' ';
      }
    }
    return text;
  };

  return (
    <div className="history-overlay" onClick={onClose}>
      <div className="history-panel" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <h2>Document History</h2>
          <div className="history-header-actions">
            <button 
              className="history-refresh-btn" 
              onClick={fetchHistory}
              disabled={loading}
              title="Refresh"
            >
              ↻
            </button>
            <button className="history-close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>

        <div className="history-content">
          {error && <p className="history-error">{error}</p>}
          {loading && <p>Loading history...</p>}
          
          {!loading && snapshots.length === 0 && (
            <p className="history-empty">No snapshots yet. Use Ctrl+S to create manual snapshots.</p>
          )}

          {!loading && snapshots.length > 0 && (
            <div className="history-list">
              {snapshots.map((snapshot) => (
                <div key={snapshot.id} className="history-item">
                  <div className="history-item-header">
                    <div className="history-item-meta">
                      <div className="history-item-date">
                        {new Date(snapshot.created_at).toLocaleString()}
                      </div>
                      <span className="history-item-type">{snapshot.snapshot_type}</span>
                    </div>
                  </div>
                  <p className="history-item-preview">{getPreview(snapshot.content)}</p>
                  <div className="history-item-actions">
                    <button 
                      className="history-load-btn"
                      onClick={() => handleLoad(snapshot)}
                    >
                      Load
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
