import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Post from '../../components/post.component';
import { useCeramicContext } from '../../context';
import { PostProps } from '../../types';

interface PostDetailsResponse {
  data?: {
    node?: {
      author: {
        basicProfile: {
          id: string;
          body?: string;
          created?: string;
          name?: string;
          username?: string;
          emoji?: string;
        };
      };
    };
  };
  errors?: Array<{ message: string }>;
}

const PostDetails: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;

  const clients = useCeramicContext();
  const { ceramic, composeClient } = clients;

  const [postDetails, setPostDetails] = useState<PostDetailsResponse | null>(
    null,
  );

  const getPost = async () => {
    if (!id) return;

    const response = (await composeClient.executeQuery(`
      query {
        node(id: "${id}") {
          ... on Post {
            author {
              basicProfile {
                id
                body
                created
                name
                username
                emoji
              }
            }
          }
        }
      }
    `)) as PostDetailsResponse;

    setPostDetails(response);
  };

  useEffect(() => {
    getPost();
  }, [id, composeClient]);

  if (!postDetails?.data?.node) return null;

  return (
    <div className="content">
      <h1>Post Details</h1>
      <div>
        <h2>Author</h2>
        <p>ID: {postDetails.data.node.author.basicProfile.id}</p>
        <p>Name: {postDetails.data.node.author.basicProfile.name}</p>
        <p>Username: {postDetails.data.node.author.basicProfile.username}</p>
        <p>Emoji: {postDetails.data.node.author.basicProfile.emoji}</p>
      </div>
      <div>
        <h2>Post</h2>
        <p>Body: {postDetails.data.node.author.basicProfile.body}</p>
        <p>Created: {postDetails.data.node.author.basicProfile.created}</p>
      </div>
    </div>
  );
};

export default PostDetails;
