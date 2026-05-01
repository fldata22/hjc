import { useEffect } from 'react';

export type ReceiptModalProps = {
  photo: string;
  onClose: () => void;
};

export const ReceiptModal = ({ photo, onClose }: ReceiptModalProps) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.92)',
        zIndex: 1000,
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'transparent',
          border: 0,
          color: 'white',
          fontSize: 28,
          cursor: 'pointer',
          fontFamily: 'inherit',
          lineHeight: 1,
          padding: 4,
        }}
      >
        ×
      </button>
      <img
        src={photo}
        alt="Receipt"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 64px)',
          objectFit: 'contain',
          borderRadius: 4,
        }}
      />
    </div>
  );
};
