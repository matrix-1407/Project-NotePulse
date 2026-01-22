import { useState } from 'react';
import Welcome from './components/Welcome';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import Header from './components/Header';

export default function App() {
  const [page, setPage] = useState('welcome'); // welcome | dashboard | editor
  const [currentDocId, setCurrentDocId] = useState(null);

  const handleOpenEditor = (docId) => {
    setCurrentDocId(docId);
    setPage('editor');
  };

  const handleBackToDashboard = () => {
    setPage('dashboard');
  };

  return (
    <div className="app">
      <Header onNavigate={setPage} />
      {page === 'welcome' && <Welcome onGetStarted={() => setPage('dashboard')} />}
      {page === 'dashboard' && (
        <Dashboard onOpenEditor={handleOpenEditor} />
      )}
      {page === 'editor' && (
        <Editor docId={currentDocId} onBack={handleBackToDashboard} />
      )}
    </div>
  );
}
