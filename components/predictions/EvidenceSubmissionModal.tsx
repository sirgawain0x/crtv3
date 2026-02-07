"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSmartAccountClient } from "@account-kit/react";
import { submitEvidence } from "@/lib/sdk/reality-eth/reality-eth-arbitrator";
import { useToast } from "@/components/ui/use-toast"; // Assuming use-toast exists based on existing files
import { Loader2, ExternalLink } from "lucide-react";
import { logger } from "@/lib/utils/logger";

interface EvidenceSubmissionModalProps {
    questionId: string;
    trigger?: React.ReactNode;
}

export function EvidenceSubmissionModal({ questionId, trigger }: EvidenceSubmissionModalProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [uri, setUri] = useState("");

    const { client: smartAccountClient } = useSmartAccountClient({});
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!smartAccountClient) {
            toast({
                variant: "destructive",
                title: "Wallet not connected",
                description: "Please connect your wallet to submit evidence.",
            });
            return;
        }

        if (!uri) {
            toast({
                variant: "destructive",
                title: "Evidence Link Required",
                description: "Please provide a link to your evidence (e.g., IPFS, PDF).",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // Construct ERC-1497 Evidence JSON
            // If the user provides a direct link to a file (like an image or PDF), we might wrap it 
            // in a JSON metadata file ideally, but for now we'll support direct linking or 
            // if they provide a JSON URI, we use it directly. 
            // However, to follow the standard best, we should probably construct a data URI or key values if we can't upload.
            // For this MVP, we will assume the URI provided points to the evidence content itself, 
            // or is already a metadata URI.

            // If we wanted to be strict ERC-1497, we'd need to upload a JSON like:
            // { "fileURI": uri, "name": title, "description": description }
            // to IPFS, and then submit THAT hash. 
            // Since we don't have an IPFS uploader handy in this context yet, 
            // we will submit the URI directly if it looks like a file, OR 
            // we could encode the metadata as a data URI if it's small enough (gas expensive).

            // DECISION: We will submit the URI as given. 
            // The Kleros UI might expect a JSON at that URI.
            // Users should ideally link to an IPFS JSON. 
            // We will add a helper text to inform them.

            const txHash = await submitEvidence(
                smartAccountClient,
                questionId,
                uri
            );

            toast({
                title: "Evidence Submitted",
                description: "Your evidence transaction has been sent.",
            });

            logger.info("Evidence submitted:", { questionId, txHash });
            setOpen(false);

            // Reset form
            setTitle("");
            setDescription("");
            setUri("");

        } catch (error: any) {
            logger.error("Error submitting evidence:", error);
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: error?.message || "Failed to submit evidence transaction.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline">Submit Evidence</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Submit Evidence</DialogTitle>
                    <DialogDescription>
                        Submit evidence to the Kleros Arbitrator to resolve a dispute.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g. Official Match Results"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Explain what this evidence proves..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="uri">
                                Evidence Link (URI) <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="uri"
                                placeholder="https://ipfs.io/ipfs/..."
                                value={uri}
                                onChange={(e) => setUri(e.target.value)}
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Link to your evidence file (IPFS preferred) or a JSON metadata file complying with ERC-1497.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Transaction
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
