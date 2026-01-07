"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";

interface TourContextType {
    run: boolean;
    stepIndex: number;
    setRun: (run: boolean) => void;
    setStepIndex: (index: number) => void;
    startTour: () => void;
    resetTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider = ({ children }: { children: ReactNode }) => {
    const [run, setRun] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);

    // Initialize tour based on localStorage on mount
    useEffect(() => {
        const tourCompleted = localStorage.getItem("crtv3_tour_completed");
        const storedStep = localStorage.getItem("crtv3_tour_step");

        console.log("TourContext: Checking localStorage:", { tourCompleted, storedStep });

        if (storedStep) {
            setStepIndex(parseInt(storedStep, 10));
        }

        if (!tourCompleted) {
            console.log("TourContext: No completion found, setting run=true");
            setRun(true);
        } else {
            console.log("TourContext: Tour previously completed.");
        }
    }, []);

    useEffect(() => {
        console.log("TourContext: State updated - run:", run, "stepIndex:", stepIndex);
        if (run) {
            localStorage.setItem("crtv3_tour_step", stepIndex.toString());
        }
    }, [run, stepIndex]);

    const startTour = () => {
        console.log("TourContext: startTour called!");
        setRun(true);
        setStepIndex(0);
        // Clear completion and saved step
        localStorage.removeItem("crtv3_tour_completed");
        localStorage.setItem("crtv3_tour_step", "0");
    };

    const resetTour = () => {
        console.log("TourContext: resetTour called");
        setRun(false);
        setStepIndex(0);
    };

    return (
        <TourContext.Provider
            value={{
                run,
                stepIndex,
                setRun,
                setStepIndex,
                startTour,
                resetTour,
            }}
        >
            {children}
        </TourContext.Provider>
    );
};

export const useTour = () => {
    const context = useContext(TourContext);
    if (context === undefined) {
        throw new Error("useTour must be used within a TourProvider");
    }
    return context;
};
