import { useEffect, useState } from 'react';
import { useCeramicContext } from '../context';
import { Author, Post, PostProps } from '../types';
import styles from '../styles/postsFeed.module.scss';
import PostComponent from '../components/post.component';

interface ExploreResponse {
  data?: {
    postsIndex?: {
      edges: Array<{
        node: {
          id: string;
          body?: string;
          created?: string;
          profile: {
            id: string;
            name?: string;
            username?: string;
            emoji?: string;
          };
        };
      }>;
    };
  };
  errors?: Array<{ message: string }>;
}

export default function Explore() {
  const clients = useCeramicContext();
  const { ceramic, composeClient } = clients;
  const [posts, setPosts] = useState<PostProps[]>([]);

  useEffect(() => {
    const getPosts = async () => {
      const data = (await composeClient.executeQuery(`
        query {
          postsIndex(first: 100) {
            edges {
              node {
                id
                body
                created
                profile {
                  id
                  name
                  username
                  emoji
                }
              }
            }
          }
        }
      `)) as ExploreResponse;

      console.log(data);

      if (data?.data?.postsIndex?.edges) {
        const formattedPosts = data.data.postsIndex.edges
          .filter((post) => post.node !== null)
          .map((post) => ({
            author: {
              id: post.node.profile.id,
              name: post.node.profile.name || '',
              username: post.node.profile.username || '',
              emoji: post.node.profile.emoji || '',
            },
            post: {
              id: post.node.id,
              body: post.node.body || '',
              created: post.node.created,
            },
          }));

        setPosts(formattedPosts);
      }
    };

    getPosts();
  }, [composeClient]);

  return (
    <div className={styles.postContainer}>
      {posts.map((post) => (
        <PostComponent
          key={post.post.id}
          author={post.author}
          post={post.post}
        />
      ))}
    </div>
  );
}
