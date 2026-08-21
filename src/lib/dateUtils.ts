/**
 * Date & Time utilities with Brasília Timezone (UTC-3) support
 */

import { StudyTask } from '../types';

// A task never occurs before its own anchor date, and never on a date the
// user explicitly removed from the series (excludedDates).
export function taskOccursOnDate(task: StudyTask, dateIso: string): boolean {
  if (dateIso < task.date) return false;
  if (task.excludedDates?.includes(dateIso)) return false;

  if (task.recurrence === 'none') return task.date === dateIso;

  const dayOfWeek = parseISODate(dateIso).getDay();
  if (task.recurrence === 'daily') return true;
  if (task.recurrence === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
  if (task.recurrence === 'custom' || task.recurrence === 'weekly') {
    return task.recurrenceDays?.includes(dayOfWeek) ?? false;
  }
  return false;
}

// A recurring series shares one row, so "done" has to be tracked per occurrence
// date instead of the single `completed` boolean (which only applies to
// one-off tasks, recurrence === 'none').
export function isTaskCompletedOnDate(task: StudyTask, dateIso: string): boolean {
  if (task.recurrence === 'none') return task.completed;
  return task.completedDates?.includes(dateIso) ?? false;
}

export function getBrasiliaDate(): Date {
  const now = new Date();
  // Compute UTC time in ms, then subtract 3 hours (UTC-3)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc - 3 * 3600000);
}

export function getBrasiliaGreeting(name: string): { greeting: string; period: 'morning' | 'afternoon' | 'evening'; emoji: string } {
  const bDate = getBrasiliaDate();
  const hours = bDate.getHours();

  if (hours >= 5 && hours < 12) {
    return { greeting: `Bom dia, ${name}!`, period: 'morning', emoji: '☀️' };
  } else if (hours >= 12 && hours < 18) {
    return { greeting: `Boa tarde, ${name}!`, period: 'afternoon', emoji: '🌤️' };
  } else {
    return { greeting: `Boa noite, ${name}!`, period: 'evening', emoji: '🌙' };
  }
}

export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function formatBrasiliaDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = parseISODate(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  };
  const formatted = date.toLocaleDateString('pt-BR', options);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = parseISODate(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function getWeekDays(referenceDate: Date = getBrasiliaDate()): { date: Date; iso: string; dayName: string; dayNumber: number; isToday: boolean }[] {
  const current = new Date(referenceDate);
  const dayOfWeek = current.getDay(); // 0 is Sunday, 1 is Monday...
  // Let week start on Monday (0=Mon...6=Sun)
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(current);
  monday.setDate(current.getDate() + distanceToMonday);

  const todayIso = formatDateToISO(getBrasiliaDate());
  const weekDays = [];

  const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const iso = formatDateToISO(day);
    weekDays.push({
      date: day,
      iso,
      dayName: dayNames[i],
      dayNumber: day.getDate(),
      isToday: iso === todayIso,
    });
  }

  return weekDays;
}

export function getMonthDaysGrid(year: number, month: number): { date: Date; iso: string; isCurrentMonth: boolean; isToday: boolean }[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const todayIso = formatDateToISO(getBrasiliaDate());

  // Determine starting weekday (0=Sun, 1=Mon, etc.)
  let startDayOfWeek = firstDay.getDay(); // 0 is Sun
  startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Align to Mon = 0

  const grid: { date: Date; iso: string; isCurrentMonth: boolean; isToday: boolean }[] = [];

  // Previous month padding
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const prevDate = new Date(year, month, -i);
    const iso = formatDateToISO(prevDate);
    grid.push({
      date: prevDate,
      iso,
      isCurrentMonth: false,
      isToday: iso === todayIso,
    });
  }

  // Current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const currDate = new Date(year, month, i);
    const iso = formatDateToISO(currDate);
    grid.push({
      date: currDate,
      iso,
      isCurrentMonth: true,
      isToday: iso === todayIso,
    });
  }

  // Next month padding to fill standard 35 or 42 grid cells
  const remaining = (7 - (grid.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const nextDate = new Date(year, month + 1, i);
    const iso = formatDateToISO(nextDate);
    grid.push({
      date: nextDate,
      iso,
      isCurrentMonth: false,
      isToday: iso === todayIso,
    });
  }

  return grid;
}

export function calculateNextSpacedReviewDate(currentStage: number = 1, baseDateStr?: string): { nextDate: string; nextStage: number } {
  const base = baseDateStr ? parseISODate(baseDateStr) : getBrasiliaDate();
  const next = new Date(base);

  // Spaced intervals: 1 day -> 7 days -> 30 days -> 60 days
  let daysToAdd = 1;
  let nextStage = 2;

  if (currentStage === 1) {
    daysToAdd = 1; // 24h
    nextStage = 2;
  } else if (currentStage === 2) {
    daysToAdd = 7; // 1 week
    nextStage = 3;
  } else if (currentStage === 3) {
    daysToAdd = 30; // 1 month
    nextStage = 4;
  } else {
    daysToAdd = 60; // 2 months
    nextStage = currentStage + 1;
  }

  next.setDate(next.getDate() + daysToAdd);
  return {
    nextDate: formatDateToISO(next),
    nextStage,
  };
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  if (remainingMin === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMin}m`;
}
