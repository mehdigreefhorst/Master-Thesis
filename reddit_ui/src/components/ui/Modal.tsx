import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  showCloseButton?: boolean;
  blurBackground?: boolean;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  showCloseButton = false,
  blurBackground = false,
  maxWidth = 'max-w-md'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 ${
          blurBackground
            ? 'backdrop-blur-md bg-white/30'
            : 'bg-black bg-opacity-50 backdrop-blur-sm'
        }`}
        onClick={showCloseButton ? onClose : undefined}
      />

      {/* Modal Content */}
      <div className={`relative bg-white rounded-2xl shadow-2xl p-8 ${maxWidth} w-full mx-4 animate-[slideInDown_300ms_ease-out]`}>
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {children}
      </div>
    </div>
  );
};
