import { useEffect, useState } from 'react';
import { mealPlanService } from '../services/mealPlanService';
import { AUTH_EXPIRED_EVENT, hasSession } from '../services/apiClient';
import type { DailyIntake, PlanNutrients } from '../types/mealPlan';

export const DAILY_INTAKE_UPDATED_EVENT = 'daily_intake_updated';

const EMPTY_TOTALS: PlanNutrients = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

export function getLocalTodayDateString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface TodayDailyIntakeState {
  date: string;
  intake: DailyIntake | null;
  totals: PlanNutrients;
  recordedMealsCount: number;
  loaded: boolean;
}

/**
 * Fetches today's real recorded meal intake from GET /api/meal-plans/intake?date=YYYY-MM-DD
 * and stays reactively synchronized whenever the user logs or removes a meal.
 */
export function useTodayDailyIntake(enabled: boolean = true): TodayDailyIntakeState {
  const today = getLocalTodayDateString();
  const [intake, setIntake] = useState<DailyIntake | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || !hasSession()) {
      setIntake(null);
      setLoaded(false);
      return;
    }

    const controller = new AbortController();
    mealPlanService
      .intake(today, controller.signal)
      .then(value => {
        if (!controller.signal.aborted) {
          setIntake(value);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setIntake(null);
          setLoaded(false);
        }
      });

    const handleIntakeUpdated = (event: Event) => {
      const detail = (event as CustomEvent<DailyIntake | undefined>).detail;
      if (detail?.date) {
        if (detail.date === today) {
          setIntake(detail);
          setLoaded(true);
        }
        return;
      }
      mealPlanService
        .intake(today, controller.signal)
        .then(value => {
          if (!controller.signal.aborted) {
            setIntake(value);
            setLoaded(true);
          }
        })
        .catch(() => {});
    };

    const handleAuthExpired = () => {
      setIntake(null);
      setLoaded(false);
    };

    window.addEventListener(DAILY_INTAKE_UPDATED_EVENT, handleIntakeUpdated);
    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      controller.abort();
      window.removeEventListener(DAILY_INTAKE_UPDATED_EVENT, handleIntakeUpdated);
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, [enabled, today]);

  return {
    date: today,
    intake,
    totals: intake?.totals ?? EMPTY_TOTALS,
    recordedMealsCount: intake?.meals?.length ?? 0,
    loaded,
  };
}
