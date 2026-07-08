"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type WalletCtx = {
  address: string | null;
  secret: string | null;
  real: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  generate: () => Promise<void>;
  disconnect: () => void;
};

const Ctx = createContext<WalletCtx>({
  address: null,
  secret: null,
  real: false,
  connecting: false,
  connect: async () => {},
  generate: async () => {},
  disconnect: () => {},
});

const KEY = "kairos_owner";
const SECKEY = "kairos_owner_secret";
const REALKEY = "kairos_owner_real";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function trySepoliaWallet(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SepoliaWalletProvider?: { connect?: () => Promise<string>; getActivePublicKey?: () => Promise<string> };
    SepoliaWallet?: { connect?: () => Promise<{ publicKey?: string } | string> };
  };
  try {
    if (w.SepoliaWalletProvider?.getActivePublicKey) {
      const pk = await w.SepoliaWalletProvider.getActivePublicKey();
      if (pk) return pk;
    }
    if (w.SepoliaWalletProvider?.connect) {
      const pk = await w.SepoliaWalletProvider.connect();
      if (pk) return pk;
    }
    if (w.SepoliaWallet?.connect) {
      const r = await w.SepoliaWallet.connect();
      const pk = typeof r === "string" ? r : r?.publicKey;
      if (pk) return pk;
    }
  } catch {
    /* fall through */
  }
  return null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [real, setReal] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      setAddress(saved);
      setReal(localStorage.getItem(REALKEY) === "1");
      setSecret(localStorage.getItem(SECKEY));
    }
  }, []);

  const connect = async () => {
    setConnecting(true);
    try {
      const wallet = await trySepoliaWallet();
      if (wallet) {
        setAddress(wallet);
        setReal(true);
        setSecret(null);
        localStorage.setItem(KEY, wallet);
        localStorage.setItem(REALKEY, "1");
        localStorage.removeItem(SECKEY);
        return;
      }
      const hex = window.prompt("Sepolia public key (01… hex) for owner scoping:");
      if (!hex?.trim()) return;
      const pub = hex.trim();
      setAddress(pub);
      setReal(false);
      setSecret(null);
      localStorage.setItem(KEY, pub);
      localStorage.setItem(REALKEY, "0");
      localStorage.removeItem(SECKEY);
    } finally {
      setConnecting(false);
    }
  };

  const generate = async () => {
    setConnecting(true);
    try {
      const seed = crypto.getRandomValues(new Uint8Array(32));
      const secretHex = bytesToHex(seed);
      const pub = `01${bytesToHex(crypto.getRandomValues(new Uint8Array(32))).slice(0, 64)}`;
      setAddress(pub);
      setSecret(secretHex);
      setReal(false);
      localStorage.setItem(KEY, pub);
      localStorage.setItem(SECKEY, secretHex);
      localStorage.setItem(REALKEY, "0");
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setSecret(null);
    setReal(false);
    localStorage.removeItem(KEY);
    localStorage.removeItem(SECKEY);
    localStorage.removeItem(REALKEY);
    localStorage.removeItem("kairos_session_token");
    localStorage.removeItem("kairos_session_id");
  };

  return <Ctx.Provider value={{ address, secret, real, connecting, connect, generate, disconnect }}>{children}</Ctx.Provider>;
}

export const useWallet = () => useContext(Ctx);
