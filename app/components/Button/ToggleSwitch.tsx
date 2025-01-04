import { useState } from 'react';
import '../../styles/toggleable.css';
import React from 'react';

type TSwithButtonProps = {
  children: React.ReactNode | React.ReactNode[];
  label: string;
};

export type TSwithButtonChildProps = {
  handleToggleSwitch?: () => void;
};

export default function ToggleSwitch(props: TSwithButtonProps) {
  const [isOn, setIsOn] = useState(false);

  const handleToggleSwitch = () => {
    setIsOn(!isOn);
  };

  const childrenWithProps = React.Children.map(props.children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(
        child as React.ReactElement<TSwithButtonChildProps>,
        { handleToggleSwitch },
      );
    }

    return child;
  });

  return (
    <div className="my-12">
      <div className="flex items-center space-x-4">
        <p className="text-lg font-semibold">{props.label}</p>
        <label className="relative inline-block h-8 w-16">
          <input
            type="checkbox"
            checked={isOn}
            onChange={handleToggleSwitch}
            className="sr-only"
          />
          <div
            className={`slider cursor-pointer rounded-full transition-all duration-300 ${
              isOn ? 'bg-green-500' : 'bg-gray-500'
            }`}
          >
            <div
              className={`dot absolute left-1 top-1 h-6 w-6 rounded-full bg-white transition-all duration-300 ${
                isOn ? 'translate-x-8 transform' : ''
              }`}
            ></div>
          </div>
        </label>
      </div>

      {isOn && (
        <div className="m-0 my-9 flex min-w-56 flex-col space-y-4">
          {childrenWithProps}
        </div>
      )}
    </div>
  );
}
