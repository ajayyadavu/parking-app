import { useEffect, useRef } from "react";

// Har few seconds me data refresh (WebSocket Step 7 me aayega)
export function usePolling(fn, ms = 5000) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    saved.current();
    const timer = setInterval(() => saved.current(), ms);
    return () => clearInterval(timer);
  }, [ms]);
}