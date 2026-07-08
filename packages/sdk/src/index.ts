// Caller SDK + on-chain helpers — mirrors kagezks sdk/ layout for Agent Fabric on Sepolia.
export { FabricClient, type FabricClientOptions, type InvokeResult, type X402Quote } from "./client.ts";
export {
  invokeWithAutoPay,
  type InvokeWithPayOptions,
} from "./fabric-onchain.ts";
