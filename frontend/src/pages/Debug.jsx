import { useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { supabase } from '../supabaseClient';

function getWsUrl() {
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    const url = new URL(backendUrl);
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${url.hostname}:1234`;
  } catch {
    return 'ws://localhost:1234';
  }
}

function hashToColor(input) {
  if (!input) return '#64748b';
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 45%)`;
}

export default function Debug() {
  const wsUrl = useMemo(() => getWsUrl(), []);
  const [sessionInfo, setSessionInfo] = useState({ status: 'loading', session: null, error: null });
  const [room, setRoom] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('doc') ? `doc-${params.get('doc')}` : 'doc-debug';
  });

  const [providerStatus, setProviderStatus] = useState('offline');
  const [wsReadyState, setWsReadyState] = useState(null);
  const [awarenessUsers, setAwarenessUsers] = useState([]);
  const [ydocInfo, setYdocInfo] = useState({ updates: 0, lastUpdateBytes: 0 });
  const [requests, setRequests] = useState([]);

  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const restoreFetchRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error) {
          setSessionInfo({ status: 'error', session: null, error });
        } else {
          setSessionInfo({ status: 'ready', session, error: null });
        }
      } catch (error) {
        if (cancelled) return;
        setSessionInfo({ status: 'error', session: null, error });
      }
    };

    loadSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setSessionInfo({ status: 'ready', session, error: null });
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  // Lightweight network logger (last 10 fetch requests) for /debug only.
  useEffect(() => {
    if (restoreFetchRef.current) return;

    const originalFetch = window.fetch;
    const wrappedFetch = async (input, init) => {
      const startedAt = Date.now();
      let url = '';
      try {
        url = typeof input === 'string' ? input : input?.url || '';
      } catch {
        url = '';
      }

      try {
        const res = await originalFetch(input, init);
        const entry = {
          ts: new Date().toISOString(),
          method: init?.method || 'GET',
          url,
          status: res.status,
          ms: Date.now() - startedAt,
        };
        setRequests((prev) => [entry, ...prev].slice(0, 10));
        return res;
      } catch (e) {
        const entry = {
          ts: new Date().toISOString(),
          method: init?.method || 'GET',
          url,
          status: 'ERR',
          ms: Date.now() - startedAt,
        };
        setRequests((prev) => [entry, ...prev].slice(0, 10));
        throw e;
      }
    };

    window.fetch = wrappedFetch;
    restoreFetchRef.current = () => {
      window.fetch = originalFetch;
      restoreFetchRef.current = null;
    };

    return () => {
      restoreFetchRef.current?.();
    };
  }, []);

  const disconnect = () => {
    if (providerRef.current) {
      try {
        providerRef.current.destroy();
      } catch {
        // ignore
      }
      providerRef.current = null;
    }
    if (ydocRef.current) {
      try {
        ydocRef.current.destroy();
      } catch {
        // ignore
      }
      ydocRef.current = null;
    }
    setProviderStatus('offline');
    setWsReadyState(null);
    setAwarenessUsers([]);
    setYdocInfo({ updates: 0, lastUpdateBytes: 0 });
  };

  const connect = () => {
    disconnect();

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    ydoc.on('update', (update) => {
      setYdocInfo((prev) => ({ updates: prev.updates + 1, lastUpdateBytes: update?.byteLength || 0 }));
    });

    const provider = new WebsocketProvider(wsUrl, room, ydoc, { connect: true });
    providerRef.current = provider;

    provider.on('status', ({ status }) => {
      setProviderStatus(status);
    });

    const updateWsState = () => {
      setWsReadyState(provider.ws?.readyState ?? null);
    };

    const updateAwareness = () => {
      const states = Array.from(provider.awareness.getStates().values());
      setAwarenessUsers(
        states
          .map((s) => s?.user)
          .filter(Boolean)
      );
    };

    provider.awareness.on('change', updateAwareness);

    // Set local state
    const sessionUser = sessionInfo.session?.user;
    const name = sessionUser?.email?.split('@')[0] || sessionUser?.email || 'DebugUser';
    provider.awareness.setLocalStateField('user', {
      id: sessionUser?.id || 'debug',
      name,
      color: hashToColor(sessionUser?.id || name),
    });

    updateWsState();
    updateAwareness();

    const interval = window.setInterval(updateWsState, 1500);
    provider.on('destroy', () => window.clearInterval(interval));
  };

  const sessionUser = sessionInfo.session?.user;

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>NotePulse Debug</h1>
      <p style={{ color: '#64748b', marginTop: 0 }}>
        Session, WebSocket provider, awareness states, and last network requests.
      </p>

      <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Supabase Session</h2>
        {sessionInfo.status === 'loading' && <div>Loading session…</div>}
        {sessionInfo.status === 'error' && (
          <pre style={{ whiteSpace: 'pre-wrap', color: '#b91c1c' }}>
            {String(sessionInfo.error?.message || sessionInfo.error)}
          </pre>
        )}
        {sessionInfo.status === 'ready' && (
          <div>
            <div><strong>Authenticated:</strong> {sessionUser ? 'yes' : 'no'}</div>
            <div><strong>User:</strong> {sessionUser?.email || '(none)'}</div>
            <div><strong>User ID:</strong> {sessionUser?.id || '(none)'}</div>
          </div>
        )}
      </section>

      <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Yjs Provider</h2>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            Room:&nbsp;
            <input value={room} onChange={(e) => setRoom(e.target.value)} style={{ width: 320 }} />
          </label>
          <span style={{ color: '#64748b' }}>WS: {wsUrl}</span>
          <button onClick={connect}>Connect</button>
          <button onClick={disconnect}>Disconnect</button>
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <div><strong>Status:</strong> {providerStatus}</div>
          <div><strong>WebSocket readyState:</strong> {wsReadyState === null ? '(unknown)' : String(wsReadyState)}</div>
          <div><strong>Y.Doc updates:</strong> {ydocInfo.updates} (last {ydocInfo.lastUpdateBytes} bytes)</div>
        </div>

        <h3>Awareness Users ({awarenessUsers.length})</h3>
        {awarenessUsers.length === 0 ? (
          <div style={{ color: '#64748b' }}>No awareness users yet.</div>
        ) : (
          <ul>
            {awarenessUsers.map((u, idx) => (
              <li key={idx}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 999, background: u.color, marginRight: 8 }} />
                {u.name} ({u.id})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Last 10 network requests</h2>
        {requests.length === 0 ? (
          <div style={{ color: '#64748b' }}>No requests captured yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '0.5rem' }}>Time</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '0.5rem' }}>Method</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '0.5rem' }}>Status</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '0.5rem' }}>ms</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '0.5rem' }}>URL</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r, idx) => (
                <tr key={idx}>
                  <td style={{ borderBottom: '1px solid #f1f5f9', padding: '0.5rem', whiteSpace: 'nowrap' }}>{r.ts}</td>
                  <td style={{ borderBottom: '1px solid #f1f5f9', padding: '0.5rem' }}>{r.method}</td>
                  <td style={{ borderBottom: '1px solid #f1f5f9', padding: '0.5rem' }}>{String(r.status)}</td>
                  <td style={{ borderBottom: '1px solid #f1f5f9', padding: '0.5rem' }}>{r.ms}</td>
                  <td style={{ borderBottom: '1px solid #f1f5f9', padding: '0.5rem', wordBreak: 'break-all' }}>{r.url}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
