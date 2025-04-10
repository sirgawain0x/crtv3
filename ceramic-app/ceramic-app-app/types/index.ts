export type Profile = {
  id?: any;
  name?: string;
  username?: string;
  description?: string;
  gender?: string;
  emoji?: string;
};

export type Posts = {
  edges: Array<{
    node: {
      id: string;
      body?: string;
      created?: string;
    };
  }>;
};

export type PostProps = {
  author: Author;
  post: Post;
};

export type SidebarProps = {
  name?: string;
  username?: string;
  id?: string;
};

export type Author = {
  id: string;
  name: string;
  username: string;
  emoji: string;
};

export type Post = {
  id: string;
  body?: string;
  created?: string;
};
