'use client';
import { getLivePeerAiGeneratedImages } from '@app/api/livepeer/livepeerAiActions';
import { Button } from '@app/components/ui/button';
import { Textarea } from '@app/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { useState } from 'react';
import { TextToImageParams } from 'livepeer/models/components';
import { SparklesIcon } from 'lucide-react';

import { Media } from 'livepeer/models/components';

export const CreateThumbnailAi = () => {
  const [userPrompt, setUserPrompt] = useState('');
  const [aiModel, setAiModel] = useState<string | undefined>('');
  //const [generatedImages, setGeneratedImages] = useState<Media[]>([]);

  const triggerAiCall = async () => {
    try {
      const params: TextToImageParams = {
        modelId: aiModel,
        prompt: userPrompt,
        // Add other required parameters here
      };
      const result = await getLivePeerAiGeneratedImages(params);
      console.log('Generated Images', result?.images);
      //setGeneratedImages(result?.images || []);
    } catch (e: any) {
      console.log('Error generating ai image', e?.message);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <Select onValueChange={setAiModel} defaultValue={aiModel}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select A Model" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Models</SelectLabel>
              <SelectItem value="SG161222/RealVisXL_V4.0_Lightning">
                Lightning
              </SelectItem>
              <SelectItem value="black-forest-labs/FLUX.1-schnell">
                Black Forrest
              </SelectItem>
              <SelectItem value="alimama-creative/FLUX.1-Turbo-Alpha">
                Alima
              </SelectItem>
              <SelectItem value="CompVis/stable-diffusion-v1-4">
                CompVis
              </SelectItem>
              <SelectItem value="stabilityai/stable-diffusion-2">
                Stability
              </SelectItem>
              <SelectItem value="Shakker-Labs/FLUX.1-dev-LoRA-One-Click-Creative-Template">
                Shakker
              </SelectItem>
              <SelectItem value="aleksa-codes/flux-ghibsky-illustration">
                Ghibsky
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="mb-4">
        <Textarea
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          placeholder="A photorealistic image of a cat wearing a tiny chef's hat and apron, cooking a gourmet meal in a miniature kitchen."
        />
      </div>
      <div>
        <Button onClick={() => triggerAiCall()}>
          <SparklesIcon className="mr-1 h-4 w-4" /> Generate
        </Button>
      </div>
    </div>
  );
};

export default CreateThumbnailAi;
