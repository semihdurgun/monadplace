// Canvas Configuration
export const CANVAS_WIDTH = 100; // 100x100 pixel grid
export const CANVAS_HEIGHT = 100;
export const PIXEL_SIZE = 7.2; // Reduced from 10 to 8 pixels on screen
export const COOLDOWN_TIME = 10; // 10 seconds between pixel placements
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3;

// Color Palette (r/Place style)
export const COLOR_PALETTE = [
  '#FFFFFF', '#E4E4E4', '#888888', '#222222', // Grayscale
  '#FFA7D1', '#E50000', '#E59500', '#A06A42', // Pinks & Browns  
  '#E5D900', '#94E044', '#02BE01', '#00D3DD', // Yellows & Greens
  '#0083C7', '#0000EA', '#CF6EE4', '#820080', // Blues & Purples
];

// Premium Gradient Color Palette (Easter Egg) - 48 Unique Colors
export const PREMIUM_GRADIENT_PALETTE = [
  // Vibrant Reds & Pinks (7 colors)
  '#FF6B6B', '#FF4757', '#FF3838', '#FF1744', '#F50057', '#E91E63', '#C2185B',
  
  // Vibrant Oranges & Yellows (8 colors)
  '#FFA726', '#FF9800', '#FF8F00', '#FF6F00', '#FF5722', '#FF3D00', '#FFC107', '#FFB300',
  
  // Vibrant Greens (8 colors)
  '#4CAF50', '#8BC34A', '#CDDC39', '#9CCC65', '#7CB342', '#689F38', '#66BB6A', '#43A047',
  
  // Vibrant Blues & Cyans (8 colors)
  '#2196F3', '#03A9F4', '#00BCD4', '#0097A7', '#00ACC1', '#26C6DA', '#4FC3F7', '#29B6F6',
  
  // Vibrant Purples & Magentas (8 colors)
  '#9C27B0', '#673AB7', '#3F51B5', '#5C6BC0', '#7986CB', '#9FA8DA', '#C5CAE9', '#E8EAF6',
  
  // Neon & Electric Colors (8 colors)
  '#FF00FF', '#00FFFF', '#FFFF00', '#FF0080', '#8000FF', '#00FF80', '#FF8000', '#0080FF',
  
  // Pastel & Soft Colors (8 colors)
  '#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#FFB3F7', '#B3F7FF', '#F7B3FF', '#B3FFF7',
  
  // Metallic & Shimmer Colors (8 colors)
  '#FFD700', '#C0C0C0', '#CD7F32', '#B8860B', '#DAA520', '#F4A460', '#DEB887', '#D2B48C',
  
  // Additional Unique Colors (7 colors)
  '#FF1493', '#00CED1', '#32CD32', '#FF4500', '#8A2BE2', '#FF69B4', '#00FA9A'
]; 