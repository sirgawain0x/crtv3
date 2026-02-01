"use client";

import { type ReactNode } from "react";

type ButtonProps = {
    children: ReactNode;
    variant?: "primary" | "secondary" | "outline" | "ghost";
    size?: "sm" | "md" | "lg";
    className?: string;
    onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    icon?: ReactNode;
};

export function MembershipButton({
    children,
    variant = "primary",
    size = "md",
    className = "",
    onClick,
    disabled = false,
    type = "button",
    icon,
}: ButtonProps) {
    const baseClasses =
        "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0052FF] disabled:opacity-50 disabled:pointer-events-none";

    // Using Tailwind colors but ensuring they map to CSS variables or standard colors
    // Assuming --app-accent etc are defined in globals.css, otherwise fallback to Tailwind colors
    const variantClasses = {
        primary:
            "bg-primary hover:bg-primary/90 text-primary-foreground", // Use chadcn/standard names if available, or custom
        secondary:
            "bg-secondary hover:bg-secondary/80 text-secondary-foreground",
        outline:
            "border border-input hover:bg-accent hover:text-accent-foreground",
        ghost:
            "hover:bg-accent hover:text-accent-foreground",
    };

    // Override with specific colors if the CSS variables from the original project are not present
    // But let's try to stick to standard Tailwind classes that likely exist in crtv3
    // If crtv3 uses customization, we might need to adjust.
    // For now, I'll use standard Tailwind classes that are safe.

    const sizeClasses = {
        sm: "text-xs px-2.5 py-1.5 rounded-md",
        md: "text-sm px-4 py-2 rounded-lg",
        lg: "text-base px-6 py-3 rounded-lg",
    };

    return (
        <button
            type={type}
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
            onClick={(e) => {
                // Haptics removed
                onClick?.(e);
            }}
            disabled={disabled}
        >
            {icon && <span className="flex items-center mr-2">{icon}</span>}
            {children}
        </button>
    );
}
