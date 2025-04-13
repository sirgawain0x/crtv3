// export const PostProvider: React.FC<PostProviderProps> = ({ children }) => {
//     const [post, setPost] = useState<string>('');
//     const contextValue = useMemo(() => ({ post, setPost }), [post]);
  
//     return (
//       <PostContext.Provider value={contextValue}>
//         {children}
//       </PostContext.Provider>
//     );
//   };