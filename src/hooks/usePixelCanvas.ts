import { useCallback } from 'react';
// Correct imports for wagmi v2+
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther, parseUnits } from 'viem';
import { 
  PIXEL_CANVAS_ABI,
  ERC20_ABI,
  CONTRACT_ADDRESSES,
  BURN_AMOUNT 
} from '../contracts/pixelCanvas';

export const usePixelCanvas = () => {
  const { address, isConnected, chain } = useAccount();
  
  // Use useReadContract for ERC20 MON balance (not native)
  const { data: monBalance, error: monBalanceError, isLoading: monBalanceLoading } = useReadContract({
    abi: ERC20_ABI,
    address: CONTRACT_ADDRESSES.MON_TOKEN,
    functionName: 'balanceOf',
    args: [address],
    enabled: isConnected && !!address,
  });

  const { data: allowance, error: allowanceError, isLoading: allowanceLoading } = useReadContract({
    abi: ERC20_ABI,
    address: CONTRACT_ADDRESSES.MON_TOKEN,
    functionName: 'allowance',
    args: [address, CONTRACT_ADDRESSES.PIXEL_CANVAS],
    enabled: isConnected && !!address,
  });
  
  // WAGMI V2+ SYNTAX: useWriteContract
  const { 
    data: placePixelHash, 
    writeContract: placePixelWrite,
    isPending: isPlacePixelPending 
  } = useWriteContract();

  const { 
    data: approveHash, 
    writeContract: approveWrite,
    isPending: isApprovePending 
  } = useWriteContract();

  // wait
  const { data: approveConfirmation, isLoading: isApproveConfirming } = useWaitForTransactionReceipt({
    hash: approveHash,
  });
  
  const { 
    data: userStats, 
    error: userStatsError, 
    isLoading: userStatsLoading 
  } = useReadContract({
    abi: PIXEL_CANVAS_ABI,
    address: CONTRACT_ADDRESSES.PIXEL_CANVAS,
    functionName: 'getUserStats',
    args: [address],
    enabled: isConnected && !!address,
  });

  const { 
    data: pixelsPlaced, 
    error: pixelsPlacedError, 
    isLoading: pixelsPlacedLoading 
  } = useReadContract({
    abi: PIXEL_CANVAS_ABI,
    address: CONTRACT_ADDRESSES.PIXEL_CANVAS,
    functionName: 'pixelsPlaced',
    args: [address],
    enabled: isConnected && !!address,
  });
  
  const { isLoading: isPixelConfirming, isSuccess: isPixelConfirmed } = useWaitForTransactionReceipt({
    hash: placePixelHash,
  });
  
  // Call canPlacePixel function after userStats is defined
  const canPlacePixel = useCallback(() => {
    if (!allowance) return false;
    const burnAmountBigInt = parseUnits(BURN_AMOUNT, 0);
    return allowance >= burnAmountBigInt;
  }, [monBalance, allowance]);

  const needsApproval = useCallback(() => {
    if (!allowance) return true;
    const burnAmountBigInt = parseUnits(BURN_AMOUNT, 0);
    return allowance < burnAmountBigInt;
  }, [monBalance, allowance]);

  const approveTokens = useCallback(async () => {
    if (!approveWrite) return false;
    const approvalAmount = parseEther('0.0001'); // Approve 0.01 MON (enough for 100 pixels)
    
    try {
      const result = await approveWrite({
        address: CONTRACT_ADDRESSES.MON_TOKEN,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.PIXEL_CANVAS, approvalAmount],
      });
      
      // We got the transaction hash, hooks will handle the confirmation
      if (result) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }, [approveWrite]);

  const placePixel = useCallback(async (x: number, y: number, color: string) => {
    if (!placePixelWrite) {
      return;
    }
    
    // Add canPlacePixel check
    const canPlace = canPlacePixel();
    
    if (!canPlace) {
      return;
    }
    
    try {
      const result = placePixelWrite({
        address: CONTRACT_ADDRESSES.PIXEL_CANVAS,
        abi: PIXEL_CANVAS_ABI,
        functionName: 'placePixel',
        args: [Number(x), Number(y), String(color)], // Explicit casting for type safety
        // Remove value parameter, not needed for ERC20 transfer
      });
    } catch (error) {
      // Handle error silently
    }
  }, [placePixelWrite, canPlacePixel, needsApproval, monBalance, allowance]);

  // This function is still empty, you can fill it with a read call if needed
  const getPixel = useCallback(async (x: number, y: number) => {
    // Example: if you have a public getPixel function, you can call it here
    // This is a client-side read, so wagmi's readContract function can be used
    return null;
  }, []);

  const formatMonBalance = (balance: any) => {
    if (typeof balance === 'undefined') return '0';
    return formatEther(balance);
  };

  // Test function
 
  // Specific error logs
  if (userStatsError) {
    // Error handling for userStats
  }
  if (pixelsPlacedError) {
    // Error handling for pixelsPlaced
  }
  if (monBalanceError) {
    // Error handling for monBalance
  }
  if (allowanceError) {
    // Error handling for allowance
  }


  return {
    monBalance: monBalance || 0n,
    monBalanceFormatted: monBalance ? formatEther(monBalance) : '0',
    allowance: allowance || 0n,
    userStats,
    pixelsPlaced: pixelsPlaced || 0n,
    canPlacePixel: canPlacePixel(),
    needsApproval: needsApproval(),
    isPlacingPixel: isPlacePixelPending,
    isApprovalPending: isApprovePending,
    isApproveConfirming,
    isApproveConfirmed: approveConfirmation?.status === 'success',
    isPixelPending: isPixelConfirming,
    isPixelConfirmed,
    approveTokens,
    placePixel,
    getPixel,
    burnAmount: BURN_AMOUNT,
    burnAmountFormatted: formatEther(parseUnits(BURN_AMOUNT, 0)),
  };
}; 