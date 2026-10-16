import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'pulse.schedule';

/**
 * Custom hook for managing a student's class schedule in localStorage.
 * Each class: { id, name, day (0-6), start (minutes from midnight), end (minutes from midnight) }
 * All data stays in the browser — nothing is sent to a server.
 */
export default function useSchedule() {
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setClasses(JSON.parse(stored));
      } catch {
        setClasses([]);
      }
    }
  }, []);

  const persist = useCallback((next) => {
    setClasses(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addClass = useCallback((cls) => {
    const newClass = { ...cls, id: uuidv4() };
    persist((prev) => [...prev, newClass]);
    return newClass;
  }, [persist]);

  const updateClass = useCallback((id, changes) => {
    persist((prev) => prev.map((c) => (c.id === id ? { ...c, ...changes } : c)));
  }, [persist]);

  const removeClass = useCallback((id) => {
    persist((prev) => prev.filter((c) => c.id !== id));
  }, [persist]);

  const clearAll = useCallback(() => {
    persist([]);
    localStorage.removeItem(STORAGE_KEY);
  }, [persist]);

  return { classes, addClass, updateClass, removeClass, clearAll };
}
