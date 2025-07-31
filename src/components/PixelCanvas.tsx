import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// Import from separated files
import { usePixelCanvas } from '../hooks/usePixelCanvas.ts';
import { useEasterEgg } from '../hooks/useEasterEgg.ts';
import { useMultisynq } from '../hooks/useMultisynq.ts';
import { useFavicon } from '../hooks/useFavicon.ts';
import { formatTime } from '../utils/formatters.ts';
import { ColorPalette } from './ColorPalette.tsx';
import { styles } from '../styles/canvas.ts';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  PIXEL_SIZE, 
  MIN_ZOOM, 
  MAX_ZOOM,
  COLOR_PALETTE 
} from '../constants/canvas.ts';

const PixelCanvasApp: React.FC = () => {
  const { address, isConnected } = useAccount();
  
  // Use favicon hook
  useFavicon();
  
  // Get necessary functions from usePixelCanvas hook
  const { 
    monBalanceFormatted, 
    burnAmountFormatted, 
    placePixel, 
    approveTokens, 
    needsApproval: needsApprovalFromHook,
    isApprovalPending,
    isApproveConfirming,
    isApproveConfirmed
  } = usePixelCanvas();

  // Get easter egg functionality
  const {
    isPremiumPaletteActive,
    showEasterEggMessage,
    canvasRotation,
    isCanvasSpinning,
    easterEggParticles,
    setIsPremiumPaletteActive
  } = useEasterEgg();

  // Get Multisynq functionality
  const {
    canvasRef,
    session,
    rootModel,
    allUsers,
    pixelCanvas,
    cooldownRemaining,
    zoom,
    setZoom,
    hoveredPixel,
    setHoveredPixel,
    selectedColor,
    setSelectedColor,
    sendUserAction
  } = useMultisynq(burnAmountFormatted);

  // UI state
  const [userInfoCollapsed, setUserInfoCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Premium mode state
  const [isPremiumMode, setIsPremiumMode] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isPlacingPremiumPixel, setIsPlacingPremiumPixel] = useState(false);
  const [pendingPixel, setPendingPixel] = useState<{x: number, y: number} | null>(null);

  // Derived values
  const users = allUsers;
  const DISPLAY_WIDTH = CANVAS_WIDTH * PIXEL_SIZE * zoom;
  const DISPLAY_HEIGHT = CANVAS_HEIGHT * PIXEL_SIZE * zoom;
  const needsApproval = false;
  const isPlacingPixel = false;

  // Event handlers
  const handleCanvasMouseLeave = () => {
    setHoveredPixel(null);
    setIsDragging(false);
  };

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.button === 0) { // Left click only
      setIsDragging(true);
      setDragStart({ x: event.clientX, y: event.clientY });
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    if (isDragging) {
      const deltaX = event.clientX - dragStart.x;
      const deltaY = event.clientY - dragStart.y;
      
      setCanvasOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setDragStart({ x: event.clientX, y: event.clientY });
    } else {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.floor((event.clientX - rect.left) / (PIXEL_SIZE * zoom));
      const y = Math.floor((event.clientY - rect.top) / (PIXEL_SIZE * zoom));
      if (x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
        setHoveredPixel({ x, y });
      } else {
        setHoveredPixel(null);
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleCanvasWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + (event.deltaY > 0 ? -0.1 : 0.1)));
    setZoom(newZoom);
    if (session?.view) session.view.zoom = newZoom;
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    sendUserAction("selectColor", { color });
  };

  // Canvas click handler
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) return; // Don't place pixel if dragging
    
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / (PIXEL_SIZE * zoom));
    const y = Math.floor((event.clientY - rect.top) / (PIXEL_SIZE * zoom));
    const timestamp = new Date().getTime();
    
    if (isPremiumMode) {
      handlePremiumPixelPlacement(x, y);
    } else {
      sendUserAction("placePixel", { x, y, timestamp, bypassCooldown: false });
    }
  };

  // Premium pixel placement
  const handlePremiumPixelPlacement = async (x: number, y: number) => {
    if (!address || !isConnected || isPlacingPremiumPixel) return;

    setIsPlacingPremiumPixel(true);
    try {
      setPendingPixel({ x, y });
      await approveTokens();
    } catch (error) {
      setPendingPixel(null);
    } finally {
      setIsPlacingPremiumPixel(false);
    }
  };

  // Approval confirmation handling
  useEffect(() => {
    if (isApproveConfirmed && pendingPixel) {
      const oneDayAgo = new Date().getTime() - (24 * 60 * 60 * 1000);
      sendUserAction("placePixel", { 
        x: pendingPixel.x, 
        y: pendingPixel.y, 
        timestamp: oneDayAgo,
        bypassCooldown: true 
      });
      setPendingPixel(null);
    }
  }, [isApproveConfirmed, pendingPixel, sendUserAction]);

  // Clear pending pixel when approval is cancelled
  useEffect(() => {
    if (!isApprovalPending && !isApproveConfirming && !isApproveConfirmed && pendingPixel) {
      setPendingPixel(null);
    }
  }, [isApprovalPending, isApproveConfirming, isApproveConfirmed, pendingPixel]);

  // RainbowKit CSS fixes
  useEffect(() => {
    const styleId = 'rainbowkit-fixes';
    let existingStyle = document.getElementById(styleId);
    
    if (!existingStyle) {
      existingStyle = document.createElement('style');
      existingStyle.id = styleId;
      existingStyle.textContent = `
        /* Override any conflicting styles */
        * {
          box-sizing: border-box !important;
        }
        
        /* Prevent horizontal scrolling */
        html, body {
          overflow-x: hidden !important;
        }
        
        /* Ensure RainbowKit buttons are clickable */
        [data-rk] button,
        [data-rk] [role="button"] {
          pointer-events: auto !important;
          cursor: pointer !important;
        }
        
        /* RainbowKit Text Colors */
        [data-rk] .ju367vgu {
          color: #8b5cf6 !important;
        }
        
        [data-rk] .ju367vgu:hover {
          color: #9333ea !important;
        }
        
      
        
        /* Easter Egg Animations */
        @keyframes easterEggPulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            box-shadow: 0 20px 60px rgba(147, 51, 234, 0.3);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.05);
            box-shadow: 0 30px 80px rgba(147, 51, 234, 0.5);
          }
        }
        
        @keyframes particleFloat {
          0% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          100% {
            opacity: 0;
            transform: scale(0) translateY(-50px);
          }
        }
        
        /* Canvas spinning animation */
        @keyframes canvasSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `;
      document.head.appendChild(existingStyle);
    }

    return () => {
      // Don't remove the style on cleanup to keep it persistent
    };
  }, []);

  // Responsive layout
  useEffect(() => {
    const handleResize = () => {
      const isMobileView = window.innerWidth <= 768;
      setIsMobile(isMobileView);
      
      const container = document.querySelector('[data-pixel-container]') as HTMLElement;
      const colorPalette = document.querySelector('[data-color-palette]') as HTMLElement;
      const userInfoPanel = document.querySelector('[data-user-info]') as HTMLElement;
      const connectButtonContainer = document.querySelector('[data-connect-button]') as HTMLElement;
      const canvasContainer = document.querySelector('[data-canvas-container]') as HTMLElement;
      
      if (container && colorPalette && userInfoPanel && connectButtonContainer && canvasContainer) {
        if (isMobileView) {
          // Mobile layout
          container.style.padding = '10px';
          container.style.paddingTop = '60px'; // Space for connect button
          container.style.overflow = 'visible';
          container.style.minHeight = '100vh';
          
          // Connect button - top center
          connectButtonContainer.style.position = 'fixed';
          connectButtonContainer.style.top = '10px';
          connectButtonContainer.style.left = '50%';
          connectButtonContainer.style.transform = 'translateX(-50%)';
          connectButtonContainer.style.zIndex = '1000';
          connectButtonContainer.style.marginBottom = '0';
          
          // Color palette - top of content
          colorPalette.style.position = 'relative';
          colorPalette.style.left = 'auto';
          colorPalette.style.top = 'auto';
          colorPalette.style.transform = 'none';
          colorPalette.style.marginBottom = '20px';
          colorPalette.style.width = '100%';
          colorPalette.style.maxWidth = '100%';
          
          // Canvas container - center
          canvasContainer.style.display = 'flex';
          canvasContainer.style.flexDirection = 'column';
          canvasContainer.style.alignItems = 'center';
          canvasContainer.style.justifyContent = 'center';
          canvasContainer.style.marginBottom = '20px';
          canvasContainer.style.overflow = 'hidden';
          
          // User info panel - bottom
          userInfoPanel.style.position = 'fixed';
          userInfoPanel.style.bottom = '10px';
          userInfoPanel.style.left = '10px';
          userInfoPanel.style.right = '10px';
          userInfoPanel.style.top = 'auto';
          userInfoPanel.style.width = 'auto';
          userInfoPanel.style.marginTop = '0';
          userInfoPanel.style.marginBottom = '0';
          userInfoPanel.style.zIndex = '1000';
          userInfoPanel.style.maxHeight = '40vh';
          userInfoPanel.style.overflowY = 'auto';
          
        } else {
          // Desktop layout
          container.style.overflow = 'visible';
          container.style.minHeight = '100vh';
          
          // Connect button - top right
          connectButtonContainer.style.position = 'fixed';
          connectButtonContainer.style.top = '20px';
          connectButtonContainer.style.right = '20px';
          connectButtonContainer.style.left = 'auto';
          connectButtonContainer.style.transform = 'none';
          connectButtonContainer.style.marginBottom = '0';
          
          // Color palette - top left
          colorPalette.style.position = 'fixed';
          colorPalette.style.left = '20px';
          colorPalette.style.top = '20px';
          colorPalette.style.transform = 'none';
          colorPalette.style.marginBottom = '0';
          colorPalette.style.width = 'auto';
          colorPalette.style.maxWidth = 'none';
          
          // Canvas container - center
          canvasContainer.style.display = 'block';
          canvasContainer.style.flexDirection = 'unset';
          canvasContainer.style.alignItems = 'unset';
          canvasContainer.style.justifyContent = 'unset';
          canvasContainer.style.marginBottom = '0';
          canvasContainer.style.overflow = 'hidden';
          
          // User info panel - right side
          userInfoPanel.style.position = 'fixed';
          userInfoPanel.style.top = '100px';
          userInfoPanel.style.right = '20px';
          userInfoPanel.style.left = 'auto';
          userInfoPanel.style.bottom = 'auto';
          userInfoPanel.style.width = '280px';
          userInfoPanel.style.marginTop = '60px';
          userInfoPanel.style.marginBottom = '0';
          userInfoPanel.style.maxHeight = 'none';
          userInfoPanel.style.overflowY = 'visible';
        }
      }
    };
    
    // Initial call and then on resize
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Render
  return (
    <div style={{
      ...styles.container,
      overflow: 'visible',
      overflowX: zoom > 1 ? 'auto' : 'hidden',
      minHeight: '100vh',
    }} data-pixel-container>
      {!isConnected ? (
        <div style={{
          ...styles.container,
          padding: '0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
        }}>
          <div style={styles.walletConnect}>
            <h1 style={styles.walletConnectTitle}>🎨 Monad Place</h1>
            <p style={styles.walletConnectText}>Connect your wallet to start creating pixel art!</p>
            <p style={styles.walletConnectText}>🕐 One pixel per minute</p>
            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center' }}>
              <div style={{
                position: 'relative',
                zIndex: 1001,
                background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                border: '2px solid rgba(147, 51, 234, 0.4)',
                borderRadius: '20px',
                padding: '4px',
                boxShadow: '0 8px 25px rgba(147, 51, 234, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
                <ConnectButton />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div style={styles.connectButtonContainer} data-connect-button>
            <ConnectButton />
          </div>

          {/* Easter Egg Message */}
          {showEasterEggMessage && (
            <div style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.95) 0%, rgba(139, 92, 246, 0.95) 100%)',
              border: '2px solid rgba(147, 51, 234, 0.8)',
              borderRadius: '20px',
              padding: '30px 40px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 60px rgba(147, 51, 234, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              zIndex: 9999,
              animation: 'easterEggPulse 4s ease-in-out',
              textAlign: 'center',
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              textShadow: '0 0 20px rgba(255, 255, 255, 0.5)',
            }}>
              🎉 JOHN W RICH KID 🎉
              <br />
              <span style={{fontSize: '1rem', opacity: 0.9}}>
                ✨ Fock JOHNNNNN
              </span>
            </div>
          )}

          {/* Color Palette Component */}
          <ColorPalette
            selectedColor={selectedColor}
            onColorSelect={handleColorSelect}
            isPremiumPaletteActive={isPremiumPaletteActive}
          />

          {/* Canvas */}
          <div 
            ref={containerRef}
            style={{
              ...styles.canvasContainer,
              width: `${DISPLAY_WIDTH}px`,
              height: `${DISPLAY_HEIGHT}px`,
              transform: `rotate(${canvasRotation}deg) translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
              transition: isCanvasSpinning ? 'none' : 'transform 0.5s ease-out',
              overflow: 'hidden',
              position: 'relative',
              right: '200px',
              marginLeft: 'auto',
              marginRight: '200px',
              minWidth: `${DISPLAY_WIDTH}px`,
              cursor: isDragging ? 'grabbing' : 'grab',
              ...(isMobile && {
                maxWidth: '100vw',
                maxHeight: '80vh',
                width: 'auto',
                height: 'auto',
                aspectRatio: '1',
                margin: '0 auto',
                right: 'auto',
                marginRight: 'auto',
                minWidth: 'auto',
              })
            }}
            data-canvas-container
          >
            <canvas
              ref={canvasRef}
              width={DISPLAY_WIDTH}
              height={DISPLAY_HEIGHT}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
              onMouseUp={handleCanvasMouseUp}
              onMouseDown={handleCanvasMouseDown}
              onWheel={handleCanvasWheel}
              style={{
                ...styles.canvas,
                cursor: cooldownRemaining > 0 ? 'not-allowed' : (isDragging ? 'grabbing' : 'grab'),
                ...(isMobile && {
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: '100%',
                  height: '100%',
                  touchAction: 'none',
                })
              }}
            />
          </div>

          {/* Zoom Controls */}
          <div style={{
            textAlign: 'center',
            marginTop: '8px',
            fontSize: isMobile ? '0.8rem' : '0.9rem',
            color: 'rgba(255, 255, 255, 0.7)',
            fontFamily: 'Fira Code, monospace',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? '4px' : '8px',
            flexWrap: 'wrap',
            padding: '16px 0px',
            width: `${DISPLAY_WIDTH}px`,
            position: 'relative',
            right: '200px',
            marginLeft: 'auto',
            marginRight: '200px',
            transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
            transition: isCanvasSpinning ? 'none' : 'transform 0.5s ease-out',
            ...(isMobile && {
              width: 'auto',
              maxWidth: '100vw',
              right: 'auto',
              marginRight: 'auto',
              transform: 'none',
            })
          }}>
            <button
              onClick={() => setZoom(Math.max(MIN_ZOOM, zoom - 0.1))}
              style={{
                background: 'rgba(147, 51, 234, 0.2)',
                border: '1px solid rgba(147, 51, 234, 0.4)',
                borderRadius: '4px',
                color: '#c084fc',
                padding: isMobile ? '4px 8px' : '2px 6px',
                cursor: 'pointer',
                fontSize: isMobile ? '0.9rem' : '0.8rem',
                minWidth: isMobile ? '32px' : 'auto',
                touchAction: 'manipulation',
              }}
            >
              -
            </button>
            <span style={{ fontSize: isMobile ? '0.8rem' : '0.9rem' }}>
              🔍 {(zoom * 100).toFixed(0)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(MAX_ZOOM, zoom + 0.1))}
              style={{
                background: 'rgba(147, 51, 234, 0.2)',
                border: '1px solid rgba(147, 51, 234, 0.4)',
                borderRadius: '4px',
                color: '#c084fc',
                padding: isMobile ? '4px 8px' : '2px 6px',
                cursor: 'pointer',
                fontSize: isMobile ? '0.9rem' : '0.8rem',
                minWidth: isMobile ? '32px' : 'auto',
                touchAction: 'manipulation',
              }}
            >
              +
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setCanvasOffset({ x: 0, y: 0 });
              }}
              style={{
                background: 'rgba(147, 51, 234, 0.2)',
                border: '1px solid rgba(147, 51, 234, 0.4)',
                borderRadius: '4px',
                color: '#c084fc',
                padding: isMobile ? '4px 8px' : '2px 6px',
                cursor: 'pointer',
                fontSize: isMobile ? '0.9rem' : '0.8rem',
                minWidth: isMobile ? '50px' : 'auto',
                touchAction: 'manipulation',
              }}
            >
              Reset
            </button>
          </div>

          {/* Easter Egg Particles */}
          {easterEggParticles.map((particle, index) => (
            <div
              key={index}
              style={{
                position: 'fixed',
                left: particle.x,
                top: particle.y,
                width: '8px',
                height: '8px',
                background: particle.color,
                borderRadius: '50%',
                pointerEvents: 'none',
                zIndex: 9998,
                opacity: particle.life,
                transform: `scale(${particle.life})`,
                boxShadow: `0 0 20px ${particle.color}`,
                animation: 'particleFloat 2s ease-out forwards',
              }}
            />
          ))}

          {/* Created by semihdurgun */}
          <div style={{
            position: 'fixed',
            bottom: isMobile ? '5px' : '10px',
            left: isMobile ? '5px' : '10px',
            zIndex: 1,
            fontSize: isMobile ? '0.7rem' : '0.8rem',
            color: 'rgba(255, 255, 255, 0.6)',
            fontFamily: 'Fira Code, monospace',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: isMobile ? '3px 6px' : '4px 8px',
            borderRadius: '4px',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(147, 51, 234, 0.2)',
            transition: 'all 0.3s ease',
            ...(isMobile && {
              maxWidth: 'calc(100vw - 20px)',
              wordBreak: 'break-word',
            })
          }}>
            Created by s3h | m⨀n
          </div>

          {/* User Info Panel */}
          <div style={{
            ...styles.userInfoPanel,
            ...(userInfoCollapsed ? styles.userInfoPanelCollapsed : {})
          }} data-user-info>
            <div style={styles.panelHeader} onClick={() => setUserInfoCollapsed(!userInfoCollapsed)}>
              <h3 style={{
                ...styles.panelTitle,
                ...(userInfoCollapsed ? styles.panelTitleCollapsed : {})
              }}>
                Info
              </h3>
              <button style={styles.collapseButton}>
                {userInfoCollapsed ? '→' : '←'}
              </button>
            </div>
            {!userInfoCollapsed && (
              <div style={styles.userInfoPanelContent}>
                <p style={styles.userInfoPanelText}>
                  🎯 Pixels placed: {address && typeof address === 'string' ? (users[address]?.pixelsPlaced || 0) : 0}
                </p>
                <p style={styles.userInfoPanelText}>
                  ⏰ {cooldownRemaining > 0 ? `Cooldown: ${formatTime(cooldownRemaining)}` : '✅ Ready to place!'}
                </p>
                <p style={{...styles.userInfoPanelText, color: '#10b981', fontWeight: 'bold'}}>
                  👥 Online: {Math.floor((rootModel?.users?.size || 0) / 2)} users
                </p>
                <p style={{...styles.userInfoPanelText, color: '#c084fc', fontWeight: 'bold'}}>
                  🎨 Total Nads: {Object.keys(users).length} users
                </p>
                
                {/* Premium Mode Switch */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'rgba(147, 51, 234, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(147, 51, 234, 0.2)',
                  marginTop: '8px'
                }}>
                  <span style={{fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.9)'}}>
                    {isPremiumMode ? '🔥 Premium Mode' : '⏰ Normal Mode'}
                  </span>
                  <button
                    onClick={() => setIsPremiumMode(!isPremiumMode)}
                    style={{
                      background: isPremiumMode ? 'rgba(147, 51, 234, 0.8)' : 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(147, 51, 234, 0.4)',
                      borderRadius: '12px',
                      width: '40px',
                      height: '20px',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '2px',
                      left: isPremiumMode ? '22px' : '2px',
                      width: '14px',
                      height: '14px',
                      background: '#fff',
                      borderRadius: '50%',
                      transition: 'all 0.3s ease'
                    }} />
                  </button>
                </div>
                
                {/* Premium Mode Info */}
                {isPremiumMode && (
                  <div style={{
                    padding: '8px 12px',
                    background: 'rgba(147, 51, 234, 0.15)',
                    borderRadius: '8px',
                    border: '1px solid rgba(147, 51, 234, 0.3)',
                    marginTop: '8px'
                  }}>
                    <p style={{fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)', margin: '0 0 4px 0'}}>
                      🔥 Cost per pixel: {burnAmountFormatted} MON
                    </p>
                    <p style={{fontSize: '0.8rem', color: '#10b981', margin: '0 0 8px 0'}}>
                      ✨ Premium: Approve → Cooldown Reset → Instant Pixel
                    </p>
                    {isPlacingPremiumPixel && (
                      <p style={{fontSize: '0.85rem', color: '#a855f7', margin: '4px 0 0 0'}}>
                        🔄 Approving tokens...
                      </p>
                    )}
                    {pendingPixel && (
                      <p style={{fontSize: '0.85rem', color: '#fbbf24', margin: '4px 0 0 0'}}>
                        ⏳ Waiting for approval confirmation...
                      </p>
                    )}
                    {isApproveConfirming && (
                      <p style={{fontSize: '0.85rem', color: '#10b981', margin: '4px 0 0 0'}}>
                        ✅ Approval confirmed! Placing pixel...
                      </p>
                    )}
                  </div>
                )}
                
                <p style={styles.userInfoPanelText}>🔥 Burn per pixel: {burnAmountFormatted} MON</p>
                {isPlacingPixel && (
                  <p style={{...styles.userInfoPanelText, color: '#a855f7'}}>
                    🔄 Placing pixel...
                  </p>
                )}
                
                {/* Nads Leaderboard Section */}
                <div style={{marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(147, 51, 234, 0.2)'}}>
                  <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#c084fc',
                    textAlign: 'center' as const,
                  }}>
                    Top Nads
                  </h3>
                  <div style={{
                    display: 'flex', 
                    flexDirection: 'column' as const, 
                    gap: '8px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    paddingRight: '4px'
                  }}>
                    {Object.values(users)
                      .filter((user: any) => user.pixelsPlaced > 0)
                      .sort((a: any, b: any) => b.pixelsPlaced - a.pixelsPlaced)
                      .slice(0, 5)
                      .map((user: any, index: number) => (
                        <div 
                          key={user.address}
                          style={{
                            padding: '8px 12px',
                            background: index === 0 ? 'linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)' : 'rgba(147, 51, 234, 0.1)',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            color: 'rgba(255, 255, 255, 0.9)',
                            border: index === 0 ? '1px solid rgba(147, 51, 234, 0.4)' : '1px solid rgba(147, 51, 234, 0.2)',
                          }}
                        >
                          <span style={{fontWeight: 500}}>
                            {index + 1}. {user.address === address ? '👑 You' : `${user.address.slice(0, 6)}...${user.address.slice(-4)}`} 
                          </span>
                          <span style={{float: 'right', fontWeight: 600}}>
                            {user.pixelsPlaced} pixels 
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PixelCanvasApp; 