import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

interface PostContextType {
  /**
   * The post content
   * @type {string}
   * @example "This is a sample post content"
   * @default ""
   */
  post: string;
  setPost: (post: string) => void;
}

export const PostContext = createContext<PostContextType | undefined>(undefined);

export const usePostContext = () => {
  const context = useContext(PostContext);
  if (!context) {
    throw new Error('usePostContext must be used within a PostProvider');
  }
  return context;
};

interface PostProviderProps {
  children: ReactNode;
}

export const PostProvider: React.FC<PostProviderProps> = ({ children }) => {
  const [post, setPost] = useState<string>('');
  const contextValue = useMemo(() => ({ post, setPost }), [post]);

  return (
    <PostContext.Provider value={contextValue}>
      {children}
    </PostContext.Provider>
  );
};