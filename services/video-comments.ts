"use server";

import { createClient } from "@/lib/sdk/supabase/server";
import { supabaseService } from "@/lib/sdk/supabase/service";
import type { 
  VideoComment, 
  CreateCommentInput, 
  UpdateCommentInput,
  GetCommentsOptions 
} from "@/lib/types/video-comments";

/**
 * Create a new comment on a video
 * Uses service role client to bypass RLS, but ownership is validated by the caller
 */
export async function createComment(input: CreateCommentInput): Promise<VideoComment> {
  // Use service role client for writes (bypasses RLS)
  // Ownership validation happens in the application layer (caller verifies commenter_address)
  const supabase = supabaseService || await createClient();
  
  const { data, error } = await supabase
    .from('video_comments')
    .insert({
      video_asset_id: input.video_asset_id,
      parent_comment_id: input.parent_comment_id || null,
      commenter_address: input.commenter_address,
      content: input.content.trim(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating comment:', error);
    throw new Error(`Failed to create comment: ${error.message}`);
  }

  return {
    ...data,
    created_at: new Date(data.created_at),
    updated_at: new Date(data.updated_at),
  };
}

/**
 * Get comments for a video
 */
export async function getComments(options: GetCommentsOptions): Promise<VideoComment[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from('video_comments')
    .select('*')
    .eq('video_asset_id', options.video_asset_id)
    .eq('is_deleted', false);

  // Filter by parent comment (null for top-level, number for replies)
  if (options.parent_comment_id === null || options.parent_comment_id === undefined) {
    query = query.is('parent_comment_id', null);
  } else {
    query = query.eq('parent_comment_id', options.parent_comment_id);
  }

  // Ordering
  const orderBy = options.orderBy || 'created_at';
  const orderDirection = options.orderDirection || 'desc';
  query = query.order(orderBy, { ascending: orderDirection === 'asc' });

  // Pagination
  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching comments:', error);
    throw new Error(`Failed to fetch comments: ${error.message}`);
  }

  return (data || []).map(comment => ({
    ...comment,
    created_at: new Date(comment.created_at),
    updated_at: new Date(comment.updated_at),
  }));
}

/**
 * Get comment count for a video
 */
export async function getCommentCount(video_asset_id: number): Promise<number> {
  const supabase = await createClient();
  
  const { count, error } = await supabase
    .from('video_comments')
    .select('*', { count: 'exact', head: true })
    .eq('video_asset_id', video_asset_id)
    .eq('is_deleted', false)
    .is('parent_comment_id', null); // Only count top-level comments

  if (error) {
    console.error('Error counting comments:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Update a comment
 * Uses service role client for writes, but validates ownership first
 */
export async function updateComment(
  commentId: number,
  input: UpdateCommentInput,
  commenterAddress: string
): Promise<VideoComment> {
  // Use service role client for writes (bypasses RLS)
  const supabase = supabaseService || await createClient();
  
  // First verify ownership
  const { data: existing } = await supabase
    .from('video_comments')
    .select('commenter_address')
    .eq('id', commentId)
    .single();

  if (!existing || existing.commenter_address.toLowerCase() !== commenterAddress.toLowerCase()) {
    throw new Error('Unauthorized: You can only edit your own comments');
  }

  const { data, error } = await supabase
    .from('video_comments')
    .update({
      content: input.content.trim(),
      is_edited: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating comment:', error);
    throw new Error(`Failed to update comment: ${error.message}`);
  }

  return {
    ...data,
    created_at: new Date(data.created_at),
    updated_at: new Date(data.updated_at),
  };
}

/**
 * Soft delete a comment
 * Uses service role client for writes, but validates ownership first
 */
export async function deleteComment(
  commentId: number,
  commenterAddress: string
): Promise<void> {
  // Use service role client for writes (bypasses RLS)
  const supabase = supabaseService || await createClient();
  
  // First verify ownership
  const { data: existing } = await supabase
    .from('video_comments')
    .select('commenter_address')
    .eq('id', commentId)
    .single();

  if (!existing || existing.commenter_address.toLowerCase() !== commenterAddress.toLowerCase()) {
    throw new Error('Unauthorized: You can only delete your own comments');
  }

  const { error } = await supabase
    .from('video_comments')
    .update({
      is_deleted: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId);

  if (error) {
    console.error('Error deleting comment:', error);
    throw new Error(`Failed to delete comment: ${error.message}`);
  }
}

/**
 * Like or unlike a comment
 * Uses service role client for writes (bypasses RLS)
 */
export async function toggleCommentLike(
  commentId: number,
  likerAddress: string
): Promise<{ is_liked: boolean; likes_count: number }> {
  // Use service role client for writes (bypasses RLS)
  const supabase = supabaseService || await createClient();
  
  // Check if already liked
  const { data: existing } = await supabase
    .from('comment_likes')
    .select('id')
    .eq('comment_id', commentId)
    .eq('liker_address', likerAddress)
    .single();

  if (existing) {
    // Unlike
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('id', existing.id);

    if (error) {
      console.error('Error unliking comment:', error);
      throw new Error(`Failed to unlike comment: ${error.message}`);
    }

    // Get updated likes count
    const { data: comment } = await supabase
      .from('video_comments')
      .select('likes_count')
      .eq('id', commentId)
      .single();

    return {
      is_liked: false,
      likes_count: comment?.likes_count || 0,
    };
  } else {
    // Like
    const { error } = await supabase
      .from('comment_likes')
      .insert({
        comment_id: commentId,
        liker_address: likerAddress,
      });

    if (error) {
      console.error('Error liking comment:', error);
      throw new Error(`Failed to like comment: ${error.message}`);
    }

    // Get updated likes count
    const { data: comment } = await supabase
      .from('video_comments')
      .select('likes_count')
      .eq('id', commentId)
      .single();

    return {
      is_liked: true,
      likes_count: comment?.likes_count || 0,
    };
  }
}

/**
 * Get user's like status for multiple comments
 */
export async function getCommentLikesStatus(
  commentIds: number[],
  userAddress: string
): Promise<Record<number, boolean>> {
  if (commentIds.length === 0) return {};

  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('comment_likes')
    .select('comment_id')
    .in('comment_id', commentIds)
    .eq('liker_address', userAddress);

  if (error) {
    console.error('Error fetching like status:', error);
    return {};
  }

  const likedIds = new Set((data || []).map(like => like.comment_id));
  return Object.fromEntries(commentIds.map(id => [id, likedIds.has(id)]));
}


