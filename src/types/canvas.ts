export interface Pixel {
  color: string;
  owner: string;
  timestamp: number;
  x: number;
  y: number;
}

export interface UserData {
  address: string;
  pixelsPlaced: number;
  lastPixelTime: number;
  totalTokensSpent: number;
}

export interface EasterEggParticle {
  x: number;
  y: number;
  color: string;
  life: number;
}

// Add Multisynq to window type
declare global {
  interface Window { 
    Multisynq: any; 
  }
} 