import { Controller, useFormContext } from 'react-hook-form';
import { StepperFormValues } from '@app/types/hook-stepper';
import { Input } from '@app/components/ui/input';
import { useRef } from 'react';
import Image from 'next/image';

const CreateInfo = () => {
  const {
    control,
    formState: { errors },
    register,
  } = useFormContext<StepperFormValues>();

  const thumbnailRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label htmlFor="title" className="text-sm">
        Title
      </label>
      <Input
        id="title"
        placeholder="Rick Astley - Never Gonna Give You Up (Official Music Video)"
        className="mt-2 h-12 w-full rounded-md border border-[#444752] p-2 text-gray-600 placeholder:text-gray-400 focus:outline-none"
        {...register('title', {
          required: true,
        })}
      />
      <label className="mt-10">Description</label>
      <textarea
        placeholder="Never Gonna Give You Up was a global smash on its release in July 1987, topping the charts in 25 countries including Rick's native UK and the US Billboard Hot 100.  It also won the Brit Award for Best single in 1988. Stock Aitken and Waterman wrote and produced the track which was the lead-off single and lead track from Rick's debut LP "
        className="mt-2 h-32 w-full rounded-md border border-[#444752] p-2 text-gray-600 placeholder:text-gray-400 focus:outline-none"
        {...register('description', {
          required: true,
        })}
      />

      <div className="mt-10 flex w-full flex-col justify-between lg:flex-row">
        <div className="mb-4 flex w-full flex-col lg:mb-0 lg:w-2/5">
          <label className="text-sm">Location</label>
          <Input
            type="text"
            placeholder="New York - United States"
            className="mt-2 h-12 w-full rounded-md border border-[#444752] p-2 text-gray-600 placeholder:text-gray-400 focus:outline-none"
            {...register('location', {
              required: false,
            })}
          />
        </div>
        <div className="flex w-full flex-col lg:w-2/5">
          <label className="text-sm">Category</label>
          <select
            {...register('category', {
              required: false,
            })}
            className="mt-2 h-12 w-full rounded-md border border-[#444752] p-2 text-gray-600 placeholder:text-gray-400 focus:outline-none"
          >
            <option>Music</option>
            <option>Sports</option>
            <option>Gaming</option>
            <option>News</option>
            <option>Entertainment</option>
            <option>Education</option>
            <option>Science & Technology</option>
            <option>Travel</option>
            <option>Other</option>
          </select>
        </div>
      </div>
      {/* <label className="mt-10 text-sm">Thumbnail</label>

          <div
            onClick={() => {
              thumbnailRef.current?.click();
            }}
            className="mt-2 flex h-36 w-64 items-center justify-center rounded-md border-2 border-dashed border-gray-600 p-2"
          >
            {thumbnail ? (
              <Image
                onClick={() => {
                  thumbnailRef.current?.click();
                }}
                src={''}
                alt="thumbnail"
                className="h-full rounded-md"
              />
            ) : (
              <BiPlus size={40} />
            )}
          </div>

          <Input
            ref={thumbnailRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e?.target?.files ? e.target.files[0] : null;
              if (file) {
                setThumbnail(file);
                //Upload to IPFS
                upload({
                  client,
                  files: [
                    {
                      name: 'thumbnail',
                      data: file,
                      type: 'image/png',
                    },
                  ],
                });
              }
            }}
          /> */}
    </div>
  );
};

export default CreateInfo;
