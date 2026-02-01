"use client";

import { type ReactNode } from "react";

type CardProps = {
    title?: string;
    children: ReactNode;
    className?: string;
    onClick?: () => void;
};

export function MembershipCard({ title, children, className = "", onClick }: CardProps) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onClick();
        }
    };

    return (
        <div
            className={`bg-card text-card-foreground rounded-xl shadow-lg border border-border overflow-hidden transition-all hover:shadow-xl ${className} ${onClick ? "cursor-pointer" : ""}`}
            onClick={onClick ? () => {
                // Haptics removed
                onClick();
            } : undefined}
            onKeyDown={onClick ? handleKeyDown : undefined}
            tabIndex={onClick ? 0 : undefined}
            role={onClick ? "button" : undefined}
        >
            {title && (
                <div className="px-5 py-3 border-b border-border">
                    <h3 className="text-lg font-medium">
                        {title}
                    </h3>
                </div>
            )}
            <div className="p-5">{children}</div>
        </div>
    );
}
