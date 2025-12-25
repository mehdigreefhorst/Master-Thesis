import React from 'react';

export interface RibbonProps {
  text: string;
  backgroundColor?: string;
  textColor?: string;
  size?: 'sm' | 'md' | 'lg';
  corner?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  className?: string;
}

export const Ribbon: React.FC<RibbonProps> = ({
  text,
  backgroundColor = '#7C3AED',
  textColor = '#FFFFFF',
  size = 'md',
  corner = 'top-right',
  className = ''
}) => {
  // Size configurations
  const sizeConfig = {
    sm: {
      containerSize: 'w-full h-16',
      ribbonWidth: '90px',
      ribbonPadding: '6px 16px',
      ribbonOffset: '20px',
      ribbonInset: '-40px',
      containerOffset: '-16px',
      fontSize: 'text-xs',
      borderRadius: '20px'
    },
    md: {
      containerSize: 'w-full h-40',
      ribbonWidth: '220px',
      ribbonPadding: '8px 20px',
      ribbonOffset: '12px',
      ribbonInset: '-55px',
      containerOffset: '-20px',
      fontSize: 'text-sm',
      borderRadius: '24px'
    },
    lg: {
      containerSize: 'w-full h-48',
      ribbonWidth: '260px',
      ribbonPadding: '10px 24px',
      ribbonOffset: '16px',
      ribbonInset: '-60px',
      containerOffset: '-24px',
      fontSize: 'text-base',
      borderRadius: '28px'
    }
  };

  // Corner configurations
  const cornerConfig = {
    'top-right': {
      containerPosition: 'right-0 top-0',
      rotation: 'rotate-45',
      ribbonPosition: { top: sizeConfig[size].ribbonOffset, right: sizeConfig[size].ribbonInset },
      containerTopBottom: { top: sizeConfig[size].containerOffset }
    },
    'top-left': {
      containerPosition: 'left-0 top-0',
      rotation: '-rotate-45',
      ribbonPosition: { top: sizeConfig[size].ribbonOffset, left: sizeConfig[size].ribbonInset },
      containerTopBottom: { top: sizeConfig[size].containerOffset }
    },
    'bottom-right': {
      containerPosition: 'right-0 bottom-0',
      rotation: '-rotate-45',
      ribbonPosition: { bottom: sizeConfig[size].ribbonOffset, right: sizeConfig[size].ribbonInset },
      containerTopBottom: { bottom: sizeConfig[size].containerOffset }
    },
    'bottom-left': {
      containerPosition: 'left-0 bottom-0',
      rotation: 'rotate-45',
      ribbonPosition: { bottom: sizeConfig[size].ribbonOffset, left: sizeConfig[size].ribbonInset },
      containerTopBottom: { bottom: sizeConfig[size].containerOffset }
    }
  };

  const config = sizeConfig[size];
  const positionConfig = cornerConfig[corner];

  return (
    <div
      className={`absolute ${positionConfig.containerPosition} ${config.containerSize} pointer-events-none z-50 overflow-visible ${className}`}
      style={positionConfig.containerTopBottom}
    >
      <div
        className={`absolute transform ${positionConfig.rotation} origin-center ${config.fontSize} font-bold text-center shadow-md whitespace-nowrap`}
        style={{
          backgroundColor,
          color: textColor,
          width: config.ribbonWidth,
          padding: config.ribbonPadding,
          ...positionConfig.ribbonPosition,
          borderRadius: config.borderRadius,
          boxShadow: '0 3px 12px rgba(0, 0, 0, 0.2)',
          zIndex: 50
        }}
      >
        {text}
      </div>
    </div>
  );
};
