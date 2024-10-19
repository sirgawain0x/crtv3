'use server';

export const getLivepeerUploadUrl = async () => {
  const livepeerUpload = `${process.env.LIVEPEER_API_URL}/api/asset/request-upload`;
  const headers = {
    Authorization: `Bearer ${process.env.LIVEPEER_FULL_API_KEY}`,
    ContentType: 'application/json',
  };
  const options = { headers };
  const response = await fetch(livepeerUpload, options);
  return await response.json();
};
