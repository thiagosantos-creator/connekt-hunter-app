import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return <main><h1>Candidate Web</h1><ol><li>Token entry</li><li>Basic profile</li><li>LGPD/Terms consent</li><li>CV upload</li></ol><p>Status: aguardando parsing.</p></main>;
}

createRoot(document.getElementById('root')!).render(<App />);
