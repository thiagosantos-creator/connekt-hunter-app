import { useEffect } from 'react';

const injectedStyleIds = new Set<string>();

export function useInjectStyle(id: string, css: string) {
  useEffect(() => {
    if (typeof document === 'undefined' || injectedStyleIds.has(id)) {
      return;
    }

    injectedStyleIds.add(id);

    const existingStyle = document.head.querySelector(`[data-connekt-style="${id}"]`);
    if (existingStyle) {
      return;
    }

    const style = document.createElement('style');
    style.setAttribute('data-connekt-style', id);
    style.textContent = css;
    document.head.appendChild(style);
  }, [css, id]);
}
