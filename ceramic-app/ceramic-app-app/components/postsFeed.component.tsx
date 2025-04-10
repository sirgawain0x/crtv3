import React, { useEffect } from 'react';

// import { useCeramicContext } from "../context";

import styles from '../styles/postsFeed.module.scss';
import Post from './post.component';
import { Author, Post as PostType } from '../types';

interface PostsFeedProps {
  posts: Array<{
    author: Author;
    post: PostType;
  }>;
  refreshPosts: () => Promise<void>;
}

export const PostsFeed = ({ posts, refreshPosts }: PostsFeedProps) => {
  useEffect(() => {
    refreshPosts();
  }, []);

  return (
    <div className={styles.postContainer}>
      {posts.map((post) => (
        <Post author={post.author} post={post.post} key={post.post.id} />
      ))}
    </div>
  );
};
