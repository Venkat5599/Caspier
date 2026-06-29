"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Casper wallet connect button. Placeholder for CSPR.click / Casper Wallet
 * integration (Sign-In With Casper) — currently a local mock so the shell is
 * complete; real wallet wiring lands with the auth brick.
 */
export function WalletButton() {
  const [account, setAccount] = useState<string | null>(null);

  if (account) {
    return (
      <Button variant="outline" size="sm" onClick={() => setAccount(null)} title="Disconnect">
        <span className="font-mono text-xs">
          {account.slice(0, 6)}…{account.slice(-4)}
        </span>
      </Button>
    );
  }

  return (
    <Button
      variant="accent"
      size="sm"
      onClick={() => setAccount("01a2f3c4d5e6f7089abc")}
      title="Connect Casper wallet (mock)"
    >
      <Wallet className="h-4 w-4" />
      Connect wallet
    </Button>
  );
}
