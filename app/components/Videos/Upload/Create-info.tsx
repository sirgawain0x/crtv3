'use client';

import { useForm, Controller } from 'react-hook-form';
import { Input } from '@app/components/ui/input';
import { Label } from '@app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Button } from '@app/components/ui/button';
import { FormControl, FormLabel } from '@chakra-ui/react';
import { FormEvent, useEffect } from 'react';

type TCreateInfoProps = {
  onPressNext: (formData: TVideoMetaForm) => void;
};

export type TVideoMetaForm = {
  title: string;
  description: string;
  location?: string;
  category?: string;
};

const CreateInfo = ({ onPressNext }: TCreateInfoProps) => {
  const {
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    register,
    control,
  } = useForm<TVideoMetaForm>({
    mode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
      location: '',
      category: '',
    },
  });

  const onSubmit = (data: TVideoMetaForm) => {
    onPressNext(data);
  };

  const handleSelectCategory = (value: string) => setValue('category', value);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-4xl px-4">
      <div className="my-6 flex justify-center">
        <h4 className="stepper_step_heading text-xl font-semibold md:text-2xl">Details</h4>
      </div>
      <div className="my-4 space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">
          Title
        </Label>
        <Input
          id="title"
          placeholder="Rick Astley - Never Gonna Give You Up (Official Music Video)"
          className="mt-1 h-12 w-full rounded-md border border-[#444752] bg-white p-3 text-base text-gray-600 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          data-testid="create-info-title"
          {...register('title', {
            required: true,
          })}
        />
      </div>
      <div className="mt-6 space-y-2">
        <Label className="text-sm font-medium">Description</Label>
        <textarea
          placeholder="Never Gonna Give You Up was a global smash on its release in July 1987, topping the charts in 25 countries including Rick's native UK and the US Billboard Hot 100.  It also won the Brit Award for Best single in 1988. Stock Aitken and Waterman wrote and produced the track which was the lead-off single and lead track from Rick's debut LP "
          className="mt-1 min-h-[128px] w-full rounded-md border border-[#444752] bg-white p-3 text-base text-gray-600 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          data-testid="create-info-description"
          {...register('description', {
            required: true,
          })}
        />
      </div>
      <div className="mt-6 flex w-full flex-col gap-6 lg:flex-row lg:justify-between">
        <div className="flex w-full flex-col space-y-2 lg:w-[48%]">
          <Label className="text-sm font-medium">Location</Label>
          <Input
            type="text"
            placeholder="New York - United States"
            className="mt-1 h-12 w-full rounded-md border border-[#444752] bg-white p-3 text-base text-gray-600 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            data-testid="create-info-location"
            {...register('location', {
              required: false,
            })}
          />
        </div>
        <div className="flex w-full flex-col space-y-2 lg:w-[48%]">
          <FormLabel className="text-sm font-medium">Category</FormLabel>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger 
                    data-testid="create-info-category"
                    className="h-12 w-full border-[#444752] bg-white text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <SelectValue placeholder="Select a Category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Music">Music</SelectItem>
                  <SelectItem value="Sports">Sports</SelectItem>
                  <SelectItem value="Gaming">Gaming</SelectItem>
                  <SelectItem value="News">News</SelectItem>
                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Sci-tech">Science & Technology</SelectItem>
                  <SelectItem value="Travel">Travel</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      <div className="my-8 flex justify-center">
        <Button
          type="submit"
          className="h-12 min-w-[120px] rounded-md bg-blue-600 px-6 text-base font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
          disabled={!isValid}
          data-testid="create-info-next"
        >
          Next
        </Button>
      </div>
    </form>
  );
};

export default CreateInfo;
