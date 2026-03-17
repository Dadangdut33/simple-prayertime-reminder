import { useEffect, useRef, useState } from 'react';
import { getCountdown } from '../utils/helpers';

/**
 * Live countdown hook — returns an "HH:mm:ss" string that updates every second.
 * Returns empty string if toIso is null/empty.
 */
export function useCountdown(toIso: string | undefined): string {
  const [countdown, setCountdown] = useState(toIso ? getCountdown(toIso) : '');

  useEffect(() => {
    if (!toIso) return;
    setCountdown(getCountdown(toIso));
    const id = setInterval(() => setCountdown(getCountdown(toIso)), 1000);
    return () => clearInterval(id);
  }, [toIso]);

  return countdown;
}

/**
 * Interval hook — runs a callback at the given interval (ms).
 */
export function useInterval(callback: () => void, ms: number): void {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  }, [callback]);
  useEffect(() => {
    const id = setInterval(() => saved.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}

/**
 * Clock hook — returns a live Date object updated every second.
 */
export function useClock(): Date {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function useIsRendering(): boolean {
  const [isRendering, setIsRendering] = useState(true);
  useEffect(() => {
    setIsRendering(false);
  }, []);
  return isRendering;
}
