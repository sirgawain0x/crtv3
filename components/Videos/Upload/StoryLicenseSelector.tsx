"use client";

import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { PIL_TEMPLATES, type StoryLicenseTerms } from "@/lib/types/story-protocol";

interface StoryLicenseSelectorProps {
  enabled: boolean;
  selectedLicense: StoryLicenseTerms | null;
  onEnabledChange: (enabled: boolean) => void;
  onLicenseChange: (license: StoryLicenseTerms | null) => void;
}

export function StoryLicenseSelector({
  enabled,
  selectedLicense,
  onEnabledChange,
  onLicenseChange,
}: StoryLicenseSelectorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    selectedLicense?.templateId || ""
  );

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = PIL_TEMPLATES.find((t) => t.id === templateId);
    
    if (template) {
      const licenseTerms: StoryLicenseTerms = {
        templateId: template.id,
        commercialUse: template.terms.commercialUse ?? false,
        derivativesAllowed: template.terms.derivativesAllowed ?? false,
        derivativesAttribution: template.terms.derivativesAttribution ?? false,
        derivativesApproval: template.terms.derivativesApproval ?? false,
        derivativesReciprocal: template.terms.derivativesReciprocal ?? false,
        distributionMethod: template.terms.distributionMethod,
        revenueShare: template.terms.revenueShare,
      };
      onLicenseChange(licenseTerms);
    } else {
      onLicenseChange(null);
    }
  };

  const selectedTemplate = PIL_TEMPLATES.find((t) => t.id === selectedTemplateId);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">Story Protocol IP Registration</CardTitle>
            <CardDescription>
              Register your video as an IP Asset on Story Protocol with licensing terms
            </CardDescription>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onEnabledChange}
            aria-label="Enable Story Protocol IP registration"
          />
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4">
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              Registering your video on Story Protocol requires an NFT to be minted first. If your
              video doesn't have an NFT yet, IP registration will be skipped. You can mint an NFT
              for your video and then register it on Story Protocol later.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="license-template">License Template</Label>
            <Select
              value={selectedTemplateId}
              onValueChange={handleTemplateChange}
              disabled={!enabled}
            >
              <SelectTrigger id="license-template">
                <SelectValue placeholder="Select a license template" />
              </SelectTrigger>
              <SelectContent>
                {PIL_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedTemplate && (
              <div className="mt-2 p-3 bg-muted rounded-md">
                <p className="text-sm font-medium mb-1">{selectedTemplate.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedTemplate.description}
                </p>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {selectedTemplate.terms.commercialUse && (
                    <div>✓ Commercial use allowed</div>
                  )}
                  {selectedTemplate.terms.derivativesAllowed && (
                    <div>
                      ✓ Derivatives allowed
                      {selectedTemplate.terms.derivativesAttribution && " (with attribution)"}
                      {selectedTemplate.terms.derivativesApproval && " (approval required)"}
                      {selectedTemplate.terms.derivativesReciprocal && " (reciprocal license)"}
                    </div>
                  )}
                  {!selectedTemplate.terms.derivativesAllowed && (
                    <div>✗ No derivatives allowed</div>
                  )}
                  {!selectedTemplate.terms.commercialUse && (
                    <div>✗ No commercial use</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

