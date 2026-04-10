import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../services/api.js';
import { Spinner } from '@connekt/ui';

export function RequiresToken({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('invite_token') ?? '';
  const navigate = useNavigate();
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) { setValid(false); return; }
    apiGet(`/candidate/token/${encodeURIComponent(token)}`)
      .then(() => setValid(true))
      .catch(() => {
        localStorage.removeItem('invite_token');
        localStorage.removeItem('candidate_info');
        setValid(false);
      });
  }, [token]);

  if (valid === null) return <Spinner />;
  if (!valid) { navigate('/', { replace: true }); return null; }
  return <>{children}</>;
}
