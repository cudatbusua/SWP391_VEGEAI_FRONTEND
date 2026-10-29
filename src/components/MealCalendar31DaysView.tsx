import { useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Flame } from 'lucide-react';

interface MealCalendarProps {
  calendarMonth: Date;
  setCalendarMonth: (date: Date) => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  dailyCalorieTarget?: number;
  hasMealDays?: Set<string>; // 'YYYY-MM-DD'
  draftDays?: Set<string>; // 'YYYY-MM-DD' — unsaved AI draft
}

export const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** First and last date shown by the 42-cell, Monday-first grid of a month. */
export const calendarGridRange = (month: Date) => {
  const startCol = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const first = new Date(month.getFullYear(), month.getMonth(), 1 - startCol);
  return { from: first, to: new Date(first.getFullYear(), first.getMonth(), first.getDate() + 41) };
};

const isSameDay = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

export function MealCalendar31DaysView({ calendarMonth, setCalendarMonth, selectedDate, onSelectDate, dailyCalorieTarget, hasMealDays, draftDays }: MealCalendarProps) {
  const calendarGrid = useMemo(() => {
    const month = calendarMonth.getMonth();
    // Monday-first grid, always 6 rows (42 cells) so the layout does not jump between months.
    const { from } = calendarGridRange(calendarMonth);
    const today = new Date();
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + index);
      const key = toDateKey(date);
      return {
        date,
        dayNumber: date.getDate(),
        isCurrentMonth: date.getMonth() === month,
        isToday: isSameDay(date, today),
        isSelected: isSameDay(date, selectedDate),
        hasMeals: !!hasMealDays?.has(key),
        isDraft: !!draftDays?.has(key),
      };
    });
  }, [calendarMonth, selectedDate, hasMealDays, draftDays]);

  const handleCellClick = (cellDate: Date) => {
    onSelectDate(cellDate);
    if (cellDate.getMonth() !== calendarMonth.getMonth()) setCalendarMonth(new Date(cellDate.getFullYear(), cellDate.getMonth(), 1));
  };
  const shiftMonth = (delta: number) => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + delta, 1));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold shadow-2xs">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base capitalize">
              {calendarMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
            </h3>
            <p className="text-[11px] text-slate-400">Lịch thực đơn 30–31 ngày</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => { const today = new Date(); setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1)); onSelectDate(today); }} className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">Hôm nay</button>
          <button type="button" onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer" title="Tháng trước" aria-label="Tháng trước">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => shiftMonth(1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer" title="Tháng sau" aria-label="Tháng sau">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 py-1">
        <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span className="text-amber-500">CN</span>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarGrid.map(cell => (
          <button
            key={cell.date.getTime()}
            type="button"
            aria-pressed={cell.isSelected}
            aria-label={cell.date.toLocaleDateString('vi-VN') + (cell.isDraft ? ' · bản nháp AI' : cell.hasMeals ? ' · có thực đơn' : '')}
            onClick={() => handleCellClick(cell.date)}
            className={`aspect-square p-1 rounded-xl flex flex-col items-center justify-center relative transition cursor-pointer text-xs ${
              cell.isSelected
                ? 'bg-emerald-700 dark:bg-emerald-600 text-white font-extrabold shadow-sm ring-2 ring-emerald-300 dark:ring-emerald-900'
                : cell.isToday
                ? 'border-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 font-extrabold bg-emerald-50/50 dark:bg-emerald-950/30'
                : cell.isCurrentMonth
                ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold'
                : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>{cell.dayNumber}</span>
            {cell.isCurrentMonth && (
              <span className={`mt-0.5 w-1 h-1 rounded-full ${cell.isDraft ? 'bg-amber-500 dark:bg-amber-400' : cell.isSelected ? 'bg-emerald-200' : cell.hasMeals ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-transparent'}`} />
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />Đã lưu</span>
        {draftDays && draftDays.size > 0 && (
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />Bản nháp AI (chưa lưu)</span>
        )}
      </div>

      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>{selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })}</span>
          </span>
          <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">Đang chọn</span>
        </div>
        {dailyCalorieTarget != null && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-amber-500" />Mục tiêu năng lượng</span>
            <span className="font-bold text-emerald-800 dark:text-emerald-300">{Math.round(dailyCalorieTarget).toLocaleString('vi-VN')} kcal/ngày</span>
          </div>
        )}
      </div>
    </div>
  );
}
