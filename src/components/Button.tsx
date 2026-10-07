import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'relative inline-flex items-center justify-center font-semibold text-sm rounded-xl py-3 px-5 transition duration-150 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-[#00875a] hover:bg-[#00744e] text-white shadow-sm hover:shadow focus:ring-[#00875a]/50',
    secondary:
      'bg-gray-100 hover:bg-gray-200 text-gray-800 focus:ring-gray-300',
    outline:
      'bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 shadow-2xs focus:ring-gray-200',
    ghost:
      'bg-transparent hover:bg-gray-100 text-gray-600 hover:text-gray-900 focus:ring-gray-200'
  };

  return (
    <button
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{children}</span>
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </span>
      )}
    </button>
  );
};
