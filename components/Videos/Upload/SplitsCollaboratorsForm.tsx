"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { CollaboratorFormData } from "@/lib/types/splits";

interface SplitsCollaboratorsFormProps {
  collaborators: CollaboratorFormData[];
  onChange: (collaborators: CollaboratorFormData[]) => void;
}

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function SplitsCollaboratorsForm({
  collaborators,
  onChange,
}: SplitsCollaboratorsFormProps) {
  const [newCollaborator, setNewCollaborator] = useState<CollaboratorFormData>({
    address: "",
    percentage: 0,
  });
  const [errors, setErrors] = useState<{
    address?: string;
    percentage?: string;
    total?: string;
  }>({});

  const totalPercentage = collaborators.reduce(
    (sum, c) => sum + c.percentage,
    0
  );

  const validateAddress = (address: string): boolean => {
    if (!address) {
      setErrors((prev) => ({ ...prev, address: "Address is required" }));
      return false;
    }
    if (!ETH_ADDRESS_REGEX.test(address)) {
      setErrors((prev) => ({
        ...prev,
        address: "Invalid Ethereum address format",
      }));
      return false;
    }
    // Check for duplicates
    if (
      collaborators.some(
        (c) => c.address.toLowerCase() === address.toLowerCase()
      )
    ) {
      setErrors((prev) => ({
        ...prev,
        address: "This address is already added",
      }));
      return false;
    }
    setErrors((prev => {
      const { address, ...rest } = prev;
      return rest;
    }));
    return true;
  };

  const validatePercentage = (percentage: number): boolean => {
    if (percentage <= 0 || percentage > 100) {
      setErrors((prev) => ({
        ...prev,
        percentage: "Percentage must be between 1 and 100",
      }));
      return false;
    }
    const newTotal = totalPercentage + percentage;
    if (newTotal > 100) {
      const remaining = 100 - totalPercentage;
      setErrors((prev) => ({
        ...prev,
        percentage: remaining > 0 
          ? `Maximum remaining: ${remaining.toFixed(2)}% (current total: ${totalPercentage.toFixed(2)}%)`
          : `Total already at 100%. Remove a collaborator or reduce their share first.`,
      }));
      return false;
    }
    setErrors((prev => {
      const { percentage, ...rest } = prev;
      return rest;
    }));
    return true;
  };

  const handleAddCollaborator = () => {
    const addressValid = validateAddress(newCollaborator.address);
    const percentageValid = validatePercentage(newCollaborator.percentage);

    if (addressValid && percentageValid) {
      onChange([...collaborators, newCollaborator]);
      setNewCollaborator({ address: "", percentage: 0 });
      setErrors({});
    }
  };

  const handleRemoveCollaborator = (index: number) => {
    onChange(collaborators.filter((_, i) => i !== index));
  };

  const handleAddressChange = (value: string) => {
    setNewCollaborator((prev) => ({ ...prev, address: value }));
    if (errors.address) {
      validateAddress(value);
    }
  };

  const handlePercentageChange = (value: string) => {
    // Allow empty input for better UX
    if (value === "") {
      setNewCollaborator((prev) => ({ ...prev, percentage: 0 }));
      return;
    }
    const numValue = parseFloat(value);
    // Only update if it's a valid number
    if (!isNaN(numValue)) {
      // Clamp to 0-100 range
      const clampedValue = Math.max(0, Math.min(100, numValue));
      setNewCollaborator((prev) => ({ ...prev, percentage: clampedValue }));
      if (errors.percentage) {
        validatePercentage(clampedValue);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Revenue Splits</Label>
        <p className="text-xs text-muted-foreground">
          Add collaborators to automatically split revenue. Total must equal exactly 100%.
        </p>
      </div>

      {/* Existing Collaborators */}
      {collaborators.length > 0 && (
        <div className="space-y-2">
          {collaborators.map((collab, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-md border border-input bg-background p-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono truncate">{collab.address}</p>
                <p className="text-xs text-muted-foreground font-medium">
                  {collab.percentage.toFixed(2)}%
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveCollaborator(index)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Total Percentage Display */}
      {collaborators.length > 0 && (
        <div className="flex items-center justify-between rounded-md border border-input bg-muted/50 px-3 py-2">
          <span className="text-sm font-medium">Total:</span>
          <span
            className={`text-sm font-semibold ${
              totalPercentage === 100
                ? "text-green-600 dark:text-green-400"
                : totalPercentage > 100
                ? "text-red-600 dark:text-red-400"
                : "text-yellow-600 dark:text-yellow-400"
            }`}
          >
            {totalPercentage.toFixed(2)}%
          </span>
        </div>
      )}

      {/* Add New Collaborator */}
      <div className="space-y-3 rounded-md border border-input bg-background p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="collab-address" className="text-xs">
              Wallet Address
            </Label>
            <Input
              id="collab-address"
              placeholder="0x..."
              value={newCollaborator.address}
              onChange={(e) => handleAddressChange(e.target.value)}
              className="font-mono text-xs"
            />
            {errors.address && (
              <p className="text-xs text-red-500">{errors.address}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="collab-percentage" className="text-xs">
              Revenue Share (%)
            </Label>
            <div className="relative">
              <Input
                id="collab-percentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="50.00"
                value={newCollaborator.percentage || ""}
                onChange={(e) => handlePercentageChange(e.target.value)}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                %
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter a percentage between 0.01 and 100.00
            </p>
            {errors.percentage && (
              <p className="text-xs text-red-500">{errors.percentage}</p>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddCollaborator}
          disabled={
            !newCollaborator.address ||
            !newCollaborator.percentage ||
            totalPercentage + newCollaborator.percentage > 100
          }
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Collaborator
        </Button>
      </div>

      {/* Validation Warning */}
      {collaborators.length > 0 && totalPercentage !== 100 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Total percentage must equal exactly 100%. Current: {totalPercentage.toFixed(2)}%
            {totalPercentage < 100 && (
              <span className="block mt-1">
                Add {((100 - totalPercentage).toFixed(2))}% more to reach 100%
              </span>
            )}
            {totalPercentage > 100 && (
              <span className="block mt-1">
                Reduce by {((totalPercentage - 100).toFixed(2))}% to reach 100%
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

