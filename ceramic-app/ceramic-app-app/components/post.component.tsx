import Link from 'next/link';
import styles from '../styles/postsFeed.module.scss';

import { PostProps } from '../types';

const Post = ({ author, post }: PostProps) => {
  console.log(post);
  return (
    <div className={styles.post}>
      <div className={styles.author}>
        <div className={styles.emoji}>{author.emoji}</div>
        <div>
          <Link href={`/user/${author.id}`}>
            <div className={styles.name}>{author.name}</div>
            <div className={styles.username}>@{author.username}</div>
          </Link>
        </div>
      </div>
      <div className={styles.content}>
        <Link href={`/post/${post.id}`}>
          <div className={styles.body}>{post.body}</div>
        </Link>
      </div>
    </div>
  );
};

export default Post;
