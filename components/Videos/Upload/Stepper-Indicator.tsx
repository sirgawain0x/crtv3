import { Separator } from "@/components/ui/separator";
import clsx from "clsx";
import { Check } from "lucide-react";
import React, { Fragment } from "react";

interface StepperIndicatorProps {
  activeStep: number;
}

const StepperIndicator = ({ activeStep }: StepperIndicatorProps) => {
  return (
    <div className="flex items-center justify-center px-4">
      {[1, 2].map((step) => (
        <Fragment key={step}>
          <div
            className={clsx(
              "m-1 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs sm:m-[5px] sm:h-[40px] sm:w-[40px] sm:text-base",
              step < activeStep && "bg-secondary text-[#EC407A]",
              step === activeStep && "border-primary text-primary"
            )}
          >
            {step >= activeStep ? step : <Check className="h-3 w-3 sm:h-5 sm:w-5" />}
          </div>
          {step !== 2 && (
            <Separator
              orientation="horizontal"
              className={clsx(
                "h-[2px] w-16 sm:w-[100px]",
                step <= activeStep - 1 && "bg-primary"
              )}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
};

export default StepperIndicator;
