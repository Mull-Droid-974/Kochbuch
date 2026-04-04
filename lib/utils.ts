import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Season } from "@/types/database"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

export function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} Min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function formatFraction(value: number): string {
  const fractions: Record<number, string> = {
    0.25: '¼',
    0.33: '⅓',
    0.5: '½',
    0.67: '⅔',
    0.75: '¾',
  }
  const whole = Math.floor(value)
  const decimal = Math.round((value - whole) * 100) / 100
  const fraction = fractions[decimal] ?? (decimal > 0 ? `${Math.round(decimal * 100)}%` : '')
  if (whole === 0) return fraction || '0'
  return fraction ? `${whole} ${fraction}` : `${whole}`
}

export function scaleQuantity(baseQty: number, baseServings: number, targetServings: number): number {
  return (baseQty / baseServings) * targetServings
}

export function getDayName(dayOfWeek: number): string {
  const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
  return days[dayOfWeek - 1] ?? ''
}

export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function seasonLabel(season: Season): string {
  const labels: Record<Season, string> = {
    spring: 'Frühling',
    summer: 'Sommer',
    autumn: 'Herbst',
    winter: 'Winter',
  }
  return labels[season]
}

export function difficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    easy: 'Einfach',
    medium: 'Mittel',
    hard: 'Aufwendig',
  }
  return labels[difficulty] ?? difficulty
}
