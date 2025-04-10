import { useEffect, useState } from 'react';
import type { NextPage } from 'next';
import Link from 'next/link';

import { useCeramicContext } from '../context';

import { CreatePostForm } from '../components/createPostForm.component';
import { PostsFeed } from '../components/postsFeed.component';

import Head from 'next/head';

import { PostProps, Profile } from '../types';
import styles from '../styles/Home.module.scss';
import AuthPrompt from './did-select-popup';
import React from 'react';
import { authenticateCeramic } from '../utils';

interface ViewerResponse {
  data?: {
    viewer?: {
      id?: string;
      basicProfile?: {
        id: string;
        name?: string;
        username?: string;
        emoji?: string;
        description?: string;
        gender?: string;
      };
    };
  };
  errors?: Array<{ message: string }>;
}

interface FollowingResponse {
  data?: {
    node?: {
      followingList?: {
        edges?: Array<{
          node?: {
            profileId: string;
            profile?: {
              id: string;
              name?: string;
              username?: string;
              emoji?: string;
              posts?: {
                edges?: Array<{
                  node?: {
                    id: string;
                    body?: string;
                    created?: string;
                  };
                }>;
              };
            };
          };
        }>;
      };
    };
  };
  errors?: Array<{ message: string }>;
}

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

const Home: NextPage = () => {
  const clients = useCeramicContext();
  const { ceramic, composeClient } = clients;
  const [profile, setProfile] = useState<Profile | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [posts, setPosts] = useState<PostProps[] | []>([]);

  const getProfile = async () => {
    console.log('ceramic.did: ', ceramic.did);
    if (ceramic.did !== undefined) {
      const profile = (await composeClient.executeQuery(`
        query {
          viewer {
            id
            basicProfile {
              id
              name
              username
            }
          }
        }
      `)) as ViewerResponse;
      localStorage.setItem('viewer', profile.data?.viewer?.id || '');

      console.log(
        'Profile in getProfile: ',
        profile.data?.viewer?.basicProfile,
      );
      setProfile(profile.data?.viewer?.basicProfile || null);
      setIsLoading(false);
    } else {
      setProfile(null);
      setIsLoading(false);
    }
  };

  const getPosts = async () => {
    if (!profile?.id) {
      console.log('No profile ID available');
      return;
    }

    const following = (await composeClient.executeQuery(`
      query {
        node(id: "${profile.id}") {
          ... on BasicProfile {
            followingList(first: 100) {
              edges {
                node {
                  profileId
                  profile {
                    id
                    name
                    username
                    emoji
                    posts(first: 100) {
                      edges {
                        node {
                          id
                          body
                          created
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `)) as FollowingResponse;

    console.log('Following: ', following?.data?.node?.followingList?.edges);

    const explore = (await composeClient.executeQuery(`
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

    console.log('Explore: ', explore?.data?.postsIndex?.edges);

    const posts: PostProps[] = [];

    // Handle following posts
    const followingEdges = following?.data?.node?.followingList?.edges || [];
    for (const edge of followingEdges) {
      if (!edge?.node?.profile) continue;

      const profile = edge.node.profile;
      const postEdges = profile.posts?.edges || [];

      for (const postEdge of postEdges) {
        if (!postEdge?.node) continue;

        posts.push({
          author: {
            id: profile.id,
            name: profile.name || '',
            username: profile.username || '',
            emoji: profile.emoji || '',
          },
          post: {
            id: postEdge.node.id,
            body: postEdge.node.body || '',
            created: postEdge.node.created,
          },
        });
      }
    }

    // Handle explore posts if no following posts are available
    if (posts.length === 0) {
      const exploreEdges = explore?.data?.postsIndex?.edges || [];
      for (const edge of exploreEdges) {
        if (!edge?.node?.profile) continue;

        const post = edge.node;
        posts.push({
          author: {
            id: post.profile.id,
            name: post.profile.name || '',
            username: post.profile.username || '',
            emoji: post.profile.emoji || '',
          },
          post: {
            id: post.id,
            body: post.body || '',
            created: post.created,
          },
        });
      }
    }

    // Sort posts by created date
    posts.sort((a, b) => {
      const dateA = a.post.created ? new Date(a.post.created).getTime() : 0;
      const dateB = b.post.created ? new Date(b.post.created).getTime() : 0;
      return dateB - dateA;
    });

    setPosts(posts);
  };

  const refreshPosts = async () => {
    await getPosts();
    setIsLoading(false);
  };

  useEffect(() => {
    getProfile();
    refreshPosts();
  }, []);

  return (
    <>
      <Head>
        <title>Ceramic Social</title>
        <link rel="icon" href="/ceramic-favicon.svg" />
      </Head>
      <div className="content">
        {profile ? (
          <>
            <CreatePostForm refreshPosts={refreshPosts} />
            <PostsFeed posts={posts} refreshPosts={refreshPosts} />
          </>
        ) : (
          <>
            <h2 className={styles.accentColor}>
              Please{' '}
              <Link href={`/profile`}>
                <a style={{ color: 'white' }}>create a profile</a>
              </Link>{' '}
              before posting.
            </h2>
          </>
        )}
      </div>
    </>
  );
};

export default Home;
