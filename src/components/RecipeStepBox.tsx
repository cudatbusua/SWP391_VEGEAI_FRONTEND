import React from 'react';

export interface RecipeStepBoxProps {
  stepNumber: number;
  content: string;
  className?: string;
}

/**
 * Strips redundant step prefixes like "1. ", "Bước 1: ", "Step 1 - ", "**Bước 1**: "
 */
export function cleanRawStepText(raw: string): { stepTitle?: string; stepInstruction: string } {
  if (!raw) return { stepInstruction: '' };

  // 1. Strip redundant prefix like "1. ", "Bước 1: ", "**Bước 1 - Sơ chế**: "
  let cleaned = raw
    .replace(/^\s*(?:\*\*)?(?:(?:Bước|bước|Step|step)\s*\d+[\s:.-]*|\d+[\.\)\-:])(?:\*\*)?[\s:.-]*\s*/i, '')
    .trim();

  // 2. Check if there's a bold title like "**Sơ chế**: Nội dung" or "**Chế biến chính** - Nội dung"
  const titleMatch = cleaned.match(/^(?:\*\*(.+?)\*\*|\[(.+?)\])[:.-]\s*(.+)$/);
  if (titleMatch) {
    const stepTitle = (titleMatch[1] || titleMatch[2]).trim();
    const stepInstruction = titleMatch[3].trim();
    return { stepTitle, stepInstruction };
  }

  // 3. Check colon format like "Sơ chế: Rửa sạch nấm..." (if title is short <= 25 chars)
  const colonIdx = cleaned.indexOf(':');
  if (colonIdx > 0 && colonIdx <= 30) {
    const candidateTitle = cleaned.slice(0, colonIdx).trim();
    const candidateInstruction = cleaned.slice(colonIdx + 1).trim();
    if (candidateInstruction.length > 5 && !candidateTitle.includes('.')) {
      return { stepTitle: candidateTitle, stepInstruction: candidateInstruction };
    }
  }

  return { stepInstruction: cleaned };
}

export const RecipeStepBox: React.FC<RecipeStepBoxProps> = ({
  stepNumber,
  content,
  className = ''
}) => {
  const { stepTitle, stepInstruction } = cleanRawStepText(content);

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-slate-50/40 to-white dark:from-slate-800/80 dark:via-slate-800/50 dark:to-slate-900 border border-emerald-200/80 dark:border-slate-700/80 shadow-2xs flex items-start gap-3.5 transition-all duration-200 hover:border-emerald-400 hover:shadow-xs ${className}`}
    >
      {/* Box Step Badge */}
      <div className="flex flex-col items-center justify-center shrink-0 select-none">
        <span className="w-8 h-8 rounded-xl bg-emerald-700 text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-xs">
          {stepNumber}
        </span>
        <span className="text-[10px] font-black uppercase tracking-tight text-emerald-800 dark:text-emerald-400 mt-1">
          Bước {stepNumber}
        </span>
      </div>

      {/* Step Body */}
      <div className="flex-1 min-w-0 pt-0.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
        {stepTitle && (
          <h4 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm mb-1 text-emerald-900 dark:text-emerald-300">
            {stepTitle}
          </h4>
        )}
        <p className="whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-300">
          {stepInstruction}
        </p>
      </div>
    </div>
  );
};
