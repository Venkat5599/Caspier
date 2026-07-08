export interface SessionScope {
  maxSpendPerCall: string;
  allowedContracts?: string[];
  expiresAt: string;
}

export interface SessionKeyRecord {
  id: string;
  agentPublicKeyHex: string;
  ownerPublicKeyHex: string;
  scope: SessionScope;
  deployHash: string;
  explorerUrl: string;
  demo: boolean;
  revoked: boolean;
  createdAt: string;
}

const keys: SessionKeyRecord[] = [];

export class AuthzService {
  constructor(private readonly ownerPublicKeyHex: string | null) {}

  list(): SessionKeyRecord[] {
    return keys.filter((k) => !k.revoked);
  }

  /** Mint a scoped session key (demo: records intent; prod: vault contract delegate). */
  mint(agentPublicKeyHex: string, scope: SessionScope): SessionKeyRecord {
    if (!this.ownerPublicKeyHex) {
      throw new Error("SEPOLIA_PUBLIC_KEY required to mint session keys");
    }
    const deployHash = crypto.randomUUID().replace(/-/g, "");
    const rec: SessionKeyRecord = {
      id: crypto.randomUUID(),
      agentPublicKeyHex,
      ownerPublicKeyHex: this.ownerPublicKeyHex,
      scope,
      deployHash,
      explorerUrl: `https://sepolia.etherscan.io/tx/${deployHash}`,
      demo: true,
      revoked: false,
      createdAt: new Date().toISOString(),
    };
    keys.unshift(rec);
    return rec;
  }

  revoke(agentPublicKeyHex: string): SessionKeyRecord | undefined {
    const rec = keys.find((k) => k.agentPublicKeyHex === agentPublicKeyHex && !k.revoked);
    if (!rec) return undefined;
    rec.revoked = true;
    return rec;
  }

  validateScope(spendWei: string, scope: SessionScope): boolean {
    if (new Date(scope.expiresAt).getTime() < Date.now()) return false;
    return BigInt(spendWei) <= BigInt(scope.maxSpendPerCall);
  }
}
