"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { updateVideoAsset } from "@/services/video-assets";
import type { VideoAsset } from "@/lib/types/video-asset";

interface VideoEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoAsset: VideoAsset;
  onSuccess?: () => void;
}

interface VideoEditFormData {
  title: string;
  description: string;
  category: string;
  location: string;
}

const GENRES = [
  "Pop",
  "Rock",
  "Hip-Hop/Rap",
  "R&B/Soul",
  "EDM",
  "Country",
  "Jazz",
  "Blues",
  "Classical",
  "Folk",
  "Reggae",
  "Latin",
  "Metal",
  "Podcast",
  "Other",
];

export function VideoEditDialog({
  open,
  onOpenChange,
  videoAsset,
  onSuccess,
}: VideoEditDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<VideoEditFormData>({
    defaultValues: {
      title: videoAsset.title || "",
      description: videoAsset.description || "",
      category: videoAsset.category || "",
      location: videoAsset.location || "",
    },
  });

  const categoryValue = watch("category");

  // Reset form when video asset changes
  useEffect(() => {
    if (videoAsset) {
      reset({
        title: videoAsset.title || "",
        description: videoAsset.description || "",
        category: videoAsset.category || "",
        location: videoAsset.location || "",
      });
    }
  }, [videoAsset, reset]);

  const onSubmit = async (data: VideoEditFormData) => {
    setIsSaving(true);
    try {
      await updateVideoAsset(videoAsset.id, {
        title: data.title.trim(),
        description: data.description.trim() || null,
        category: data.category.trim() || "",
        location: data.location.trim() || "",
      });

      toast({
        title: "Video Updated",
        description: "Your video has been updated successfully.",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error updating video:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update video. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Video</DialogTitle>
          <DialogDescription>
            Update your video details. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Enter video title"
                {...register("title", {
                  required: "Title is required",
                  minLength: {
                    value: 1,
                    message: "Title must be at least 1 character",
                  },
                  maxLength: {
                    value: 200,
                    message: "Title must be less than 200 characters",
                  },
                })}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter video description"
                rows={4}
                {...register("description", {
                  maxLength: {
                    value: 5000,
                    message: "Description must be less than 5000 characters",
                  },
                })}
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Genre</Label>
              <Select
                value={categoryValue}
                onValueChange={(value) => setValue("category", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a Genre" />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map((genre) => (
                    <SelectItem key={genre} value={genre}>
                      {genre === "Other" ? "World Music" : genre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Enter location (optional)"
                {...register("location", {
                  maxLength: {
                    value: 100,
                    message: "Location must be less than 100 characters",
                  },
                })}
              />
              {errors.location && (
                <p className="text-sm text-destructive">
                  {errors.location.message}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

