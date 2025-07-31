import React, { useEffect, useState } from 'react';
import { COLOR_PALETTE, PREMIUM_GRADIENT_PALETTE } from '../constants/canvas';
import { styles } from '../styles/canvas';

interface ColorPaletteProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  isPremiumPaletteActive: boolean;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  selectedColor,
  onColorSelect,
  isPremiumPaletteActive
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const currentPalette = isPremiumPaletteActive ? PREMIUM_GRADIENT_PALETTE : COLOR_PALETTE;

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div style={{
      ...styles.colorPalette,
      ...(isMobile && {
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        padding: '12px',
        marginBottom: '20px',
        background: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '12px',
        border: '1px solid rgba(147, 51, 234, 0.3)',
        backdropFilter: 'blur(10px)',
      })
    }} data-color-palette>
      <h3 style={{
        ...styles.colorPaletteTitle,
        ...(isMobile && {
          fontSize: '1rem',
          marginBottom: '12px',
          textAlign: 'center',
        })
      }}>
        {isPremiumPaletteActive ? '✨ Premium Colors:' : '🎨 Colors:'}
      </h3>
      <div style={{
        ...styles.colorsGrid,
        ...(isPremiumPaletteActive && {
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
          gap: isMobile ? '6px' : '4px',
          maxHeight: isMobile ? '60vh' : '80vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: isMobile ? '8px' : '0',
        }),
        ...(isMobile && !isPremiumPaletteActive && {
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: '6px',
          padding: '8px',
        })
      }}>
        {currentPalette.map((color, index) => (
          <button
            key={index}
            style={{
              ...styles.colorBtn,
              backgroundColor: color,
              ...(selectedColor === color ? styles.colorBtnSelected : {}),
              ...(isPremiumPaletteActive && {
                background: `linear-gradient(135deg, ${color} 0%, ${color}80 100%)`,
                boxShadow: `0 0 20px ${color}40, 0 8px 25px rgba(0, 0, 0, 0.4), inset 0 0 20px ${color}20`,
                border: `2px solid ${color}60`,
                width: isMobile ? '40px' : '35px',
                height: isMobile ? '40px' : '35px',
              }),
              ...(isMobile && !isPremiumPaletteActive && {
                width: '35px',
                height: '35px',
                minWidth: '35px',
                minHeight: '35px',
                touchAction: 'manipulation',
              })
            }}
            onClick={() => onColorSelect(color)}
            title={color}
          />
        ))}
      </div>
    </div>
  );
}; 