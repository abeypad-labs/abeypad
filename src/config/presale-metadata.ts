// Temporary stub for presale metadata
// This allows the app to compile while metadata functionality is being developed

export interface PresaleMetadata {
  socials?: {
    twitter?: string;
    telegram?: string;
    discord?: string;
    website?: string;
  };
  category?: string;
  description?: string;
  logo?: string;
}

export function getPresaleMetadata(_presaleAddress: string): PresaleMetadata | undefined {
  // TODO: Implement actual metadata fetching logic
  // For now, return undefined to use defaults
  return undefined;
}
