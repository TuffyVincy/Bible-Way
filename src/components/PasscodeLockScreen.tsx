import React, { useEffect, useState } from 'react';
import { Delete, Lock } from 'lucide-react';
import { verifyPinWithSalt } from '../utils/steadfastLogic';

interface PasscodeLockScreenProps {
  passcodeHash: string;
  passcodeSalt: string;
  onUnlock: () => void;
}

const KEYPAD_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function PasscodeLockScreen({
  passcodeHash,
  passcodeSalt,
  onUnlock,
}: PasscodeLockScreenProps) {
  const [digits, setDigits] = useState('');
  const [errorText, setErrorText] = useState('');
  const [checking, setChecking] = useState(false);

  const attemptVerify = async (candidate: string) => {
    setChecking(true);
    const ok = await verifyPinWithSalt(candidate, passcodeSalt, passcodeHash);
    setChecking(false);
    if (ok) {
      setDigits('');
      setErrorText('');
      onUnlock();
    } else {
      setErrorText('Incorrect passcode. Please try again.');
      setDigits('');
    }
  };

  const handleDigit = (digit: string) => {
    if (checking || digits.length >= 4) return;
    setErrorText('');
    const next = digits + digit;
    setDigits(next);
    if (next.length === 4) {
      void attemptVerify(next);
    }
  };

  const handleBackspace = () => {
    if (checking) return;
    setErrorText('');
    setDigits((prev) => prev.slice(0, -1));
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) {
        handleDigit(event.key);
      } else if (event.key === 'Backspace') {
        handleBackspace();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="passcode-lock-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#F6F7F8] dark:bg-[#0B1118] text-[#172026] dark:text-[#ECF1F4]"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#121A24] border border-slate-200 dark:border-slate-800 p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-[#1B5E53]/10 dark:bg-[#3DA694]/15 flex items-center justify-center text-[#1B5E53] dark:text-[#4DBAA7] mb-5">
          <Lock className="w-5 h-5" aria-hidden="true" />
        </div>

        <h1 id="passcode-lock-title" className="font-serif text-2xl font-semibold tracking-tight">
          Steadfast is locked
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Enter your 4-digit privacy passcode to access your journal and accountability log.
        </p>

        <div
          className="mt-7 mb-3 flex items-center justify-center gap-4"
          aria-label={`Passcode progress: ${digits.length} of 4 digits entered`}
        >
          {[0, 1, 2, 3].map((slot) => {
            const filled = slot < digits.length;
            return (
              <span
                key={slot}
                className={`w-3.5 h-3.5 rounded-full transition-transform duration-150 ${
                  filled
                    ? 'bg-[#1B5E53] dark:bg-[#4DBAA7] scale-110'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            );
          })}
        </div>

        <div className="min-h-[24px] mb-4">
          {errorText && (
            <p role="alert" className="text-xs font-medium text-rose-700 dark:text-rose-400">
              {errorText}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-[264px] mx-auto">
          {KEYPAD_DIGITS.map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              aria-label={`Passcode digit ${digit}`}
              className="h-14 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.97] text-lg font-mono font-medium tabular-nums transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E53] dark:focus-visible:ring-[#4DBAA7]"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDigits('')}
            aria-label="Clear entered passcode"
            className="h-14 rounded-2xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E53]"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            aria-label="Passcode digit 0"
            className="h-14 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.97] text-lg font-mono font-medium tabular-nums transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E53] dark:focus-visible:ring-[#4DBAA7]"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Delete last passcode digit"
            className="h-14 rounded-2xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E53]"
          >
            <Delete className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
