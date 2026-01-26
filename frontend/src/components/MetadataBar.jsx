import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function MetadataBar({ document }) {
  const [lastEditedBy, setLastEditedBy] = useState('Unknown');
  const [lastSavedTime, setLastSavedTime] = useState('');

  useEffect(() => {
    if (!document) return;

    // Format last saved time
    if (document.updated_at) {
      const date = new Date(document.updated_at);
      setLastSavedTime(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }

    // Fetch last editor info
    const fetchEditor = async () => {
      const editorId = document.last_edited_by || document.user_id;
      if (!editorId) return;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', editorId)
          .maybeSingle();

        if (!error && profile) {
          setLastEditedBy(profile.full_name || profile.email?.split('@')[0] || 'Unknown');
        } else if (error) {
          // Fallback: use email prefix from document or user ID
          setLastEditedBy(editorId.substring(0, 8));
        }
      } catch (err) {
        // Silent fail - just use ID as fallback
        setLastEditedBy(editorId.substring(0, 8));
      }
    };

    fetchEditor();
  }, [document]);

  if (!document) return null;

  const timeAgo = document.updated_at ? getTimeAgo(new Date(document.updated_at)) : '';

  return (
    <div className="metadata-bar">
      <div className="metadata-title">
        <strong>{document.title || 'Untitled Document'}</strong>
      </div>
      <div className="metadata-info">
        {lastEditedBy && timeAgo && (
          <span>Last edited by {lastEditedBy} • {timeAgo}</span>
        )}
        {lastSavedTime && (
          <span className="metadata-saved">Last saved: {lastSavedTime}</span>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
