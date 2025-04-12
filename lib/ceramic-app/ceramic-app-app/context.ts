import React, { createContext, useContext, useState, ReactNode } from 'react';

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

// Define props type explicitly
interface PostProviderProps {
  children: ReactNode;
}

export const PostProvider: React.FC<PostProviderProps> = ({ children }) => {
  const [post, setPost] = useState<string>('');

  // Ensure the component returns a valid JSX element
  return (
    <PostContext.Provider value={{ post, setPost }}>
      {children}
    </PostContext.Provider>
  );
};