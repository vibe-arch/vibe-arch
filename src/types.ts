export type ArchitecturePattern =
  | "hexagonal"
  | "clean"
  | "mvc"
  | "layered"
  | "modular"
  | "mixed"
  | "unknown";

export interface LayerRule {
  patterns: string[];
  forbidden_deps: string[];
  allowed_deps: string[];
  description?: string;
  custom_patterns?: string[];
  custom_file_patterns?: string[];
}

export interface ArchSpec {
  architecture: ArchitecturePattern;
  language: string;
  root: string;
  bounded_contexts: string[];
  layers: Record<string, LayerRule>;
  comment_injection?: "inline" | "sidecar" | "disabled";
  ai_targets?: string[];
}

export interface FileRole {
  filePath: string;
  layer: string;
  role: string;
  boundedContext: string;
  forbidden: string[];
  depends: string[];
}

export interface Violation {
  filePath: string;
  message: string;
  from: string;
  severity: "error" | "warning" | "info";
}

export interface ViolationState {
  lastUpdated: string;
  violations: Violation[];
  summary: Record<string, number>;
}
