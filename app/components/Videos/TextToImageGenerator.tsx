import React, { useState } from 'react';
import { Textarea } from '../ui/textarea';
import Image from 'next/image';
import { Button } from '../ui/button';

const TextToImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [modelId, setModelId] = useState('SG161222/RealVisXL_V4.0_Lightning');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateImage = async () => {
    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const response = await fetch('/api/livepeer/textToImage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, model_id: modelId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image.');
      }

      const data = await response.json();
      // Assuming the API returns a URL to the generated image
      setImageUrl(data.imageUrl);
    } catch (err: any) {
      console.error('Error generating image:', err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-to-image-generator">
      <h2>Generate Image from Text</h2>
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt"
        rows={4}
        className="textarea"
      />
      <Button onClick={handleGenerateImage} disabled={loading || !prompt}>
        {loading ? 'Generating...' : 'Generate Image'}
      </Button>

      {error && <p className="error">Error: {error}</p>}
      {imageUrl && (
        <div className="image-result">
          <Image src={imageUrl} alt="Generated" />
        </div>
      )}
    </div>
  );
};

export default TextToImageGenerator;
