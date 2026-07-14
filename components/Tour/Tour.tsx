'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Joyride,
    EVENTS,
    STATUS,
    ACTIONS,
    type EventData,
    type Step,
} from 'react-joyride';
import { usePathname } from 'next/navigation';
import { useUser } from '@/lib/wallet/react';
import { useTour } from '@/context/TourContext';
import { logger } from '@/lib/utils/logger';

type TourStep = Step & {
    data?: { id: string; openMobileMenu?: boolean };
};

const DESKTOP_STEPS: TourStep[] = [
    {
        target: '#desktop-get-started',
        content: 'Click here to securely sign in with your email address.',
        skipBeacon: true,
        blockTargetInteraction: true,
        placement: 'bottom',
        data: { id: 'connect' },
    },
    {
        target: '#discover-tab',
        content: 'Discover new videos, view metrics, and directly buy a creator\'s token through the video view to support them.',
        skipBeacon: true,
        blockTargetInteraction: false,
        placement: 'bottom',
        data: { id: 'discover' },
    },
    {
        target: '#trade-tab',
        content: 'This is where you can swap, trade, or manage your asset portfolios.',
        skipBeacon: true,
        blockTargetInteraction: false,
        placement: 'bottom',
        data: { id: 'trade' },
    },
];

const MOBILE_STEPS: TourStep[] = [
    {
        target: '.mobile-menu-hamburger',
        content: 'Open the mobile menu first to access the Get Started action.',
        skipBeacon: true,
        blockTargetInteraction: true,
        placement: 'bottom',
        data: { id: 'menu' },
    },
    {
        target: '#discover-tab',
        content: 'Discover new videos, view metrics, and directly buy a creator\'s token through the video view to support them.',
        skipBeacon: true,
        blockTargetInteraction: false,
        placement: 'bottom',
        data: { id: 'discover' },
    },
    {
        target: '#trade-tab',
        content: 'This is where you can swap, trade, or manage your asset portfolios.',
        skipBeacon: true,
        blockTargetInteraction: false,
        placement: 'bottom',
        data: { id: 'trade' },
    },
];

// Map step IDs to the page they require (if not on home)
const STEP_PAGE_MAP: Record<string, string> = {
    'discover': '/discover',
    'trade': '/trade',
};

function getStepPage(stepId: string): string | null {
    return STEP_PAGE_MAP[stepId] ?? null;
}

function openMobileMenuForTour() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('crtv:open-mobile-menu'));
    }
}

function waitForElement(selector: string, timeoutMs = 5000): Promise<boolean> {
    return new Promise((resolve) => {
        if (document.querySelector(selector)) {
            resolve(true);
            return;
        }

        const started = Date.now();
        const interval = window.setInterval(() => {
            if (document.querySelector(selector)) {
                window.clearInterval(interval);
                resolve(true);
                return;
            }
            if (Date.now() - started >= timeoutMs) {
                window.clearInterval(interval);
                resolve(false);
            }
        }, 100);
    });
}

export const Tour = () => {
    const { run, stepIndex, setRun, setStepIndex } = useTour();
    const pathname = usePathname();
    const user = useUser();
    const isConnected = !!user;

    const [isMobile, setIsMobile] = useState(false);
    const [tourKey, setTourKey] = useState(0); // Force re-mount to clear overlay

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const steps = useMemo(
        () => (isMobile ? MOBILE_STEPS : DESKTOP_STEPS),
        [isMobile],
    );

    const getStepIndex = useCallback(
        (id: string) => steps.findIndex((step) => step.data?.id === id),
        [steps],
    );

    const prepareStepTarget = useCallback(
        async (step?: TourStep) => {
            // No special preparation needed for the new flow
            return true;
        },
        [],
    );

    const advanceToStep = useCallback(
        async (nextIndex: number) => {
            const nextStep = steps[nextIndex];
            if (nextStep?.data?.openMobileMenu && isMobile) {
                await prepareStepTarget(nextStep);
            }
            setStepIndex(nextIndex);
        },
        [isMobile, prepareStepTarget, setStepIndex, steps],
    );

    const handleJoyrideCallback = (data: EventData) => {
        const { index, status, type, action } = data;
        const currentStep = steps[index];
        const currentId = currentStep?.data?.id;

        logger.debug('Tour: Callback', { index, status, type, action, currentId });

        if (type === EVENTS.STEP_BEFORE || type === EVENTS.TOUR_START) {
            (document.activeElement as HTMLElement | null)?.blur?.();
        }

        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as typeof STATUS.FINISHED)) {
            setRun(false);
            setStepIndex(0);
            setTourKey(k => k + 1); // Force Joyride to unmount/remount — clears overlay + beacons
            localStorage.setItem('crtv3_tour_completed', 'true');
            localStorage.removeItem('crtv3_tour_running');
            return;
        }

        if (type === EVENTS.TARGET_NOT_FOUND) {
            logger.warn('Tour: target not found', { target: currentStep?.target, index });
            const stepId = currentStep?.data?.id;
            const requiredPage = stepId ? getStepPage(stepId) : null;
            const currentPath = window.location.pathname;

            // If the target is on a different page, navigate there instead of skipping
            if (requiredPage && !currentPath.startsWith(requiredPage)) {
                logger.debug('Tour: navigating to required page', { requiredPage, stepId });
                // Save the current step so it resumes on the new page
                localStorage.setItem('crtv3_tour_step', index.toString());
                window.location.href = requiredPage;
                return;
            }

            // Same page but element not found — wait longer then skip
            if (index < steps.length - 1) {
                window.setTimeout(() => {
                    void advanceToStep(index + 1);
                }, 1000);
            }
            return;
        }

        if (type === EVENTS.STEP_AFTER && action !== ACTIONS.PREV) {
            if (index < steps.length - 1) {
                void advanceToStep(index + 1);
            }
        }
    };

    useEffect(() => {
        if (!run || !isMobile) {
            return;
        }

        // No special mobile handling needed for the new flow
        return () => {};
    }, [run, stepIndex, isMobile, steps, prepareStepTarget]);

    // useEffect(() => {
    //     if (!isConnected || !run || !isMobile) {
    //         return;
    //     }

    //     const connectIndex = getStepIndex('connect');
    //     const connectWalletIndex = getStepIndex('connect-wallet');
    //     if (stepIndex === connectIndex || stepIndex === connectWalletIndex) {
    //         window.setTimeout(() => {
    //             setStepIndex(getStepIndex('user-menu'));
    //         }, 400);
    //     }
    // }, [isConnected, stepIndex, run, isMobile, getStepIndex, setStepIndex]);

    // useEffect(() => {
    //     if (!isConnected || !run || isMobile) {
    //         return;
    //     }

    //     const connectIndex = getStepIndex('connect');
    //     if (stepIndex === connectIndex) {
    //         window.setTimeout(() => setStepIndex(connectIndex + 1), 300);
    //     }
    // }, [isConnected, stepIndex, run, isMobile, getStepIndex, setStepIndex]);

    // useEffect(() => {
    //     if (pathname.startsWith('/upload') && run) {
    //         const uploadFormIndex = getStepIndex('upload-form');
    //         if (stepIndex < uploadFormIndex && uploadFormIndex !== -1) {
    //             setStepIndex(uploadFormIndex);
    //         }
    //     }
    // }, [pathname, stepIndex, run, getStepIndex, setStepIndex]);

    // useEffect(() => {
    //     let interval: NodeJS.Timeout;
    //     const uploadFormIndex = getStepIndex('upload-form');
    //     const publishBtnIndex = getStepIndex('publish-btn');

    //     if (stepIndex === uploadFormIndex && run && uploadFormIndex !== -1 && publishBtnIndex !== -1) {
    //         interval = setInterval(() => {
    //             if (document.getElementById('publish-video-btn')) {
    //                 setStepIndex(publishBtnIndex);
    //             }
    //         }, 1000);
    //     }
    //     return () => clearInterval(interval);
    // }, [stepIndex, run, getStepIndex, setStepIndex]);

    useEffect(() => {
        if (pathname.startsWith('/discover') && run) {
            const discoverIndex = getStepIndex('discover');
            if (stepIndex < discoverIndex && discoverIndex !== -1) {
                setStepIndex(discoverIndex);
            }
        }
    }, [pathname, stepIndex, run, getStepIndex, setStepIndex]);

    const TourTooltip = ({
        index,
        step,
        primaryProps,
        skipProps,
        tooltipProps,
        isLastStep,
        size,
    }: {
        index: number;
        step: Step;
        primaryProps: React.ComponentProps<'button'>;
        skipProps: React.ComponentProps<'button'>;
        tooltipProps: React.ComponentProps<'div'>;
        isLastStep: boolean;
        size: number;
    }) => {
        const { zIndex: _tooltipZIndex, ...restTooltipProps } =
            tooltipProps as typeof tooltipProps & { zIndex?: number };

        return (
            <div
                {...restTooltipProps}
                className="relative z-[10001] w-[min(calc(100vw-2rem),22rem)] overflow-hidden rounded-2xl border border-indigo-100 bg-white p-5 shadow-2xl dark:border-indigo-900 dark:bg-slate-900"
            >
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-bl-full bg-gradient-to-br from-indigo-500 to-purple-600 opacity-10" />

                <div className="relative z-10 text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                    {step.content}
                </div>

                <div className="relative z-10 mt-5 flex items-center justify-between gap-2">
                    <button
                        {...skipProps}
                        className="px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                        Skip
                    </button>
                    <button
                        {...primaryProps}
                        className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 dark:shadow-none"
                    >
                        {isLastStep ? 'Finish' : 'Next Step'}
                    </button>
                </div>
                <div className="relative z-10 mt-2 text-center text-xs font-medium text-slate-400">
                    Step {index + 1} of {size}
                </div>
            </div>
        );
    };

    return (
        <Joyride
            key={tourKey}
            steps={steps}
            run={run}
            stepIndex={stepIndex}
            onEvent={handleJoyrideCallback}
            continuous
            scrollToFirstStep
            options={{
                primaryColor: '#4f46e5',
                zIndex: 10000,
                showProgress: true,
                buttons: ['back', 'close', 'primary', 'skip'],
                overlayClickAction: false,
                scrollOffset: 96,
                spotlightPadding: 10,
            }}
            styles={{
                tooltip: {
                    transition: 'none',
                },
                floater: {
                    filter: 'none',
                },
            }}
            tooltipComponent={TourTooltip}
        />
    );
};
