import { useEffect, useRef, useState } from 'react';

export function useTimer(durationSec: number, onExpire: () => void) {
  const [remaining, setRemaining] = useState(durationSec);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    ref.current = window.setInterval(
      () =>
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(ref.current!);
            onExpire();
            return 0;
          }
          return r - 1;
        }),
      1000,
    );
    return () => clearInterval(ref.current!);
  }, []);
  return {
    remaining,
    formatted: `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`,
  };
}
