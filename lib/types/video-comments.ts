/**
 * Types for video comment system
 */

export interface VideoComment {
  id: number;
  video_asset_id: number;
  parent_comment_id: number | null;
  commenter_address: string;
  content: string;
  likes_count: number;
  replies_count: number;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  // Computed fields
  is_liked?: boolean;
  replies?: VideoComment[];
}

export interface CommentLike {
  id: number;
  comment_id: number;
  liker_address: string;
  created_at: Date;
}

export interface CreateCommentInput {
  video_asset_id: number;
  parent_comment_id?: number | null;
  content: string;
  commenter_address: string;
}

export interface UpdateCommentInput {
  content: string;
}

export interface GetCommentsOptions {
  video_asset_id: number;
  parent_comment_id?: number | null; // null for top-level, number for replies
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'likes_count';
  orderDirection?: 'asc' | 'desc';
}


