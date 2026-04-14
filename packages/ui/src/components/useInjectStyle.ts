import { useEffect } from 'react';

const injectedStyleIds = new Set<string>();

export function useInjectStyle(id: string, css: string) {
  useEffect(() => {
    if (typeof document === 'undefined' || injectedStyleIds.has(id)) {
      return;
    }

    const style = document.createElement('style');
    style.setAttribute('data-connekt-style', id);
    style.textContent = css;
    document.head.appendChild(style);
    injectedStyleIds.add(id);
  }, [css, id]);
}
