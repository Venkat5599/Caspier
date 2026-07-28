"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Wallet adapter — EIP-1193 (MetaMask, Rabby, Rainbow, any injected provider).
 *
 * This replaces an adapter left over from the Casper era, which probed globals
 * named `SepoliaWalletProvider`/`SepoliaWallet` — Casper names that had been
 * find-replaced and therefore never existed — and, failing that, fabricated a
 * `01…` ed25519 public key in Casper's format. On an Ethereum deployment that
 * adapter could not connect a real wallet, and the "generated" identity was not
 * an Ethereum address at all.
 *
 * What it does now:
 *   - connects through `window.ethereum` and requests accounts
 *   - checks the chain and offers to switch to Sepolia, adding it if unknown
 *   - tracks `accountsChanged` / `chainChanged`, so switching account or network
 *     in the wallet is reflected without a reload
 *
 * Watch-only mode is preserved for demoing on a machine with no wallet
 * installed: paste an address and the dashboard scopes to it. It holds no key
 * and cannot sign — `real` is false, and callers should treat it as read-only.
 */

/** Ethereum Sepolia. Hex form is what EIP-1193 expects. */
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111

type WalletCtx = {
  address: string | null;
  /** Always null. The previous adapter stored a fabricated key here. */
  secret: string | null;
  /** True only for a real injected wallet, false for watch-only. */
  real: boolean;
  connecting: boolean;
  /** Current chain, or null when unknown / watch-only. */
  chainId: string | null;
  /** Connected to a real wallet that is not on Sepolia. */
  wrongNetwork: boolean;
  connect: () => Promise<void>;
  /** Watch-only: track an address without a key. */
  generate: () => Promise<void>;
  switchToSepolia: () => Promise<void>;
  disconnect: () => void;
};

const Ctx = createContext<WalletCtx>({
  address: null,
  secret: null,
  real: false,
  connecting: false,
  chainId: null,
  wrongNetwork: false,
  connect: async () => {},
  generate: async () => {},
  switchToSepolia: async () => {},
  disconnect: () => {},
});

const KEY = "kairos_owner";
const REALKEY = "kairos_owner_real";
/** Retired: previously held a fabricated secret. Cleared on load. */
const LEGACY_SECRET_KEY = "kairos_owner_secret";

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, handler: (...args: never[]) => void): void;
  removeListener?(event: string, handler: (...args: never[]) => void): void;
}

function injected(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: Eip1193Provider }).ethereum ?? null;
}

function isAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [real, setReal] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [chainId, setChainId] = useState<string | null>(null);

  // Restore a previous session, and drop any fabricated key the old adapter
  // may have left behind.
  useEffect(() => {
    localStorage.removeItem(LEGACY_SECRET_KEY);
    const saved = localStorage.getItem(KEY);
    if (saved && isAddress(saved)) {
      setAddress(saved);
      setReal(localStorage.getItem(REALKEY) === "1");
    }
  }, []);

  // Reflect wallet-side changes. Without these, switching account or network in
  // MetaMask leaves the dashboard showing a stale identity — which on a
  // treasury app is how money goes out from the wrong place.
  useEffect(() => {
    const provider = injected();
    if (!provider?.on) return;

    const onAccounts = (...args: never[]) => {
      const accounts = args[0] as unknown as string[] | undefined;
      const next = accounts?.[0];
      if (!next) {
        setAddress(null);
        setReal(false);
        localStorage.removeItem(KEY);
        localStorage.removeItem(REALKEY);
        return;
      }
      setAddress(next);
      setReal(true);
      localStorage.setItem(KEY, next);
      localStorage.setItem(REALKEY, "1");
    };

    const onChain = (...args: never[]) => {
      setChainId((args[0] as unknown as string) ?? null);
    };

    provider.on("accountsChanged", onAccounts);
    provider.on("chainChanged", onChain);
    return () => {
      provider.removeListener?.("accountsChanged", onAccounts);
      provider.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const switchToSepolia = useCallback(async () => {
    const provider = injected();
    if (!provider) return;
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (err) {
      // 4902: the wallet does not know this chain yet. Add it — the switch is
      // then implicit.
      if ((err as { code?: number }).code === 4902) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID,
              chainName: "Ethereum Sepolia",
              nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
      } else {
        throw err;
      }
    }
    setChainId(SEPOLIA_CHAIN_ID);
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const provider = injected();
      if (!provider) {
        throw new Error(
          "No Ethereum wallet detected. Install MetaMask, or use watch-only mode.",
        );
      }

      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      const account = accounts?.[0];
      if (!account) throw new Error("Wallet returned no account.");

      const current = (await provider.request({ method: "eth_chainId" })) as string;
      setChainId(current);
      if (current !== SEPOLIA_CHAIN_ID) {
        // Offer rather than force: a rejected switch still leaves a connected
        // wallet, and `wrongNetwork` tells the UI to warn.
        await switchToSepolia().catch(() => {});
      }

      setAddress(account);
      setReal(true);
      localStorage.setItem(KEY, account);
      localStorage.setItem(REALKEY, "1");
    } finally {
      setConnecting(false);
    }
  }, [switchToSepolia]);

  /** Watch-only. No key, cannot sign — for demoing without a wallet installed. */
  const generate = useCallback(async () => {
    setConnecting(true);
    try {
      const entered = window.prompt("Ethereum address to watch (0x…):")?.trim();
      if (!entered) return;
      if (!isAddress(entered)) {
        throw new Error("Not an Ethereum address — expected 0x followed by 40 hex characters.");
      }
      setAddress(entered);
      setReal(false);
      setChainId(null);
      localStorage.setItem(KEY, entered);
      localStorage.setItem(REALKEY, "0");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setReal(false);
    setChainId(null);
    localStorage.removeItem(KEY);
    localStorage.removeItem(REALKEY);
    localStorage.removeItem(LEGACY_SECRET_KEY);
    localStorage.removeItem("kairos_session_token");
    localStorage.removeItem("kairos_session_id");
  }, []);

  const wrongNetwork = real && chainId !== null && chainId !== SEPOLIA_CHAIN_ID;

  return (
    <Ctx.Provider
      value={{
        address,
        secret: null,
        real,
        connecting,
        chainId,
        wrongNetwork,
        connect,
        generate,
        switchToSepolia,
        disconnect,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useWallet = () => useContext(Ctx);
