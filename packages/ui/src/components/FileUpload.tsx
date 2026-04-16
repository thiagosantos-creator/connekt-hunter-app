import React, { useRef, useState } from 'react';
import { colors, radius, fontSize, spacing, fontWeight, shadows } from '../tokens/tokens.js';
import { useInjectStyle } from './useInjectStyle.js';
import { Button } from './Button.js';
import { Spinner } from './Layout.js';

export interface FileUploadProps {
  label?: string;
  description?: string;
  accept?: string;
  maxSize?: number; // in bytes
  onFileSelect: (file: File) => Promise<void> | void;
  value?: string; // current image URL
  previewType?: 'avatar' | 'banner' | 'rectangular';
  loading?: boolean;
}

const containerStyle: React.CSSProperties = {
  marginBottom: spacing.md,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: spacing.xs,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: colors.textSecondary,
};

const dropZoneBaseStyle: React.CSSProperties = {
  position: 'relative',
  border: `2px dashed ${colors.border}`,
  borderRadius: radius.lg,
  padding: spacing.xl,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  background: colors.surface,
  transition: 'all 0.2s ease',
  cursor: 'pointer',
  minHeight: 140,
};

const previewContainerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  marginBottom: spacing.md,
};

const dropZoneStyles = `
  .connekt-upload-zone:hover {
    border-color: ${colors.accent};
    background: ${colors.surfaceAlt};
  }
  .connekt-upload-zone.is-dragging {
    border-color: ${colors.accent};
    background: ${colors.infoLight};
    transform: scale(1.01);
  }
`;

export function FileUpload({
  label,
  description,
  accept = 'image/*',
  onFileSelect,
  value,
  previewType = 'rectangular',
  loading = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useInjectStyle('upload-zone-styles', dropZoneStyles);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void onFileSelect(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void onFileSelect(file);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const renderPreview = () => {
    if (!value) return null;

    const commonStyle: React.CSSProperties = {
      objectFit: 'cover',
      background: colors.surfaceAlt,
      border: `1px solid ${colors.border}`,
      boxShadow: shadows.sm,
    };

    if (previewType === 'avatar') {
      return (
        <img
          src={value}
          alt="Preview"
          style={{ ...commonStyle, width: 80, height: 80, borderRadius: '50%' }}
        />
      );
    }

    if (previewType === 'banner') {
      return (
        <img
          src={value}
          alt="Preview"
          style={{ ...commonStyle, width: '100%', height: 120, borderRadius: radius.md }}
        />
      );
    }

    return (
      <img
        src={value}
        alt="Preview"
        style={{ ...commonStyle, maxWidth: '100%', maxHeight: 200, borderRadius: radius.md }}
      />
    );
  };

  return (
    <div style={containerStyle}>
      {label && <label style={labelStyle}>{label}</label>}
      
      <div
        className={`connekt-upload-zone ${isDragging ? 'is-dragging' : ''}`}
        style={dropZoneBaseStyle}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerUpload}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept={accept}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Spinner size={32} />
            <p style={{ margin: `${spacing.sm}px 0 0`, fontSize: fontSize.sm, color: colors.textSecondary }}>
              Enviando arquivo...
            </p>
          </div>
        ) : (
          <>
            {value && <div style={previewContainerStyle}>{renderPreview()}</div>}
            
            <div style={{ pointerEvents: 'none' }}>
              <div style={{ fontSize: 32, marginBottom: spacing.sm }}>☁️</div>
              <div style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.xs }}>
                Clique ou arraste um arquivo
              </div>
              {description && (
                <div style={{ fontSize: fontSize.xs, color: colors.textMuted }}>
                  {description}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      <div style={{ marginTop: spacing.sm, display: 'flex', justifyContent: 'center' }}>
          <Button variant="ghost" size="sm" onClick={triggerUpload} disabled={loading}>
              Selecionar outro arquivo
          </Button>
      </div>
    </div>
  );
}
