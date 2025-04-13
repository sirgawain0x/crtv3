import React, { useState, useEffect } from 'react';
import { usePostContext } from '../context';

const CreatePostForm: React.FC = () => {
  const { post, setPost } = usePostContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission logic here
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea value={post} onChange={(e) => setPost(e.target.value)} />
      <button type="submit">Submit</button>
    </form>
  );
};

export default CreatePostForm;
