"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type WalletCtx = {
  address: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const Ctx = createContext<WalletCtx>({
  address: null,
  connecting: false,
  connect: async () => {},
  disconnect: () => {},
});

const KEY = "caspier_owner";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved) setAddress(saved);
  }, []);

  const connect = async () => {
    setConnecting(true);
    try {
      const hex = window.prompt("Agent public key (01… hex) for owner scoping:");
      if (!hex?.trim()) return;
      const pub = hex.trim();
      setAddress(pub);
      localStorage.setItem(KEY, pub);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    localStorage.removeItem(KEY);
  };

  return <Ctx.Provider value={{ address, connecting, connect, disconnect }}>{children}</Ctx.Provider>;
}

export const useWallet = () => useContext(Ctx);
