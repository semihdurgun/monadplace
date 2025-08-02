import { useEffect, useRef, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  PIXEL_SIZE, 
  COOLDOWN_TIME, 
  MIN_ZOOM, 
  MAX_ZOOM,
  COLOR_PALETTE 
} from '../constants/canvas';
import { MULTISYNQ_API_KEY, MULTISYNQ_APP_ID } from '../constants/config';
import { Pixel, UserData } from '../types/canvas';

export const useMultisynq = (burnAmountFormatted: string) => {
  const { address, isConnected } = useAccount();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Multisynq state
  const [session, setSession] = useState<any>(null);
  const [myUserModel, setMyUserModel] = useState<any>(null);
  const [rootModel, setRootModel] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<Record<string, UserData>>({});
  const [pixelCanvas, setPixelCanvas] = useState<Record<string, Pixel>>({});
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [hoveredPixel, setHoveredPixel] = useState<{x: number, y: number} | null>(null);
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  const reconnectIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Multisynq initialization
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@multisynq/client@1.0.1/bundled/multisynq-client.min.js';
    script.async = true;
    script.onload = () => {
      // Wait a bit for Multisynq to be fully loaded
      setTimeout(() => {
        if (window.Multisynq) {
          initPixelCanvas();
        }
      }, 100);
    };
    document.head.appendChild(script);

    return () => {
      const existingScript = document.head.querySelector('script[src*="multisynq-client.min.js"]');
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
      if (session) {
        session.leave();
      }
      if (reconnectIntervalRef.current) {
        clearInterval(reconnectIntervalRef.current);
        reconnectIntervalRef.current = null;
      }
    };
  }, []);

  // Multisynq session management
  useEffect(() => {
    if (isConnected && address && window.Multisynq) {
      if (session) {
        session.leave();
        setSession(null);
        setRootModel(null);
        setMyUserModel(null);
      }
      
      // Clear any existing reconnect interval
      if (reconnectIntervalRef.current) {
        clearInterval(reconnectIntervalRef.current);
        reconnectIntervalRef.current = null;
      }
      
      setTimeout(() => {
        if (window.Multisynq) {
          initPixelCanvas();
        }
      }, 500);
    }
  }, [isConnected, address]);

  // Periodic reconnect every 30 seconds
  useEffect(() => {
    if (!isConnected || !address || !window.Multisynq) return;

    const performReconnect = () => {
      console.log('Performing periodic reconnect...');
      if (session) {
        session.leave();
        setSession(null);
        setRootModel(null);
        setMyUserModel(null);
      }
      
      setTimeout(() => {
        if (window.Multisynq) {
          initPixelCanvas();
        }
      }, 1000);
    };

    // Start periodic reconnect every 60 seconds
    reconnectIntervalRef.current = setInterval(performReconnect, 60000);

    return () => {
      if (reconnectIntervalRef.current) {
        clearInterval(reconnectIntervalRef.current);
        reconnectIntervalRef.current = null;
      }
    };
  }, [isConnected, address, session]);

  // Canvas drawing
  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    // Draw pixels
    Object.values(pixelCanvas).forEach(pixel => {
      if (pixel && pixel.x >= 0 && pixel.x < CANVAS_WIDTH && pixel.y >= 0 && pixel.y < CANVAS_HEIGHT) {
        ctx.fillStyle = pixel.color;
        ctx.fillRect(
          pixel.x * PIXEL_SIZE * zoom,
          pixel.y * PIXEL_SIZE * zoom,
          PIXEL_SIZE * zoom,
          PIXEL_SIZE * zoom
        );
        
        // Add subtle border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 0.5 * zoom;
        ctx.strokeRect(
          pixel.x * PIXEL_SIZE * zoom,
          pixel.y * PIXEL_SIZE * zoom,
          PIXEL_SIZE * zoom,
          PIXEL_SIZE * zoom
        );
      }
    });

    // Draw grid
    ctx.strokeStyle = 'rgba(147, 51, 234, 0.2)';
    ctx.lineWidth = 0.5 * zoom;
    for (let x = 0; x <= CANVAS_WIDTH; x++) {
      ctx.beginPath();
      ctx.moveTo(x * PIXEL_SIZE * zoom, 0);
      ctx.lineTo(x * PIXEL_SIZE * zoom, CANVAS_HEIGHT * PIXEL_SIZE * zoom);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * PIXEL_SIZE * zoom);
      ctx.lineTo(CANVAS_WIDTH * PIXEL_SIZE * zoom, y * PIXEL_SIZE * zoom);
      ctx.stroke();
    }

    // Highlight hovered pixel
    if (hoveredPixel) {
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 3 * zoom;
      ctx.setLineDash([5 * zoom, 5 * zoom]);
      ctx.strokeRect(
        hoveredPixel.x * PIXEL_SIZE * zoom,
        hoveredPixel.y * PIXEL_SIZE * zoom,
        PIXEL_SIZE * zoom,
        PIXEL_SIZE * zoom
      );
      ctx.setLineDash([]);
    }
  }, [pixelCanvas, hoveredPixel, selectedColor, zoom]);

  // Multisynq initialization function
  const initPixelCanvas = () => {
    if (!window.Multisynq || !canvasRef.current) {
      console.log('Multisynq not loaded or canvas not ready');
      return;
    }
    
    const Multisynq = window.Multisynq;
    console.log('Initializing Multisynq with models...');

    // User Model
    class User extends Multisynq.Model {
      init(props: { viewId: string }) {
        this.viewId = props.viewId;
        this.address = null;
        this.selectedColor = COLOR_PALETTE[0];
        this.pixelsPlaced = 0;
        this.totalTokensSpent = 0;
        this.lastPixelTime = 0;
        
        this.subscribe(this.viewId, "user-actions", this.handleUserAction);
      }

      handleUserAction(action: { type: string, payload: any }) {
        switch(action.type) {
          case "setAddress":
            this.address = action.payload.address;
            this.root.markDataDirty();
            break;
          case "selectColor":
            this.selectedColor = action.payload.color;
            this.root.markDataDirty();
            break;
          case "placePixel":
            this.tryPlacePixel(action.payload.x, action.payload.y, action.payload.timestamp, action.payload.bypassCooldown);
            break;
        }
      }

      tryPlacePixel(x: number, y: number, timestamp?: number, bypassCooldown?: boolean) {
        if (!this.address) return;
        
        if (this.lastPixelTime === 0) {
          let latestTimestamp = 0;
          for (const pixel of this.root.pixelCanvas.values()) {
            if (pixel.owner === this.address && pixel.timestamp > latestTimestamp) {
              latestTimestamp = pixel.timestamp;
            }
          }
          if (latestTimestamp > 0) {
            this.lastPixelTime = latestTimestamp;
          }
        }
        
        const now = timestamp || new Date().getTime();
        const timeSinceLastPixel = (now - this.lastPixelTime) / 1000;
        
        if (!bypassCooldown && timeSinceLastPixel < COOLDOWN_TIME && this.lastPixelTime !== 0) {
          return;
        }

        if (!bypassCooldown) {
          this.lastPixelTime = now;
        }
        
        this.pixelsPlaced += 1;
        this.totalTokensSpent += parseFloat(burnAmountFormatted) || 0;
        this.root.placePixelOnCanvas(x, y, this.selectedColor, this.address, now);
        this.root.markDataDirty();
      }
      
      get root() { return this.wellKnownModel("modelRoot"); }
    }

    // Main Model
    class PixelCanvasModel extends Multisynq.Model {
      init(_: any, persisted: any) {
        this.pixelCanvas = new Map(persisted?.pixelCanvas ?? []);
        this.users = new Map();
        this.dataVersion = 0;
        this.subscribe(this.sessionId, "view-join", this.userJoined);
        this.subscribe(this.sessionId, "view-exit", this.userExited);
      }
      
      markDataDirty() {
        this.dataVersion++;
        this.persistSession({
          pixelCanvas: Array.from(this.pixelCanvas.entries())
        });
      }
      
      userJoined(arg: any) {
        let viewId: string | undefined;
        let address: string | undefined;
        if (typeof arg === 'string') {
          viewId = arg;
          address = undefined;
        } else if (typeof arg === 'object' && arg !== null) {
          viewId = arg.viewId;
          address = arg.address;
        }
        if (!viewId) return;
        const userKey = address || viewId;
        let user = this.users.get(userKey);
        if (!user) {
          user = User.create({ viewId: userKey });
          user.address = address || null;
          this.users.set(userKey, user);
        }
        this.markDataDirty();
      }
      
      userExited(viewId: string) {
        const user = this.users.get(viewId);
        if (user) {
          this.users.delete(viewId);
          user.destroy();
          this.markDataDirty();
        }
      }
      
      placePixelOnCanvas(x: number, y: number, color: string, address: string, timestamp?: number) {
        const now = timestamp || new Date().getTime();
        this.pixelCanvas.set(`${x},${y}`, { x, y, color, owner: address, timestamp: now });
        this.markDataDirty();
      }
    }

    // View
    class PixelCanvasView extends Multisynq.View {
      constructor(model: any) {
        super(model);
        this.canvas = canvasRef.current;
        this.ctx = this.canvas.getContext('2d');
        this.zoom = 1;
        this.hoveredPixel = null;
        this.selectedColor = COLOR_PALETTE[0];
        this.setupInput();
      }
      
      setupInput() {
        if (!this.canvas) return;
        this.canvas.addEventListener('wheel', (event: WheelEvent) => {
          event.preventDefault();
          const delta = event.deltaY > 0 ? -0.1 : 0.1;
          const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoom + delta));
          this.zoom = newZoom;
          this.update();
        });
      }
    }

    // Register models with proper error handling
    try {
      console.log('Registering User model...');
      User.register("User");
      console.log('User model registered successfully');
    } catch (error) {
      console.log('User model already registered or error:', error);
    }

    try {
      console.log('Registering PixelCanvasModel...');
      PixelCanvasModel.register("PixelCanvasModel");
      console.log('PixelCanvasModel registered successfully');
    } catch (error) {
      console.log('PixelCanvasModel already registered or error:', error);
    }

    const PUBLIC_PIXEL_CANVAS_ID = "monad-pixel-canvas";
    const urlParams = new URLSearchParams(window.location.search);
    const queryParamId = urlParams.get('q');
    const sessionIdToJoin = queryParamId || PUBLIC_PIXEL_CANVAS_ID;

    console.log('Joining Multisynq session...', sessionIdToJoin);

    Multisynq.Session.join({   
      apiKey: MULTISYNQ_API_KEY,
      appId: MULTISYNQ_APP_ID,
      password: "123456",
      id: sessionIdToJoin, 
      name: sessionIdToJoin,
      model: PixelCanvasModel, 
      view: PixelCanvasView 
    })
    .then((joinedSession: any) => {
      setSession(joinedSession);
      setRootModel(joinedSession.model);

      if (joinedSession.model.persistentData) {
        if (joinedSession.model.persistentData.pixelCanvas) {
          const pixelCanvasData = Object.fromEntries(joinedSession.model.persistentData.pixelCanvas);
          setPixelCanvas(pixelCanvasData);
        }
      }

      const myViewId = joinedSession.view?.viewId;
      if (joinedSession.view && myViewId) {
        joinedSession.view.publish(joinedSession.model.sessionId, "view-join", myViewId);
      }

      const waitForUser = () => {
        const user = joinedSession.model.users.get(myViewId);
        if (user) {
          setMyUserModel(user);
          
          if (user.address) {
            setAllUsers(prev => ({
              ...prev,
              [user.address]: {
                address: user.address,
                pixelsPlaced: user.pixelsPlaced || 0,
                lastPixelTime: user.lastPixelTime || 0,
                totalTokensSpent: user.totalTokensSpent || 0,
              }
            }));
          }
        } else {
          setTimeout(waitForUser, 100);
        }
      };
      waitForUser();

      if (window.history.replaceState) {
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
      }
    }).catch((error: any) => {
      console.error('Failed to start session:', error);
      // Retry after a delay
      setTimeout(() => {
        if (window.Multisynq) {
          console.log('Retrying session join...');
          initPixelCanvas();
        }
      }, 2000);
    });
  };

  // Sync with Multisynq model
  useEffect(() => {
    if (!rootModel) return;

    let animationFrameId: number;
    let lastVersion = -1;

    const syncLoop = () => {
      if (rootModel.dataVersion !== lastVersion) {
        lastVersion = rootModel.dataVersion;
        
        const usersData: Record<string, UserData> = {};
        
        for (const [userKey, user] of rootModel.users.entries()) {
          if (user.address) {
            usersData[user.address] = {
              address: user.address,
              pixelsPlaced: user.pixelsPlaced,
              lastPixelTime: user.lastPixelTime,
              totalTokensSpent: user.totalTokensSpent,
            };
          }
        }
        
        if (rootModel.pixelCanvas && typeof rootModel.pixelCanvas.entries === 'function') {
          const pixelCanvasData = Object.fromEntries(rootModel.pixelCanvas.entries());
          
          const userPixelCounts: Record<string, number> = {};
          
          Object.values(pixelCanvasData).forEach((pixel: any) => {
            if (pixel.owner) {
              userPixelCounts[pixel.owner] = (userPixelCounts[pixel.owner] || 0) + 1;
            }
          });
          
          Object.keys(userPixelCounts).forEach(address => {
            if (usersData[address]) {
              usersData[address].pixelsPlaced = userPixelCounts[address];
            } else {
              usersData[address] = {
                address: address,
                pixelsPlaced: userPixelCounts[address],
                lastPixelTime: 0,
                totalTokensSpent: userPixelCounts[address] * (parseFloat(burnAmountFormatted) || 0.0001),
              };
            }
          });
        }
        
        setAllUsers(usersData);
        
        if (address && rootModel.users && typeof rootModel.users.get === 'function') {
          const latestUser = rootModel.users.get(address);
          if (latestUser) {
            setMyUserModel(latestUser);
          }
        }
        
        if (rootModel.pixelCanvas && typeof rootModel.pixelCanvas.entries === 'function') {
          const newPixelCanvas = Object.fromEntries(rootModel.pixelCanvas.entries());
          setPixelCanvas(newPixelCanvas);
        }
        
        if (myUserModel && myUserModel.selectedColor) {
          setSelectedColor(myUserModel.selectedColor);
        }
      }
      animationFrameId = requestAnimationFrame(syncLoop);
    };

    syncLoop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [rootModel]);

  // Cooldown calculation
  useEffect(() => {
    if (!address || !allUsers[address]) return;
    
    const interval = setInterval(() => {
      let lastPixelTime = 0;
      if (rootModel?.pixelCanvas && typeof rootModel.pixelCanvas.entries === 'function') {
        const pixelCanvasData = Object.fromEntries(rootModel.pixelCanvas.entries());
        
        let latestTimestamp = 0;
        Object.values(pixelCanvasData).forEach((pixel: any) => {
          if (pixel.owner === address && pixel.timestamp > latestTimestamp) {
            latestTimestamp = pixel.timestamp;
          }
        });
        lastPixelTime = latestTimestamp;
      }
      
      const now = new Date().getTime();
      let cooldownRemaining = 0;
      
      if (lastPixelTime > 0) {
        const timeSinceLastPixel = (now - lastPixelTime) / 1000;
        cooldownRemaining = Math.max(0, COOLDOWN_TIME - timeSinceLastPixel);
      }
      
      setCooldownRemaining(Math.ceil(cooldownRemaining));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [address, allUsers, rootModel]);

  // Set user address when connected
  useEffect(() => {
    if (isConnected && address && session?.view) {
      session.view.publish(session.model.sessionId, "view-join", { viewId: session.view.viewId, address });
      session.view.publish(session.view.viewId, "user-actions", { type: "setAddress", payload: { address } });
    }
  }, [isConnected, address, session?.view]);

  // Send user action
  const sendUserAction = useCallback((type: string, payload: any) => {
    if (session?.view) {
      session.view.publish(session.view.viewId, "user-actions", { type, payload });
    }
  }, [session]);

  // Manual reconnect function
  const manualReconnect = useCallback(() => {
    console.log('Manual reconnect triggered...');
    if (session) {
      session.leave();
      setSession(null);
      setRootModel(null);
      setMyUserModel(null);
    }
    
    setTimeout(() => {
      if (window.Multisynq) {
        initPixelCanvas();
      }
    }, 1000);
  }, [session]);

  return {
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
    sendUserAction,
    manualReconnect
  };
}; 