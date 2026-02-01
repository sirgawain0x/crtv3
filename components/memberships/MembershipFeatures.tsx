"use client";

import { useState } from "react";
import { MembershipCard } from "./MembershipCard";
import { MembershipIcon } from "./MembershipIcon";
import { MembershipButton } from "./MembershipButton";

type FeaturesProps = {
    setActiveTab: (tab: string) => void;
};

export function MembershipFeatures({ setActiveTab }: FeaturesProps) {
    const [activeTier, setActiveTier] = useState(0);
    const tiers = [
        {
            name: "Creator",
            icon: "star" as const,
            features: [
                "Access to exclusive creative resources and events",
                "Media exposure opportunities",
                "Seasonal creative challenges and competitions",
                "Competitve revenue sharing and earning opportunities",
                "Access to creative Web3/AI software and tools",
                "Community feedback and collaboration spaces",
            ],
        },
        {
            name: "Investor",
            icon: "star" as const,
            features: [
                "Exclusive access to emerging creative talent",
                "Priority investment opportunities in creative projects",
                "Detailed market analysis and trend reports",
                "Direct connections with top-tier creators",
                "Portfolio diversification strategies",
                "Exclusive investor-only events and networking",
                "Advanced analytics and performance tracking",
            ],
        },
        {
            name: "Brand",
            icon: "star" as const,
            features: [
                "Curated creator partnerships and collaborations",
                "Custom brand integration and storytelling campaigns",
                "Access to premium creative talent pool",
                "Strategic marketing consultation and campaign planning",
                "Exclusive brand showcase and visibility opportunities",
                "Priority access to trending creators and influencers",
                "Comprehensive brand analytics and ROI tracking",
            ],
        },
    ];

    const nextTier = () => {
        setActiveTier((prev) => (prev + 1) % tiers.length);
    };

    const prevTier = () => {
        setActiveTier((prev) => (prev - 1 + tiers.length) % tiers.length);
    };

    const goToTier = (index: number) => {
        setActiveTier(index);
    };

    return (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <MembershipCard title="Membership Tiers & Features">
                <div className="space-y-6">
                    {/* Tier Cards Container */}
                    <div className="relative">
                        <div className="overflow-hidden">
                            <div
                                className="flex transition-transform duration-300 ease-in-out"
                                style={{ transform: `translateX(-${activeTier * 100}%)` }}
                            >
                                {tiers.map((tier, index) => (
                                    <div key={tier.name} className="w-full flex-shrink-0">
                                        <div className="bg-gradient-to-br from-card to-secondary/50 rounded-xl p-6 border border-border">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-xl font-bold text-primary flex items-center">
                                                    <MembershipIcon name={tier.icon} className="mr-2" />
                                                    {tier.name} Tier
                                                </h3>
                                                <span className="text-sm text-muted-foreground">
                                                    {index + 1} of {tiers.length}
                                                </span>
                                            </div>

                                            <ul className="space-y-3">
                                                {tier.features.map((feature, featureIndex) => (
                                                    <li key={featureIndex} className="flex items-start">
                                                        <MembershipIcon
                                                            name="check"
                                                            className="text-primary mt-1 mr-3 flex-shrink-0"
                                                        />
                                                        <span className="text-muted-foreground text-sm">
                                                            {feature}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Navigation Arrows */}
                        <button
                            onClick={prevTier}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-popover hover:bg-accent p-2 rounded-full shadow-lg border border-border transition-colors text-popover-foreground"
                            aria-label="Previous tier"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                        </button>

                        <button
                            onClick={nextTier}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-popover hover:bg-accent p-2 rounded-full shadow-lg border border-border transition-colors text-popover-foreground"
                            aria-label="Next tier"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                />
                            </svg>
                        </button>
                    </div>

                    {/* Dots Indicator */}
                    <div className="flex justify-center space-x-2">
                        {tiers.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => goToTier(index)}
                                className={`w-2 h-2 rounded-full transition-colors ${index === activeTier
                                    ? "bg-primary"
                                    : "bg-muted-foreground/30 hover:bg-muted-foreground"
                                    }`}
                                aria-label={`Go to ${tiers[index].name} tier`}
                            />
                        ))}
                    </div>

                    {/* Swipe Instructions */}
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">
                            Swipe or use arrows to explore different tiers
                        </p>
                    </div>
                </div>

                <MembershipButton
                    variant="outline"
                    onClick={() => setActiveTab("home")}
                    className="mt-4"
                >
                    Back to Home
                </MembershipButton>
            </MembershipCard>
        </div>
    );
}
