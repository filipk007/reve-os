"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link2, Copy, Trash2 } from "lucide-react";
import { createShareLink, revokeShareLink } from "@/lib/api";
import { toast } from "sonner";

interface ShareDialogProps {
  slug: string;
  shareToken: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export function ShareDialog({ slug, shareToken, open, onOpenChange, onChanged }: ShareDialogProps) {
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await createShareLink(slug);
      setShareUrl(result.url);
      toast.success("Share link generated");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate link");
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      await revokeShareLink(slug);
      setShareUrl(null);
      toast.success("Share link revoked");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to revoke link");
    } finally {
      setRevoking(false);
    }
  };

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    }
  };

  const hasToken = shareToken || shareUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-clay-800 border-clay-600 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-clay-100">Share Client Portal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {hasToken ? (
            <>
              <p className="text-sm text-clay-300">
                Anyone with this link can view the portal (read-only). No login required.
              </p>
              {shareUrl && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-clay-900 border border-clay-600 rounded-md px-3 py-2 text-xs text-clay-300 font-mono"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                    className="border-clay-600 text-clay-200 gap-1.5"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
              )}
              {!shareUrl && shareToken && (
                <p className="text-xs text-clay-300">
                  A share link is active. Generate a new one to see the URL.
                </p>
              )}
              <div className="flex justify-between pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRevoke}
                  disabled={revoking}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {revoking ? "Revoking..." : "Revoke Link"}
                </Button>
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="bg-kiln-teal text-clay-900 hover:bg-kiln-teal/90 gap-1.5"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  {generating ? "Generating..." : "New Link"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-clay-300">
                Generate a share link so your client can view their portal without logging in.
                The link provides read-only access to SOPs, updates, and action items.
              </p>
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="bg-kiln-teal text-clay-900 hover:bg-kiln-teal/90 gap-1.5"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  {generating ? "Generating..." : "Generate Share Link"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
