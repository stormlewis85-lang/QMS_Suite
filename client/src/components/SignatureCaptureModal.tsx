import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SignatureCaptureModalProps {
  open: boolean;
  meaning: string;
  onSign: (data: { password: string }) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export default function SignatureCaptureModal({
  open,
  meaning,
  onSign,
  onCancel,
  isPending = false,
}: SignatureCaptureModalProps) {
  const [password, setPassword] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  const handleSign = () => {
    if (!password || !acknowledged) return;
    onSign({ password });
    setPassword("");
    setAcknowledged(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPassword("");
      setAcknowledged(false);
      onCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Electronic Signature
          </DialogTitle>
          <DialogDescription>
            21 CFR Part 11 compliant electronic signature. Your signature is
            legally binding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meaning statement */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Meaning Statement
            </p>
            <p className="text-sm font-medium">{meaning}</p>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label htmlFor="sig-password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="sig-password"
              type="password"
              placeholder="Enter your password to sign"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && password && acknowledged) {
                  handleSign();
                }
              }}
            />
          </div>

          {/* Acknowledgment */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="sig-acknowledge"
              checked={acknowledged}
              onCheckedChange={(checked) =>
                setAcknowledged(checked === true)
              }
            />
            <label
              htmlFor="sig-acknowledge"
              className="text-xs leading-relaxed cursor-pointer"
            >
              I understand that this electronic signature is legally binding and
              equivalent to a handwritten signature. This action cannot be
              repudiated.
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSign}
            disabled={!password || !acknowledged || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing...
              </>
            ) : (
              "Sign & Approve"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
