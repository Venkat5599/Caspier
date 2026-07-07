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

  /** Mint a scoped session key (demo: records intent; prod: casper-client add-associated-key). */
  mint(agentPublicKeyHex: string, scope: SessionScope): SessionKeyRecord {
    if (!this.ownerPublicKeyHex) {
      throw new Error("CASPER_PUBLIC_KEY required to mint session keys");
    }
    const deployHash = crypto.randomUUID().replace(/-/g, "");
    const rec: SessionKeyRecord = {
      id: crypto.randomUUID(),
      agentPublicKeyHex,
      ownerPublicKeyHex: this.ownerPublicKeyHex,
      scope,
      deployHash,
      explorerUrl: `https://testnet.cspr.live/deploy/${deployHash}`,
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

  validateScope(spendMotes: string, scope: SessionScope): boolean {
    if (new Date(scope.expiresAt).getTime() < Date.now()) return false;
    return BigInt(spendMotes) <= BigInt(scope.maxSpendPerCall);
  }
}
