/**
 * Type definitions for Splits.org integration
 */

/**
 * Represents a single collaborator in a revenue split
 */
export interface VideoCollaborator {
  id?: string; // UUID from database
  video_id?: number;
  collaborator_address: string; // Ethereum address
  share_percentage: number; // Percentage as integer (0-100, e.g., 50 = 50%)
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Form data for adding/editing a collaborator
 */
export interface CollaboratorFormData {
  address: string;
  percentage: number; // 0-100
}

/**
 * Result of creating a split contract
 */
export interface SplitCreationResult {
  success: boolean;
  splitAddress?: string;
  txHash?: string;
  error?: string;
}

