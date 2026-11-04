"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { passAccessUntilMessage } from "@/lib/access/format-pass-expiration";

interface CancelMembershipButtonProps {
  expiration: number;
  acknowledged?: boolean;
  onConfirm?: () => void | Promise<void>;
}

export function CancelMembershipButton({
  expiration,
  acknowledged = false,
  onConfirm,
}: CancelMembershipButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const accessMessage = passAccessUntilMessage(expiration);

  const handleConfirm = async () => {
    setIsOpen(false);
    toast.success(accessMessage);
    await onConfirm?.();
  };

  if (acknowledged) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="pass-cancel-acknowledged">
        {accessMessage}
      </p>
    );
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" data-testid="pass-cancel-trigger">
          Cancel pass
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent data-testid="pass-cancel-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this pass?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Creative passes are 30-day access passes. You buy again manually when you want
                continued access—nothing charges on its own.
              </p>
              <p>
                Cancelling means you will not buy again for this pass when it expires.{" "}
                {accessMessage}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep pass</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              void handleConfirm();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="pass-cancel-confirm"
          >
            Yes, cancel pass
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
