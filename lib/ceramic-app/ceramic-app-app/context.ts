import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import {PostContext} from 'lib/ceramic-app/ceramic-app-app/types';


interface PostContextType {
  post: string;
  setPost: (post: string) => void;
}

const PostContext = createContext<PostContextType | undefined>(undefined);

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