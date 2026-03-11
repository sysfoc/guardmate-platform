'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
  onResend?: () => void;
  resendCooldown?: number;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChange,
  error,
  disabled,
  onResend,
  resendCooldown = 60,
}) => {
  const [activeInput, setActiveInput] = React.useState(0);
  const [timer, setTimer] = React.useState(0);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Timer logic for resend
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleResend = () => {
    if (onResend && timer === 0) {
      onResend();
      setTimer(resendCooldown);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    if (!val) return;

    const lastChar = val.charAt(val.length - 1);
    if (!/^\d$/.test(lastChar)) return;

    const newValue = value.split('');
    newValue[index] = lastChar;
    const combinedValue = newValue.join('');
    onChange(combinedValue);

    if (index < length - 1 && combinedValue.length <= length) {
      inputRefs.current[index + 1]?.focus();
      setActiveInput(index + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        setActiveInput(index - 1);
      }
      const newValue = value.split('');
      newValue[index] = '';
      onChange(newValue.join(''));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, length);
    if (!/^\d+$/.test(pastedData)) return;
    onChange(pastedData);
    inputRefs.current[Math.min(pastedData.length, length - 1)]?.focus();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div 
        className={cn(
          'flex gap-2 sm:gap-3',
          error ? 'animate-shake' : ''
        )}
      >
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={value[i] || ''}
            disabled={disabled}
            onFocus={() => setActiveInput(i)}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={handlePaste}
            className={cn(
              'h-12 w-10 sm:h-14 sm:w-12 text-center text-xl font-bold rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed',
              error 
                ? 'border-[var(--color-danger)] text-[var(--color-danger)] bg-[var(--color-danger-light)]' 
                : activeInput === i 
                  ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 shadow-sm' 
                  : 'border-[var(--color-border-default)] bg-[var(--color-input-bg)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)]'
            )}
          />
        ))}
      </div>

      {onResend && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-[var(--color-text-muted)]">
            Didn&apos;t receive the code?
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={disabled || timer > 0}
            className={cn(
              'text-sm font-semibold transition-colors focus:outline-none',
              timer > 0 
                ? 'text-[var(--color-text-disabled)] cursor-not-allowed' 
                : 'text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]'
            )}
          >
            {timer > 0 ? `Resend code in ${timer}s` : 'Resend code'}
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.2s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};

OTPInput.displayName = 'OTPInput';
