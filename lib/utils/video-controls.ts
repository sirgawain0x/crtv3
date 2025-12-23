/**
 * Utility functions for safely controlling video playback
 * Prevents AbortError when play() is interrupted by pause()
 */

/**
 * Safely pause a video element, handling any pending play promises
 * @param video - The video element to pause
 * @returns Promise that resolves when pause is complete
 */
export async function safelyPauseVideo(
  video: HTMLVideoElement | null
): Promise<void> {
  if (!video) return;

  try {
    // If video is already paused, no need to do anything
    if (video.paused) return;

    // Pause the video - this will abort any pending play() promise
    video.pause();
  } catch (error) {
    // Ignore AbortError as it's expected when interrupting play()
    if (error instanceof Error && error.name === "AbortError") {
      return;
    }
    console.error("Error pausing video:", error);
  }
}

/**
 * Safely play a video element, handling errors and preventing conflicts
 * @param video - The video element to play
 * @returns Promise that resolves when play starts, or rejects if play fails
 */
export async function safelyPlayVideo(
  video: HTMLVideoElement | null
): Promise<void> {
  if (!video) {
    throw new Error("Video element is null");
  }

  try {
    // If video is already playing, no need to do anything
    if (!video.paused) return;

    // Play the video and wait for the promise
    await video.play();
  } catch (error) {
    // Handle AbortError (when play is interrupted by pause)
    if (error instanceof Error && error.name === "AbortError") {
      // This is expected when pause() is called during play()
      return;
    }

    // Handle NotAllowedError (autoplay policy)
    if (error instanceof Error && error.name === "NotAllowedError") {
      console.warn("Video play was prevented by browser autoplay policy");
      return;
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Create a safe video controller that tracks pending play promises
 * This prevents AbortError when pause() is called during a pending play()
 */
export function createSafeVideoController(video: HTMLVideoElement | null) {
  let playPromise: Promise<void> | null = null;

  const play = async (): Promise<void> => {
    if (!video) return;

    // Cancel any pending play promise before starting a new one
    if (playPromise) {
      try {
        await safelyPauseVideo(video);
      } catch (error) {
        // Ignore errors from canceling previous play
      }
    }

    try {
      if (video.paused) {
        playPromise = video.play();
        await playPromise;
        playPromise = null;
      }
    } catch (error) {
      playPromise = null;
      if (error instanceof Error && error.name === "AbortError") {
        // Expected when interrupted
        return;
      }
      throw error;
    }
  };

  const pause = async (): Promise<void> => {
    if (!video) return;

    // If there's a pending play promise, wait for it or cancel it
    if (playPromise) {
      try {
        // Pause will abort the play promise
        video.pause();
        // Wait for the play promise to be rejected (AbortError)
        try {
          await playPromise;
        } catch (error) {
          // Expected AbortError - ignore it
          if (error instanceof Error && error.name !== "AbortError") {
            throw error;
          }
        }
        playPromise = null;
      } catch (error) {
        playPromise = null;
        if (error instanceof Error && error.name === "AbortError") {
          // Expected when interrupting play
          return;
        }
        throw error;
      }
    } else {
      // No pending play, just pause normally
      await safelyPauseVideo(video);
    }
  };

  return { play, pause };
}

