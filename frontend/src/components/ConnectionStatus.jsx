import { useState, useEffect } from 'react';

export default function ConnectionStatus({ provider }) {
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    if (!provider) {
      setStatus('offline');
      return;
    }

    const updateStatus = () => {
      if (provider.ws?.readyState === WebSocket.OPEN) {
        setStatus('connected');
      } else if (provider.ws?.readyState === WebSocket.CONNECTING) {
        setStatus('connecting');
      } else {
        setStatus('offline');
      }
    };

    // Initial check
    updateStatus();

    // Listen to provider events
    provider.on('status', ({ status: providerStatus }) => {
      setStatus(providerStatus === 'connected' ? 'connected' : 
                providerStatus === 'connecting' ? 'connecting' : 'offline');
    });

    // Fallback: check WebSocket state periodically
    const interval = setInterval(updateStatus, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [provider]);

  const statusConfig = {
    connected: { label: 'Connected', className: 'connected' },
    connecting: { label: 'Reconnecting...', className: 'connecting' },
    offline: { label: 'Offline', className: 'disconnected' },
  };

  const config = statusConfig[status] || statusConfig.offline;

  return (
    <div className={`connection-status ${config.className}`}>
      <span className="status-dot"></span>
      <span className="status-label">{config.label}</span>
    </div>
  );
}
