import React from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return <main><h1>Backoffice Web</h1><p>Views: vacancies, candidates, applications, shortlist, client review.</p></main>;
}

createRoot(document.getElementById('root')!).render(<App />);
