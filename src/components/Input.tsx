import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      leftIcon,
      showPasswordToggle = false,
      type = 'text',
      helperText,
      className = '',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full text-left">
        {label && (
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            {label}
          </label>
        )}

        <div className="relative rounded-xl shadow-2xs">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={effectiveType}
            className={`
              w-full py-3 text-sm rounded-xl transition duration-150 outline-none
              ${leftIcon ? 'pl-10' : 'pl-4'}
              ${showPasswordToggle || isPassword ? 'pr-11' : 'pr-4'}
              ${
                error
                  ? 'border border-red-500 bg-white text-gray-900 focus:ring-2 focus:ring-red-200'
                  : 'border border-gray-200 bg-gray-50/70 text-gray-900 hover:border-gray-300 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
              }
              ${className}
            `}
            {...props}
          />

          {(showPasswordToggle || isPassword) && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer transition"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>

        {error ? (
          <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-gray-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
