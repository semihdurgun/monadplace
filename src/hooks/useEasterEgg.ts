import { useState, useEffect } from 'react';
import { PREMIUM_GRADIENT_PALETTE } from '../constants/canvas';
import { EASTER_EGG_KEYWORD } from '../constants/config';
import { EasterEggParticle } from '../types/canvas';

export const useEasterEgg = () => {
  const [isPremiumPaletteActive, setIsPremiumPaletteActive] = useState(false);
  const [typedKeys, setTypedKeys] = useState('');
  const [showEasterEggMessage, setShowEasterEggMessage] = useState(false);
  const [canvasRotation, setCanvasRotation] = useState(0);
  const [isCanvasSpinning, setIsCanvasSpinning] = useState(false);
  const [easterEggParticles, setEasterEggParticles] = useState<EasterEggParticle[]>([]);

  // Easter Egg: key listening
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only respond to letter keys
      if (event.key.length === 1 && /[a-zA-Z]/.test(event.key)) {
        const newTypedKeys = typedKeys + event.key.toLowerCase();
        setTypedKeys(newTypedKeys);
        
        // Check if easter egg keyword was typed
        if (newTypedKeys.includes(EASTER_EGG_KEYWORD)) {
          setIsPremiumPaletteActive(true);
          setShowEasterEggMessage(true);
          setTypedKeys(''); // Reset typed keys
          
          // Start canvas spinning animation
          setIsCanvasSpinning(true);
          setCanvasRotation(0);
          
          // Create particle explosion effect
          const particles = Array.from({ length: 50 }, () => ({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            color: PREMIUM_GRADIENT_PALETTE[Math.floor(Math.random() * PREMIUM_GRADIENT_PALETTE.length)],
            life: 1
          }));
          setEasterEggParticles(particles);
          
          // Hide message after 4 seconds
          setTimeout(() => {
            setShowEasterEggMessage(false);
          }, 4000);
          
          // Stop spinning after 3 seconds
          setTimeout(() => {
            setIsCanvasSpinning(false);
            setCanvasRotation(0);
          }, 3000);
          
          // Clear particles after 2 seconds
          setTimeout(() => {
            setEasterEggParticles([]);
          }, 2000);
        }
        
        // Clear typed keys after 5 seconds (if easter egg keyword wasn't typed)
        setTimeout(() => {
          setTypedKeys(prev => {
            if (!prev.includes(EASTER_EGG_KEYWORD)) {
              return '';
            }
            return prev;
          });
        }, 5000);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [typedKeys]);

  // Canvas spinning animation
  useEffect(() => {
    if (!isCanvasSpinning) return;
    
    const interval = setInterval(() => {
      setCanvasRotation(prev => prev + 10);
    }, 50);
    
    return () => clearInterval(interval);
  }, [isCanvasSpinning]);

  // Particle animation
  useEffect(() => {
    if (easterEggParticles.length === 0) return;
    
    const interval = setInterval(() => {
      setEasterEggParticles(prev => 
        prev.map(particle => ({
          ...particle,
          x: particle.x + (Math.random() - 0.5) * 10,
          y: particle.y + (Math.random() - 0.5) * 10,
          life: particle.life - 0.02
        })).filter(particle => particle.life > 0)
      );
    }, 50);
    
    return () => clearInterval(interval);
  }, [easterEggParticles]);

  return {
    isPremiumPaletteActive,
    showEasterEggMessage,
    canvasRotation,
    isCanvasSpinning,
    easterEggParticles,
    setIsPremiumPaletteActive
  };
}; 