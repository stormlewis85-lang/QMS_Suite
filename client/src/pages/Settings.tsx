import { Settings as SettingsIcon, Building2, Scale, User, Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState("ACME Automotive");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="heading-settings">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your application preferences and configuration
          </p>
        </div>
        <Button onClick={handleSave} data-testid="button-save-settings">
          Save Changes
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Company Information</CardTitle>
            </div>
            <CardDescription>
              Configure your organization details for PFMEA documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
                data-testid="input-company-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-location">Location</Label>
              <Input
                id="company-location"
                placeholder="City, State, Country"
                data-testid="input-company-location"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iatf-cert">IATF 16949 Certificate Number</Label>
              <Input
                id="iatf-cert"
                placeholder="Enter certificate number"
                data-testid="input-iatf-cert"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Rating Scale Configuration</CardTitle>
            </div>
            <CardDescription>
              AIAG-VDA 2019 rating scales for Severity, Occurrence, and Detection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                <div>
                  <p className="text-sm font-medium">Use AIAG-VDA 2019 Standard</p>
                  <p className="text-xs text-muted-foreground">
                    Standard 1-10 rating scale for automotive FMEA
                  </p>
                </div>
                <Switch checked={true} disabled data-testid="switch-aiag-vda" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                <div>
                  <p className="text-sm font-medium">AP Threshold - High Risk</p>
                  <p className="text-xs text-muted-foreground">
                    Action Priority ≥ 100 requires immediate action
                  </p>
                </div>
                <Input
                  type="number"
                  defaultValue={100}
                  className="w-20"
                  data-testid="input-ap-threshold-high"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                <div>
                  <p className="text-sm font-medium">AP Threshold - Medium Risk</p>
                  <p className="text-xs text-muted-foreground">
                    Action Priority 50-99 requires action planning
                  </p>
                </div>
                <Input
                  type="number"
                  defaultValue={50}
                  className="w-20"
                  data-testid="input-ap-threshold-medium"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure how you receive updates about PFMEA changes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Enable Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Receive alerts for high-risk failure modes
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
                data-testid="switch-notifications"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Send daily digest of PFMEA updates
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
                data-testid="switch-email-notifications"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle>User Preferences</CardTitle>
            </div>
            <CardDescription>
              Customize your PFMEA application experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default-view">Default Dashboard View</Label>
              <select
                id="default-view"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                data-testid="select-default-view"
              >
                <option value="dashboard">Dashboard</option>
                <option value="parts">Parts</option>
                <option value="pfmea">PFMEA</option>
                <option value="control-plans">Control Plans</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-save">Auto-save Changes</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically save PFMEA edits
                </p>
              </div>
              <Switch id="auto-save" defaultChecked data-testid="switch-auto-save" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
