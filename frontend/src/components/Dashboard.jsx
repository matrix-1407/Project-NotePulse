import { useState, useEffect } from 'react';
import { getUserItems, createItem } from '../supabaseClient';

export default function Dashboard({ user, onSignOut }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getUserItems();
      setItems(data);
    } catch (err) {
      setError('Failed to load items');
      console.error('Load items error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setSubmitting(true);
    setError('');

    const result = await createItem(title, description);

    if (result.success) {
      setTitle('');
      setDescription('');
      await loadItems();
    } else {
      setError(result.error || 'Failed to create item');
    }

    setSubmitting(false);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="user-email">Logged in as: {user?.email}</p>
        </div>
        <button onClick={onSignOut} className="sign-out-btn">
          Sign Out
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="add-item-section">
        <h2>Add New Item</h2>
        <form onSubmit={handleCreateItem}>
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={submitting}
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            rows="3"
          />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Item'}
          </button>
        </form>
      </div>

      <div className="items-section">
        <h2>My Items</h2>
        {loading ? (
          <p>Loading items...</p>
        ) : items.length === 0 ? (
          <p className="empty-state">No items yet. Create one above!</p>
        ) : (
          <div className="items-list">
            {items.map((item) => (
              <div key={item.id} className="item-card">
                <h3>{item.title}</h3>
                {item.description && <p>{item.description}</p>}
                <div className="item-meta">
                  <span className="item-status">{item.status}</span>
                  <span className="item-date">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
