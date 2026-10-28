import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [connected, setConnected] = useState(false);
  const listeners = useRef(new Set());

  const subscribe = useCallback((fn) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    let ws;
    let retry = 0;
    let retryTimer;
    let pingTimer;
    let stopped = false;

    const connect = () => {
      const base = api.defaults.baseURL.replace(/^http/, "ws"); // http -> ws, https -> wss
      ws = new WebSocket(`${base}/ws?token=${encodeURIComponent(token)}`);

      ws.onopen = () => {
        retry = 0;
        setConnected(true);
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send("ping");
        }, 25000);
      };

      ws.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (data.type !== "notification") return;
        (toast[data.level] || toast.info)(data.message);
        listeners.current.forEach((fn) => fn(data));
      };

      ws.onclose = () => {
        clearInterval(pingTimer);
        setConnected(false);
        if (stopped) return;
        retry += 1;
        retryTimer = setTimeout(connect, Math.min(1000 * 2 ** retry, 15000));
      };
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      clearInterval(pingTimer);
      setConnected(false);
      ws?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const value = useMemo(() => ({ connected, subscribe }), [connected, subscribe]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
