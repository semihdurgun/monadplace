// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract PixelCanvas {
    // MON Token contract address (testnet)
    IERC20 public immutable monToken;
    
    // Burn amount: 0.0001 MON (assuming 18 decimals)
    uint256 public constant BURN_AMOUNT = 100000000000000; // 0.0001 * 10^18
    
    // Dead address for burning
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    
    // Cooldown time (60 seconds)
    uint256 public constant COOLDOWN_TIME = 60;
    
    struct Pixel {
        address owner;
        string color;
        uint256 timestamp;
    }
    
    // Canvas state
    mapping(uint256 => mapping(uint256 => Pixel)) public canvas;
    mapping(address => uint256) public lastPixelTime;
    mapping(address => uint256) public pixelsPlaced;
    
    // Events
    event PixelPlaced(
        address indexed user,
        uint256 x,
        uint256 y,
        string color,
        uint256 timestamp,
        uint256 burnedAmount
    );
    
    event TokensBurned(address indexed user, uint256 amount);
    
    constructor(address _monToken) {
        monToken = IERC20(_monToken);
    }
    
    function placePixel(uint256 x, uint256 y, string memory color) external {
        require(x < 100 && y < 100, "Coordinates out of bounds");
        require(bytes(color).length > 0, "Color cannot be empty");
        
        // Check cooldown
        require(
            block.timestamp >= lastPixelTime[msg.sender] + COOLDOWN_TIME,
            "Cooldown period not met"
        );
        
        // Check MON balance
        require(
            monToken.balanceOf(msg.sender) >= BURN_AMOUNT,
            "Insufficient MON balance"
        );
        
        // Burn MON tokens
        require(
            monToken.transferFrom(msg.sender, BURN_ADDRESS, BURN_AMOUNT),
            "Token burn failed"
        );
        
        // Update pixel
        canvas[x][y] = Pixel({
            owner: msg.sender,
            color: color,
            timestamp: block.timestamp
        });
        
        // Update user data
        lastPixelTime[msg.sender] = block.timestamp;
        pixelsPlaced[msg.sender]++;
        
        emit PixelPlaced(msg.sender, x, y, color, block.timestamp, BURN_AMOUNT);
        emit TokensBurned(msg.sender, BURN_AMOUNT);
    }
    
    function getPixel(uint256 x, uint256 y) external view returns (Pixel memory) {
        return canvas[x][y];
    }
    
    function getUserCooldown(address user) external view returns (uint256) {
        if (lastPixelTime[user] == 0) {
            return 0;
        }
        
        uint256 timePassed = block.timestamp - lastPixelTime[user];
        if (timePassed >= COOLDOWN_TIME) {
            return 0;
        }
        return COOLDOWN_TIME - timePassed;
    }
    
    function getUserStats(address user) external view returns (uint256 pixels, uint256 cooldown) {
        pixels = pixelsPlaced[user];
        
        // Calculate cooldown directly
        if (lastPixelTime[user] == 0) {
            cooldown = 0;
        } else {
            uint256 timePassed = block.timestamp - lastPixelTime[user];
            if (timePassed >= COOLDOWN_TIME) {
                cooldown = 0;
            } else {
                cooldown = COOLDOWN_TIME - timePassed;
            }
        }
    }
} 