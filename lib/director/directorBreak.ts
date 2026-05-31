/** Unified break exits (ADR-0017). Break turns do not execute tools. */
export type DirectorBreakCode =
  | "NO_TOOL_MATCH"
  | "ALL_BLOCKED"
  | "SEMANTIC_MISMATCH"
  | "DEPENDENCY_UNMET"
  | "UNSUPPORTED_INTENT"
  | "CLARIFICATION_NEEDED"
  | "EXECUTION_HALTED";

export type DirectorBreak = {
  code: DirectorBreakCode;
  /** Player-facing one-liner (feed / status) */
  playerMessage: string;
  /** Machine / debug detail */
  detail: string;
  /** Optional: which tool was rejected */
  rejectedToolId?: string;
};
