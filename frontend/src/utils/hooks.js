import { useEffect, useRef } from "react";
import { useSocket } from "../context/SocketContext";

// Fallback: har few seconds me data refresh (agar WebSocket kuch der ke liye toot jaye)
export function usePolling(fn, ms = 5000) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    saved.current();
    const timer = setInterval(() => saved.current(), ms);
    return () => clearInterval(timer);
  }, [ms]);
}

// Notification aate hi turant data reload
export function useLiveRefresh(fn) {
  const { subscribe } = useSocket();
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => subscribe(() => saved.current()), [subscribe]);
}
