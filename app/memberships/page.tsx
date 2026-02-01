"use client";

import { useState } from "react";
import { MembershipHome } from "@/components/memberships/MembershipHome";
import { MembershipFeatures } from "@/components/memberships/MembershipFeatures";
import Navbar from "@/components/Navbar";

export default function MembershipsPage() {
    const [activeTab, setActiveTab] = useState("home");

    const renderContent = () => {
        switch (activeTab) {
            case "home":
                return <MembershipHome setActiveTab={setActiveTab} />;
            case "features":
                return <MembershipFeatures setActiveTab={setActiveTab} />;
            default:
                return <MembershipHome setActiveTab={setActiveTab} />;
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-md">
                <header className="mb-8 text-center">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">
                        Memberships
                    </h1>
                    <p className="text-muted-foreground">
                        Unlock exclusive content and features.
                    </p>
                </header>

                {/* Custom Tab Navigation */}
                <div className="flex p-1 bg-secondary/50 rounded-xl mb-8">
                    {["home", "features"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                } capitalize`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="min-h-[400px]">
                    {renderContent()}
                </div>

                <footer className="mt-12 text-center text-xs text-muted-foreground pb-8">
                    <p>Powered by Creative TV & Unlock Protocol</p>
                </footer>
            </main>
        </div>
    );
}
