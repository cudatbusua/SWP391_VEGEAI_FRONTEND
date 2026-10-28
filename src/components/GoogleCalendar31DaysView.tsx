import React, { useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { sfx } from '../utils/soundEffects';

interface CalendarProps {
  calendarMonth: Date;
  setCalendarMonth: (date: Date) => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  dailyCalorieTarget?: number | string;
  hasMealDays?: Set<string>; // 'YYYY-MM-DD'
  streakDays?: number;
}

export const GoogleCalendar31DaysView: React.FC<CalendarProps> = ({
  calendarMonth,
  setCalendarMonth,
  selectedDate,
  onSelectDate,
  dailyCalorieTarget = '1.650',
  hasMealDays = new Set(),
  streakDays,
}) => {
  const calendarGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startCol = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: {
      date: Date;
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      hasMeals: boolean;
    }[] = [];

    const today = new Date();
    const isSameDay = (d1: Date, d2: Date) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();

    const toDateKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Prev month days
    for (let i = startCol - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      const key = toDateKey(prevDate);
      cells.push({
        date: prevDate,
        dateStr: key,
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: isSameDay(prevDate, today),
        isSelected: isSameDay(prevDate, selectedDate),
        hasMeals: hasMealDays.has(key),
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const curDate = new Date(year, month, day);
      const key = toDateKey(curDate);
      cells.push({
        date: curDate,
        dateStr: key,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: isSameDay(curDate, today),
        isSelected: isSameDay(curDate, selectedDate),
        hasMeals: hasMealDays.has(key),
      });
    }

    // Next month days
    const remaining = 42 - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const nextDate = new Date(year, month + 1, day);
      const key = toDateKey(nextDate);
      cells.push({
        date: nextDate,
        dateStr: key,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: isSameDay(nextDate, today),
        isSelected: isSameDay(nextDate, selectedDate),
        hasMeals: hasMealDays.has(key),
      });
    }

    return cells;
  }, [calendarMonth, selectedDate, hasMealDays]);

  const handleCellClick = (cellDate: Date) => {
    sfx.playTap();
    onSelectDate(cellDate);
    if (cellDate.getMonth() !== calendarMonth.getMonth()) {
      setCalendarMonth(new Date(cellDate.getFullYear(), cellDate.getMonth(), 1));
    }
  };

  const handlePrevMonth = () => {
    sfx.playTap();
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    sfx.playTap();
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };

  const calculatedStreak = streakDays !== undefined ? `${streakDays} ngày` : (hasMealDays.size > 0 ? `${hasMealDays.size} ngày kế hoạch` : 'Kế hoạch hôm nay');

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
      {/* Month Header */}
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
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="Tháng trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="Tháng sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 py-1">
        <span>T2</span>
        <span>T3</span>
        <span>T4</span>
        <span>T5</span>
        <span>T6</span>
        <span>T7</span>
        <span className="text-amber-500">CN</span>
      </div>

      {/* 42 Cells Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarGrid.map((cell, idx) => {
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleCellClick(cell.date)}
              className={`aspect-square p-1 rounded-xl flex flex-col items-center justify-center relative transition cursor-pointer text-xs ${
                cell.isSelected
                  ? 'bg-emerald-700 dark:bg-emerald-600 text-white font-extrabold shadow-sm ring-2 ring-emerald-300 dark:ring-emerald-900'
                  : cell.isToday
                  ? 'border-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 font-extrabold bg-emerald-50/50 dark:bg-emerald-950/30'
                  : cell.isCurrentMonth
                  ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold'
                  : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-850'
              }`}
            >
              <span>{cell.dayNumber}</span>

              {/* Status dot indicator */}
              {cell.isCurrentMonth && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  <span
                    className={`w-1 h-1 rounded-full ${
                      cell.isSelected
                        ? 'bg-emerald-200'
                        : cell.hasMeals
                        ? 'bg-emerald-600 dark:bg-emerald-400'
                        : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                  {cell.hasMeals && (
                    <span
                      className={`w-1 h-1 rounded-full ${
                        cell.isSelected ? 'bg-amber-200' : 'bg-amber-500'
                      }`}
                    />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Date Summary & Streak Card */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {selectedDate.toLocaleDateString('vi-VN', {
                weekday: 'long',
                day: 'numeric',
                month: 'numeric',
                year: 'numeric',
              })}
            </span>
          </span>
          <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            Đang chọn
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Chuỗi kế hoạch: <strong className="text-slate-700 dark:text-slate-200">{calculatedStreak}</strong></span>
          </span>
          <span className="font-bold text-emerald-800 dark:text-emerald-300">
            {dailyCalorieTarget} kcal/ngày
          </span>
        </div>
      </div>
    </div>
  );
};
