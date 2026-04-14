import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { colors, spacing, fontSize, radius } from '@connekt/ui';

interface Props { children: ReactNode; fallbackTitle?: string }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          maxWidth: 480,
          margin: '80px auto',
          padding: spacing.lg,
          textAlign: 'center',
          background: colors.dangerLight,
          borderRadius: radius.md,
        }}>
          <h2 style={{ color: colors.danger, margin: `0 0 ${spacing.sm}px`, fontSize: fontSize.xl }}>
            {this.props.fallbackTitle ?? 'Algo deu errado'}
          </h2>
          <p style={{ color: colors.textSecondary, margin: `0 0 ${spacing.md}px` }}>
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); }}
            style={{
              padding: `${spacing.sm}px ${spacing.md}px`,
              background: colors.primary,
              color: colors.textInverse,
              border: 'none',
              borderRadius: radius.sm,
              cursor: 'pointer',
              fontSize: fontSize.md,
            }}
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
