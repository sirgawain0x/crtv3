'use client';

import { useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step, EVENTS } from 'react-joyride';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@account-kit/react';
import { useTour } from '@/context/TourContext';

export const Tour = () => {
    const { run, stepIndex, setRun, setStepIndex } = useTour();
    const router = useRouter();
    const pathname = usePathname();
    const user = useUser();
    const isConnected = !!user;

    const steps: Step[] = [
        {
            target: '#connect-wallet-btn',
            content: 'Sign in to get started! Click "Get Started" to create your account with just your email.',
            disableBeacon: true,
            disableOverlayClose: true,
            hideCloseButton: true,
            spotlightClicks: true,
            floaterProps: {
                hideArrow: false,
            },
        },
        {
            target: '#nav-user-menu, #mobile-menu-btn',
            content: 'Click your profile to open the menu, then select "Upload" to start adding content.',
            spotlightClicks: true,
            disableOverlayClose: true,
        },
        {
            target: '#upload-video-form',
            content: 'Upload your video file here. You can drag and drop or select a file.',
            placement: 'bottom',
        },
        {
            target: '#publish-video-btn',
            content: 'Once uploaded, click Publish to share it with the world!',
        },
        {
            target: '#nav-discover-link',
            content: 'Check out what others are creating on the Discover page.',
        },
        {
            target: '#nav-trade-link, #mobile-nav-trade-link',
            content: 'Buy or sell Creative Coins by creators on the platform in the Trading Market.',
        },
    ];

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { index, status, type } = data;
        console.log("Tour: Callback data:", data);

        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
            console.log("Tour: Finished or Skipped");
            setRun(false);
            localStorage.setItem('crtv3_tour_completed', 'true');
        } else if (type === EVENTS.STEP_AFTER) {
            console.log("Tour: Advancing step");
            setStepIndex(index + 1);
        } else if (type === EVENTS.TARGET_NOT_FOUND) {
            console.log("Tour: Target not found for step", index, " - Waiting for element to appear...");
            // Do NOT advance step index. 
            // This allows the step to remain active (or be retried) until the element appears 
            // (e.g., via page navigation or loading state handled by useEffects).
        }
    };

    // Custom logic to advance step if wallet connects while on step 0
    useEffect(() => {
        if (isConnected && stepIndex === 0 && run) {
            setStepIndex(1);
        }
    }, [isConnected, stepIndex, run, setStepIndex]);

    // Auto-advance if on upload page and previous steps are meant for navigation
    // Step 1 is "Navigate to Upload". If we are on /upload, we should be on Step 2.
    useEffect(() => {
        if (pathname.startsWith('/upload') && stepIndex < 2 && run) {
            setStepIndex(2);
        }
    }, [pathname, stepIndex, run, setStepIndex]);

    // Auto-advance from File Upload (Step 2) to Publish (Step 3) 
    // when the Publish button appears in the DOM.
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (stepIndex === 2 && run) {
            interval = setInterval(() => {
                if (document.getElementById('publish-video-btn')) {
                    setStepIndex(3);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [stepIndex, run, setStepIndex]);

    // Auto-advance to Discover (Step 4) if we land on /discover page
    // This handles the redirect after clicking Publish.
    useEffect(() => {
        if (pathname.startsWith('/discover') && stepIndex === 3 && run) {
            setStepIndex(4);
        }
    }, [pathname, stepIndex, run, setStepIndex]);

    // Custom Tooltip component
    const Tooltip = ({
        index,
        step,
        backProps,
        closeProps,
        primaryProps,
        tooltipProps,
    }: any) => {
        // Hide "Next" button on Step 0 (Connect) and Step 1 (Navigate)
        // User must perform the action to advance.
        // Also hide on upload steps where we auto-advance based on UI interactions
        const showNextButton = index !== 0 && index !== 1 && index !== 2 && index !== 3;

        return (
            <div {...tooltipProps} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl border border-indigo-100 dark:border-indigo-900 max-w-sm relative overflow-hidden">
                {/* Decorative BG element */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-10 rounded-bl-full -mr-4 -mt-4"></div>

                <div className="relative z-10 text-slate-800 dark:text-slate-100">
                    {step.content}
                </div>

                <div className="mt-6 flex justify-between items-center relative z-10">
                    <div className="text-xs text-slate-400 font-medium">
                        Step {index + 1} of {steps.length}
                    </div>
                    <div className="flex gap-2">
                        {showNextButton && (
                            <button {...primaryProps} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-full hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 dark:shadow-none">
                                {index === steps.length - 1 ? 'Finish' : 'Next'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <Joyride
            steps={steps}
            run={run}
            stepIndex={stepIndex}
            callback={handleJoyrideCallback}
            continuous
            showProgress
            showSkipButton
            tooltipComponent={Tooltip}
            styles={{
                options: {
                    zIndex: 10000,
                    primaryColor: '#4f46e5',
                },
            }}
        />
    );
};
