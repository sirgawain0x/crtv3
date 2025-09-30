"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign } from 'lucide-react';
import { type TokenSymbol } from '@/lib/sdk/alchemy/swap-service';
import { priceService } from '@/lib/sdk/alchemy/price-service';

interface USDInputToggleProps {
  token: TokenSymbol;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
}

export function USDInputToggle({ 
  token, 
  value, 
  onChange, 
  disabled,
  className,
  placeholder = '0.0',
  readOnly = false,
}: USDInputToggleProps) {
  const [inputMode, setInputMode] = useState<'token' | 'usd'>('token');
  const [usdValue, setUsdValue] = useState('');

  // Update USD value when token value changes (from parent)
  useEffect(() => {
    if (inputMode === 'token' && value && parseFloat(value) > 0) {
      const updateUSD = async () => {
        try {
          const usd = await priceService.convertToUSD(parseFloat(value), token);
          setUsdValue(usd.toFixed(2));
        } catch (error) {
          console.error('Error converting to USD:', error);
        }
      };
      updateUSD();
    }
  }, [value, token, inputMode]);

  const handleModeToggle = () => {
    if (readOnly) return; // Don't toggle if read-only
    setInputMode(prev => prev === 'token' ? 'usd' : 'token');
  };

  const handleUSDInput = async (usdInput: string) => {
    setUsdValue(usdInput);
    if (!usdInput || parseFloat(usdInput) <= 0) {
      onChange('');
      return;
    }

    try {
      const tokenAmount = await priceService.convertFromUSD(
        parseFloat(usdInput),
        token
      );
      onChange(tokenAmount.toFixed(6));
    } catch (error) {
      console.error('Error converting USD to token:', error);
    }
  };

  const displayPlaceholder = inputMode === 'token' ? placeholder : '0.00';
  const displayValue = inputMode === 'token' ? value : usdValue;

  return (
    <div className={`flex gap-2 ${className || ''}`}>
      <div className="flex-1 relative">
        <Input
          type="number"
          placeholder={displayPlaceholder}
          value={displayValue}
          onChange={(e) => 
            inputMode === 'token' 
              ? onChange(e.target.value) 
              : handleUSDInput(e.target.value)
          }
          disabled={disabled}
          readOnly={readOnly}
          className={readOnly ? 'bg-muted' : ''}
        />
        {inputMode === 'usd' && !readOnly && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            $
          </div>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleModeToggle}
        disabled={disabled || readOnly}
        title={inputMode === 'token' ? 'Switch to USD input' : 'Switch to token input'}
        className="shrink-0"
      >
        <DollarSign className={`h-4 w-4 ${inputMode === 'usd' ? 'text-green-600' : ''}`} />
      </Button>
    </div>
  );
}
