import { useRef, useEffect } from 'react';

// Custom hook to store the previous value of a state or prop
export const usePrevious = <T,>(value: T): T | undefined => {
  // FIX: Provide an initial value to useRef to resolve the "Expected 1 arguments, but got 0" error.
  // The generic type is also updated to correctly handle the `undefined` initial value.
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
};