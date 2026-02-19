import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import {
  ArrowLeft, Loader2, Play, Pause, CheckCircle2, ShieldCheck,
  Users, Paperclip, Clock, AlertTriangle, Plus, Trash2, Edit2, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// ─── Constants ───

const priorityColors: Record<string, string> = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-black",
  low: "bg-green-500 text-white",
};

const disciplines = ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"] as const;

const disciplineLabels: Record<string, string> = {
  D0: "Emergency Response",
  D1: "Team Formation",
  D2: "Problem Description",
  D3: "Containment",
  D4: "Root Cause Analysis",
  D5: "Corrective Actions",
  D6: "Validation",
  D7: "Prevention",
  D8: "Closure",
};

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

function formatDateTime(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

function parseJson(val: any, fallback: any = []) {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

// ─── 8D Progress Timeline ───

function ProgressTimeline({ currentDiscipline, capa }: { currentDiscipline: string; capa: any }) {
  const currentIdx = disciplines.indexOf(currentDiscipline as any);
  return (
    <div className="flex items-center gap-1 py-2">
      {disciplines.map((d, i) => {
        const completedKey = `${d.toLowerCase().replace("d", "d")}CompletedAt`;
        // Check if the discipline key pattern matches - D0 -> d0CompletedAt style check
        const isCompleted = i < currentIdx || capa?.status === "closed";
        const isCurrent = d === currentDiscipline;
        return (
          <div key={d} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  isCompleted
                    ? "bg-green-500 border-green-500 text-white"
                    : isCurrent
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-muted border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : d}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1">{d}</span>
            </div>
            {i < disciplines.length - 1 && (
              <div className={`w-4 h-0.5 mx-0.5 ${i < currentIdx ? "bg-green-500" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Team Panel ───

function TeamPanel({ capaId }: { capaId: number }) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [newMember, setNewMember] = useState({ userName: "", role: "member", userId: "", userEmail: "" });

  const { data: members, isLoading } = useQuery<any[]>({
    queryKey: ["/api/capas", capaId, "team"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/capas/${capaId}/team`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "team"] });
      toast({ title: "Team member added" });
      setAddOpen(false);
      setNewMember({ userName: "", role: "member", userId: "", userEmail: "" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: number) => {
      await apiRequest("DELETE", `/api/capas/${capaId}/team/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "team"] });
      toast({ title: "Team member removed" });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Team Members</CardTitle>
          <CardDescription>{(members || []).length} members</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (members || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No team members assigned.</p>
        ) : (
          <div className="space-y-2">
            {(members || []).map((m: any) => (
              <div key={m.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                    {(m.userName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-medium">{m.userName}</span>
                    {m.isChampion === 1 && <Badge className="ml-1 text-[10px]" variant="default">Champion</Badge>}
                    {m.isLeader === 1 && <Badge className="ml-1 text-[10px]" variant="secondary">Leader</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{m.role}</Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => removeMutation.mutate(m.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={newMember.userName}
                onChange={(e) => setNewMember({ ...newMember, userName: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label>User ID</Label>
              <Input
                value={newMember.userId}
                onChange={(e) => setNewMember({ ...newMember, userId: e.target.value })}
                placeholder="User identifier"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={newMember.role} onValueChange={(v) => setNewMember({ ...newMember, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="champion">Champion</SelectItem>
                  <SelectItem value="leader">Leader</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="subject_matter_expert">SME</SelectItem>
                  <SelectItem value="sponsor">Sponsor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addMutation.mutate(newMember)}
              disabled={!newMember.userName || !newMember.userId}
            >
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─── D0: Emergency Response ───

function D0Tab({ capaId }: { capaId: number }) {
  const { toast } = useToast();
  const { data: d0, isLoading } = useQuery<any>({
    queryKey: ["/api/capas", capaId, "d0"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/capas/${capaId}/d0`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "d0"] });
      toast({ title: "D0 saved" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/capas/${capaId}/d0/complete`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "d0"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId] });
      toast({ title: "D0 completed" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const [form, setForm] = useState<any>(null);

  // Initialize form when data loads
  if (d0 && !form) {
    setForm({
      emergencyResponseRequired: d0.emergencyResponseRequired || 0,
      responseType: d0.responseType || "",
      threatLevel: d0.threatLevel || "none",
      safetyImpact: d0.safetyImpact || 0,
      safetyDescription: d0.safetyDescription || "",
      regulatoryImpact: d0.regulatoryImpact || 0,
      regulatoryBody: d0.regulatoryBody || "",
      customerNotificationRequired: d0.customerNotificationRequired || 0,
      stopShipmentIssued: d0.stopShipmentIssued || 0,
      stopShipmentScope: d0.stopShipmentScope || "",
      symptomsDescription: d0.symptomsDescription || "",
      quantityAtRisk: d0.quantityAtRisk || 0,
      quantityContained: d0.quantityContained || 0,
      d0Notes: d0.d0Notes || "",
    });
  }

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-8" />;

  if (!form) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">D0 Emergency Response has not been started.</p>
        <Button onClick={() => setForm({
          emergencyResponseRequired: 0, responseType: "", threatLevel: "none",
          safetyImpact: 0, safetyDescription: "", regulatoryImpact: 0, regulatoryBody: "",
          customerNotificationRequired: 0, stopShipmentIssued: 0, stopShipmentScope: "",
          symptomsDescription: "", quantityAtRisk: 0, quantityContained: 0, d0Notes: "",
        })}>
          Start D0
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Emergency Assessment */}
      <Card>
        <CardHeader><CardTitle className="text-base">Emergency Assessment</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label>Emergency Response Required?</Label>
            <Switch
              checked={form.emergencyResponseRequired === 1}
              onCheckedChange={(v) => setForm({ ...form, emergencyResponseRequired: v ? 1 : 0 })}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Threat Level</Label>
              <Select value={form.threatLevel} onValueChange={(v) => setForm({ ...form, threatLevel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <Label>Safety Impact?</Label>
              <Switch
                checked={form.safetyImpact === 1}
                onCheckedChange={(v) => setForm({ ...form, safetyImpact: v ? 1 : 0 })}
              />
            </div>
            <div className="flex items-center gap-4">
              <Label>Regulatory Impact?</Label>
              <Switch
                checked={form.regulatoryImpact === 1}
                onCheckedChange={(v) => setForm({ ...form, regulatoryImpact: v ? 1 : 0 })}
              />
            </div>
          </div>
          {form.safetyImpact === 1 && (
            <div>
              <Label>Safety Description</Label>
              <Textarea
                value={form.safetyDescription}
                onChange={(e) => setForm({ ...form, safetyDescription: e.target.value })}
                rows={2}
              />
            </div>
          )}
          {form.regulatoryImpact === 1 && (
            <div>
              <Label>Regulatory Body</Label>
              <Input
                value={form.regulatoryBody}
                onChange={(e) => setForm({ ...form, regulatoryBody: e.target.value })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer & Stop Shipment */}
      <Card>
        <CardHeader><CardTitle className="text-base">Customer & Shipment</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-4">
              <Label>Customer Notification Required?</Label>
              <Switch
                checked={form.customerNotificationRequired === 1}
                onCheckedChange={(v) => setForm({ ...form, customerNotificationRequired: v ? 1 : 0 })}
              />
            </div>
            <div className="flex items-center gap-4">
              <Label>Stop Shipment Issued?</Label>
              <Switch
                checked={form.stopShipmentIssued === 1}
                onCheckedChange={(v) => setForm({ ...form, stopShipmentIssued: v ? 1 : 0 })}
              />
            </div>
          </div>
          {form.stopShipmentIssued === 1 && (
            <div>
              <Label>Stop Shipment Scope</Label>
              <Textarea
                value={form.stopShipmentScope}
                onChange={(e) => setForm({ ...form, stopShipmentScope: e.target.value })}
                rows={2}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Symptoms & Quantities */}
      <Card>
        <CardHeader><CardTitle className="text-base">Symptoms & Quantities</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Symptoms Description</Label>
            <Textarea
              value={form.symptomsDescription}
              onChange={(e) => setForm({ ...form, symptomsDescription: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Quantity at Risk</Label>
              <Input
                type="number"
                value={form.quantityAtRisk}
                onChange={(e) => setForm({ ...form, quantityAtRisk: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Quantity Contained</Label>
              <Input
                type="number"
                value={form.quantityContained}
                onChange={(e) => setForm({ ...form, quantityContained: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.d0Notes}
              onChange={(e) => setForm({ ...form, d0Notes: e.target.value })}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          {d0?.d0CompletedAt && `Completed: ${formatDateTime(d0.d0CompletedAt)}`}
          {d0?.d0VerifiedAt && ` | Verified: ${formatDateTime(d0.d0VerifiedAt)}`}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1" /> Save D0
          </Button>
          {!d0?.d0CompletedAt && (
            <Button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Complete D0
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── D1: Team Formation ───

function D1Tab({ capaId }: { capaId: number }) {
  const { toast } = useToast();
  const { data: d1, isLoading } = useQuery<any>({ queryKey: ["/api/capas", capaId, "d1"] });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/capas/${capaId}/d1`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "d1"] });
      toast({ title: "D1 saved" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/capas/${capaId}/d1/complete`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "d1"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId] });
      toast({ title: "D1 completed" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const [form, setForm] = useState<any>(null);

  if (d1 && !form) {
    setForm({
      teamObjective: d1.teamObjective || "",
      teamScope: d1.teamScope || "",
      teamBoundaries: d1.teamBoundaries || "",
      teamCharterDefined: d1.teamCharterDefined || 0,
      teamCharterDocument: d1.teamCharterDocument || "",
      teamFormationMethod: d1.teamFormationMethod || "",
      d1Notes: d1.d1Notes || "",
    });
  }

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-8" />;

  if (!form) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">D1 Team Formation has not been started.</p>
        <Button onClick={() => setForm({
          teamObjective: "", teamScope: "", teamBoundaries: "", teamCharterDefined: 0,
          teamCharterDocument: "", teamFormationMethod: "", d1Notes: "",
        })}>
          Start D1
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Team Setup</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Formation Method</Label>
              <Input value={form.teamFormationMethod} onChange={(e) => setForm({ ...form, teamFormationMethod: e.target.value })} placeholder="e.g., Cross-functional selection" />
            </div>
            <div className="flex items-center gap-4">
              <Label>Charter Defined?</Label>
              <Switch checked={form.teamCharterDefined === 1} onCheckedChange={(v) => setForm({ ...form, teamCharterDefined: v ? 1 : 0 })} />
            </div>
          </div>
          {form.teamCharterDefined === 1 && (
            <div>
              <Label>Charter Document Reference</Label>
              <Input value={form.teamCharterDocument} onChange={(e) => setForm({ ...form, teamCharterDocument: e.target.value })} />
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Objectives & Scope</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Team Objective</Label>
            <Textarea value={form.teamObjective} onChange={(e) => setForm({ ...form, teamObjective: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Scope</Label>
            <Textarea value={form.teamScope} onChange={(e) => setForm({ ...form, teamScope: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Boundaries</Label>
            <Textarea value={form.teamBoundaries} onChange={(e) => setForm({ ...form, teamBoundaries: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.d1Notes} onChange={(e) => setForm({ ...form, d1Notes: e.target.value })} rows={2} />
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          {d1?.d1CompletedAt && `Completed: ${formatDateTime(d1.d1CompletedAt)}`}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1" /> Save D1
          </Button>
          {!d1?.d1CompletedAt && (
            <Button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Complete D1
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── D2: Problem Description ───

function D2Tab({ capaId }: { capaId: number }) {
  const { toast } = useToast();
  const { data: d2, isLoading } = useQuery<any>({ queryKey: ["/api/capas", capaId, "d2"] });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/capas/${capaId}/d2`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "d2"] });
      toast({ title: "D2 saved" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/capas/${capaId}/d2/complete`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "d2"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId] });
      toast({ title: "D2 completed" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const [form, setForm] = useState<any>(null);

  if (d2 && !form) {
    setForm({
      problemStatement: d2.problemStatement || "",
      objectDescription: d2.objectDescription || "",
      defectDescription: d2.defectDescription || "",
      whereGeographic: d2.whereGeographic || "",
      whereOnObject: d2.whereOnObject || "",
      whenFirstObserved: d2.whenFirstObserved ? new Date(d2.whenFirstObserved).toISOString().split("T")[0] : "",
      whenPattern: d2.whenPattern || "",
      whenLifecycle: d2.whenLifecycle || "",
      howManyUnits: d2.howManyUnits || 0,
      howManyDefects: d2.howManyDefects || 0,
      howManyTrend: d2.howManyTrend || "",
      problemExtent: d2.problemExtent || "",
      problemImpact: d2.problemImpact || "",
      d2Notes: d2.d2Notes || "",
    });
  }

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-8" />;

  if (!form) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">D2 Problem Description has not been started.</p>
        <Button onClick={() => setForm({
          problemStatement: "", objectDescription: "", defectDescription: "",
          whereGeographic: "", whereOnObject: "", whenFirstObserved: "", whenPattern: "",
          whenLifecycle: "", howManyUnits: 0, howManyDefects: 0, howManyTrend: "",
          problemExtent: "", problemImpact: "", d2Notes: "",
        })}>
          Start D2
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Problem Statement</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            value={form.problemStatement}
            onChange={(e) => setForm({ ...form, problemStatement: e.target.value })}
            rows={3}
            placeholder="Clear, concise problem statement..."
            className="text-base"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">What</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Object Description</Label>
            <Input value={form.objectDescription} onChange={(e) => setForm({ ...form, objectDescription: e.target.value })} placeholder="What object/product is affected?" />
          </div>
          <div>
            <Label>Defect Description</Label>
            <Input value={form.defectDescription} onChange={(e) => setForm({ ...form, defectDescription: e.target.value })} placeholder="What is the defect?" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Where</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Geographic Location</Label>
              <Input value={form.whereGeographic} onChange={(e) => setForm({ ...form, whereGeographic: e.target.value })} />
            </div>
            <div>
              <Label>On Object Location</Label>
              <Input value={form.whereOnObject} onChange={(e) => setForm({ ...form, whereOnObject: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">When</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>First Observed</Label>
              <Input type="date" value={form.whenFirstObserved} onChange={(e) => setForm({ ...form, whenFirstObserved: e.target.value })} />
            </div>
            <div>
              <Label>Pattern</Label>
              <Input value={form.whenPattern} onChange={(e) => setForm({ ...form, whenPattern: e.target.value })} placeholder="Continuous, intermittent..." />
            </div>
            <div>
              <Label>Lifecycle Phase</Label>
              <Input value={form.whenLifecycle} onChange={(e) => setForm({ ...form, whenLifecycle: e.target.value })} placeholder="Production, assembly..." />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">How Many</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Units Affected</Label>
              <Input type="number" value={form.howManyUnits} onChange={(e) => setForm({ ...form, howManyUnits: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Defects per Unit</Label>
              <Input type="number" value={form.howManyDefects} onChange={(e) => setForm({ ...form, howManyDefects: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Trend</Label>
              <Input value={form.howManyTrend} onChange={(e) => setForm({ ...form, howManyTrend: e.target.value })} placeholder="Increasing, stable..." />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Impact</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Problem Extent</Label>
              <Textarea value={form.problemExtent} onChange={(e) => setForm({ ...form, problemExtent: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Problem Impact</Label>
              <Textarea value={form.problemImpact} onChange={(e) => setForm({ ...form, problemImpact: e.target.value })} rows={2} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.d2Notes} onChange={(e) => setForm({ ...form, d2Notes: e.target.value })} rows={2} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          {d2?.d2CompletedAt && `Completed: ${formatDateTime(d2.d2CompletedAt)}`}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1" /> Save D2
          </Button>
          {!d2?.d2CompletedAt && (
            <Button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Complete D2
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── D3: Containment ───

function D3Tab({ capaId }: { capaId: number }) {
  const { toast } = useToast();
  const { data: d3, isLoading } = useQuery<any>({ queryKey: ["/api/capas", capaId, "d3"] });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/capas/${capaId}/d3`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "d3"] });
      toast({ title: "D3 saved" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/capas/${capaId}/d3/complete`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "d3"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId] });
      toast({ title: "D3 completed" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const [form, setForm] = useState<any>(null);

  if (d3 && !form) {
    setForm({
      containmentRequired: d3.containmentRequired ?? 1,
      containmentNotRequiredReason: d3.containmentNotRequiredReason || "",
      containmentStrategy: d3.containmentStrategy || "",
      verificationMethod: d3.verificationMethod || "",
      verificationFrequency: d3.verificationFrequency || "",
      containmentEffective: d3.containmentEffective || 0,
      containmentEffectiveEvidence: d3.containmentEffectiveEvidence || "",
      quantityInspected: d3.quantityInspected || 0,
      quantityPassed: d3.quantityPassed || 0,
      quantityFailed: d3.quantityFailed || 0,
      quantityReworked: d3.quantityReworked || 0,
      quantityScrapped: d3.quantityScrapped || 0,
      costOfContainment: d3.costOfContainment || 0,
      sortingInstructions: d3.sortingInstructions || "",
      d3Notes: d3.d3Notes || "",
    });
  }

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-8" />;

  if (!form) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">D3 Containment has not been started.</p>
        <Button onClick={() => setForm({
          containmentRequired: 1, containmentNotRequiredReason: "", containmentStrategy: "",
          verificationMethod: "", verificationFrequency: "", containmentEffective: 0,
          containmentEffectiveEvidence: "", quantityInspected: 0, quantityPassed: 0,
          quantityFailed: 0, quantityReworked: 0, quantityScrapped: 0, costOfContainment: 0,
          sortingInstructions: "", d3Notes: "",
        })}>
          Start D3
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Containment Strategy</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label>Containment Required?</Label>
            <Switch
              checked={form.containmentRequired === 1}
              onCheckedChange={(v) => setForm({ ...form, containmentRequired: v ? 1 : 0 })}
            />
          </div>
          {form.containmentRequired === 0 && (
            <div>
              <Label>Reason Not Required</Label>
              <Textarea value={form.containmentNotRequiredReason} onChange={(e) => setForm({ ...form, containmentNotRequiredReason: e.target.value })} rows={2} />
            </div>
          )}
          {form.containmentRequired === 1 && (
            <>
              <div>
                <Label>Strategy</Label>
                <Textarea value={form.containmentStrategy} onChange={(e) => setForm({ ...form, containmentStrategy: e.target.value })} rows={3} />
              </div>
              <div>
                <Label>Sorting Instructions</Label>
                <Textarea value={form.sortingInstructions} onChange={(e) => setForm({ ...form, sortingInstructions: e.target.value })} rows={2} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {form.containmentRequired === 1 && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Sort Results</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                <div>
                  <Label>Inspected</Label>
                  <Input type="number" value={form.quantityInspected} onChange={(e) => setForm({ ...form, quantityInspected: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Passed</Label>
                  <Input type="number" value={form.quantityPassed} onChange={(e) => setForm({ ...form, quantityPassed: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Failed</Label>
                  <Input type="number" value={form.quantityFailed} onChange={(e) => setForm({ ...form, quantityFailed: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Reworked</Label>
                  <Input type="number" value={form.quantityReworked} onChange={(e) => setForm({ ...form, quantityReworked: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Scrapped</Label>
                  <Input type="number" value={form.quantityScrapped} onChange={(e) => setForm({ ...form, quantityScrapped: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Verification & Effectiveness</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Verification Method</Label>
                  <Input value={form.verificationMethod} onChange={(e) => setForm({ ...form, verificationMethod: e.target.value })} />
                </div>
                <div>
                  <Label>Verification Frequency</Label>
                  <Input value={form.verificationFrequency} onChange={(e) => setForm({ ...form, verificationFrequency: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Label>Containment Effective?</Label>
                <Switch checked={form.containmentEffective === 1} onCheckedChange={(v) => setForm({ ...form, containmentEffective: v ? 1 : 0 })} />
              </div>
              {form.containmentEffective === 1 && (
                <div>
                  <Label>Effectiveness Evidence</Label>
                  <Textarea value={form.containmentEffectiveEvidence} onChange={(e) => setForm({ ...form, containmentEffectiveEvidence: e.target.value })} rows={2} />
                </div>
              )}
              <div>
                <Label>Cost of Containment ($)</Label>
                <Input type="number" step="0.01" value={form.costOfContainment} onChange={(e) => setForm({ ...form, costOfContainment: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.d3Notes} onChange={(e) => setForm({ ...form, d3Notes: e.target.value })} rows={2} />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          {d3?.d3CompletedAt && `Completed: ${formatDateTime(d3.d3CompletedAt)}`}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1" /> Save D3
          </Button>
          {!d3?.d3CompletedAt && (
            <Button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Complete D3
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── D4: Root Cause ───

function D4Tab({ capaId }: { capaId: number }) {
  const { toast } = useToast();
  const { data: d4, isLoading } = useQuery<any>({ queryKey: ["/api/capas", capaId, "d4"] });
  const { data: candidates } = useQuery<any[]>({ queryKey: ["/api/capas", capaId, "d4", "candidates"] });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/capas/${capaId}/d4`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "d4"] });
      toast({ title: "D4 saved" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/capas/${capaId}/d4/complete`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "d4"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId] });
      toast({ title: "D4 completed" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const addCandidateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/capas/${capaId}/d4/candidates`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "d4", "candidates"] });
      toast({ title: "Candidate added" });
      setAddCandidateOpen(false);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const [form, setForm] = useState<any>(null);
  const [addCandidateOpen, setAddCandidateOpen] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    causeType: "occurrence",
    category: "",
    description: "",
    likelihood: "medium",
  });

  if (d4 && !form) {
    setForm({
      rootCauseOccurrence: d4.rootCauseOccurrence || "",
      rootCauseOccurrenceEvidence: d4.rootCauseOccurrenceEvidence || "",
      rootCauseEscape: d4.rootCauseEscape || "",
      rootCauseEscapeEvidence: d4.rootCauseEscapeEvidence || "",
      escapePoint: d4.escapePoint || "",
      escapePointAnalysis: d4.escapePointAnalysis || "",
      rootCauseSummary: d4.rootCauseSummary || "",
      confidenceLevel: d4.confidenceLevel || "",
      d4Notes: d4.d4Notes || "",
    });
  }

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-8" />;

  if (!form) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">D4 Root Cause Analysis has not been started.</p>
        <Button onClick={() => setForm({
          rootCauseOccurrence: "", rootCauseOccurrenceEvidence: "", rootCauseEscape: "",
          rootCauseEscapeEvidence: "", escapePoint: "", escapePointAnalysis: "",
          rootCauseSummary: "", confidenceLevel: "", d4Notes: "",
        })}>
          Start D4
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Root Cause Candidates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Root Cause Candidates</CardTitle>
            <CardDescription>Potential root causes identified during analysis</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAddCandidateOpen(true)}>
            <Plus className="h-3 w-3 mr-1" /> Add Candidate
          </Button>
        </CardHeader>
        <CardContent>
          {(candidates || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No candidates added yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Likelihood</TableHead>
                  <TableHead>Root Cause?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(candidates || []).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.description}</TableCell>
                    <TableCell><Badge variant="outline">{c.causeType}</Badge></TableCell>
                    <TableCell>{c.category || "—"}</TableCell>
                    <TableCell>
                      <Badge className={
                        c.likelihood === "high" ? "bg-red-100 text-red-700" :
                        c.likelihood === "medium" ? "bg-yellow-100 text-yellow-700" :
                        "bg-green-100 text-green-700"
                      }>
                        {c.likelihood}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.isRootCause === 1 ? (
                        <Badge className="bg-green-500 text-white">Confirmed</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Root Cause Summary */}
      <Card>
        <CardHeader><CardTitle className="text-base">Root Cause Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Occurrence Root Cause</Label>
            <Textarea value={form.rootCauseOccurrence} onChange={(e) => setForm({ ...form, rootCauseOccurrence: e.target.value })} rows={2} placeholder="Why did the defect occur?" />
          </div>
          <div>
            <Label>Occurrence Evidence</Label>
            <Textarea value={form.rootCauseOccurrenceEvidence} onChange={(e) => setForm({ ...form, rootCauseOccurrenceEvidence: e.target.value })} rows={2} />
          </div>
          <Separator />
          <div>
            <Label>Escape Root Cause</Label>
            <Textarea value={form.rootCauseEscape} onChange={(e) => setForm({ ...form, rootCauseEscape: e.target.value })} rows={2} placeholder="Why was the defect not detected?" />
          </div>
          <div>
            <Label>Escape Evidence</Label>
            <Textarea value={form.rootCauseEscapeEvidence} onChange={(e) => setForm({ ...form, rootCauseEscapeEvidence: e.target.value })} rows={2} />
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Escape Point</Label>
              <Input value={form.escapePoint} onChange={(e) => setForm({ ...form, escapePoint: e.target.value })} placeholder="Where should defect have been caught?" />
            </div>
            <div>
              <Label>Confidence Level</Label>
              <Select value={form.confidenceLevel} onValueChange={(v) => setForm({ ...form, confidenceLevel: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Overall Summary</Label>
            <Textarea value={form.rootCauseSummary} onChange={(e) => setForm({ ...form, rootCauseSummary: e.target.value })} rows={3} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.d4Notes} onChange={(e) => setForm({ ...form, d4Notes: e.target.value })} rows={2} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          {d4?.d4CompletedAt && `Completed: ${formatDateTime(d4.d4CompletedAt)}`}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1" /> Save D4
          </Button>
          {!d4?.d4CompletedAt && (
            <Button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Complete D4
            </Button>
          )}
        </div>
      </div>

      {/* Add Candidate Dialog */}
      <Dialog open={addCandidateOpen} onOpenChange={setAddCandidateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Root Cause Candidate</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Description</Label>
              <Textarea
                value={newCandidate.description}
                onChange={(e) => setNewCandidate({ ...newCandidate, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid gap-3 grid-cols-3">
              <div>
                <Label>Type</Label>
                <Select value={newCandidate.causeType} onValueChange={(v) => setNewCandidate({ ...newCandidate, causeType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="occurrence">Occurrence</SelectItem>
                    <SelectItem value="escape">Escape</SelectItem>
                    <SelectItem value="systemic">Systemic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={newCandidate.category} onValueChange={(v) => setNewCandidate({ ...newCandidate, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="man">Man</SelectItem>
                    <SelectItem value="machine">Machine</SelectItem>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="method">Method</SelectItem>
                    <SelectItem value="measurement">Measurement</SelectItem>
                    <SelectItem value="environment">Environment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Likelihood</Label>
                <Select value={newCandidate.likelihood} onValueChange={(v) => setNewCandidate({ ...newCandidate, likelihood: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCandidateOpen(false)}>Cancel</Button>
            <Button onClick={() => addCandidateMutation.mutate(newCandidate)} disabled={!newCandidate.description}>
              Add Candidate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── D5: Corrective Actions ───

function D5Tab({ capaId }: { capaId: number }) {
  const { toast } = useToast();
  const { data: d5, isLoading } = useQuery<any>({ queryKey: ["/api/capas", capaId, "d5"] });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/capas/${capaId}/d5`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "d5"] });
      toast({ title: "D5 saved" });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Error", description: error.message }),
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/capas/${capaId}/d5/complete`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "d5"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId] });
      toast({ title: "D5 completed" });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Error", description: error.message }),
  });

  const [form, setForm] = useState<any>(null);

  if (d5 && !form) {
    setForm({
      occurrenceActionSummary: d5.occurrenceActionSummary || "",
      escapeActionSummary: d5.escapeActionSummary || "",
      contingencyPlan: d5.contingencyPlan || "",
      pfmeaUpdatesRequired: d5.pfmeaUpdatesRequired || 0,
      pfmeaUpdatePlan: d5.pfmeaUpdatePlan || "",
      controlPlanUpdatesRequired: d5.controlPlanUpdatesRequired || 0,
      controlPlanUpdatePlan: d5.controlPlanUpdatePlan || "",
      trainingRequired: d5.trainingRequired || 0,
      estimatedCost: d5.estimatedCost || 0,
      estimatedSavings: d5.estimatedSavings || 0,
      estimatedPaybackMonths: d5.estimatedPaybackMonths || 0,
      d5Notes: d5.d5Notes || "",
    });
  }

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-8" />;

  if (!form) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">D5 Corrective Actions has not been started.</p>
        <Button onClick={() => setForm({
          occurrenceActionSummary: "", escapeActionSummary: "", contingencyPlan: "",
          pfmeaUpdatesRequired: 0, pfmeaUpdatePlan: "", controlPlanUpdatesRequired: 0,
          controlPlanUpdatePlan: "", trainingRequired: 0, estimatedCost: 0,
          estimatedSavings: 0, estimatedPaybackMonths: 0, d5Notes: "",
        })}>Start D5</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Corrective Actions Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Occurrence Action Summary</Label>
            <Textarea value={form.occurrenceActionSummary} onChange={(e) => setForm({ ...form, occurrenceActionSummary: e.target.value })} rows={3} placeholder="Actions addressing why the defect occurred..." />
          </div>
          <div>
            <Label>Escape Action Summary</Label>
            <Textarea value={form.escapeActionSummary} onChange={(e) => setForm({ ...form, escapeActionSummary: e.target.value })} rows={3} placeholder="Actions addressing why the defect was not detected..." />
          </div>
          <div>
            <Label>Contingency Plan</Label>
            <Textarea value={form.contingencyPlan} onChange={(e) => setForm({ ...form, contingencyPlan: e.target.value })} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Document & Training Updates</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <Label>PFMEA Updates Required?</Label>
                <Switch checked={form.pfmeaUpdatesRequired === 1} onCheckedChange={(v) => setForm({ ...form, pfmeaUpdatesRequired: v ? 1 : 0 })} />
              </div>
              {form.pfmeaUpdatesRequired === 1 && (
                <Textarea value={form.pfmeaUpdatePlan} onChange={(e) => setForm({ ...form, pfmeaUpdatePlan: e.target.value })} rows={2} placeholder="PFMEA update plan..." />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <Label>Control Plan Updates Required?</Label>
                <Switch checked={form.controlPlanUpdatesRequired === 1} onCheckedChange={(v) => setForm({ ...form, controlPlanUpdatesRequired: v ? 1 : 0 })} />
              </div>
              {form.controlPlanUpdatesRequired === 1 && (
                <Textarea value={form.controlPlanUpdatePlan} onChange={(e) => setForm({ ...form, controlPlanUpdatePlan: e.target.value })} rows={2} placeholder="Control Plan update plan..." />
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Label>Training Required?</Label>
            <Switch checked={form.trainingRequired === 1} onCheckedChange={(v) => setForm({ ...form, trainingRequired: v ? 1 : 0 })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Cost Analysis</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Estimated Cost ($)</Label>
              <Input type="number" step="0.01" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Estimated Savings ($)</Label>
              <Input type="number" step="0.01" value={form.estimatedSavings} onChange={(e) => setForm({ ...form, estimatedSavings: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Payback (months)</Label>
              <Input type="number" value={form.estimatedPaybackMonths} onChange={(e) => setForm({ ...form, estimatedPaybackMonths: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="mt-4">
            <Label>Notes</Label>
            <Textarea value={form.d5Notes} onChange={(e) => setForm({ ...form, d5Notes: e.target.value })} rows={2} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          {d5?.d5CompletedAt && `Completed: ${formatDateTime(d5.d5CompletedAt)}`}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1" /> Save D5
          </Button>
          {!d5?.d5CompletedAt && (
            <Button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Complete D5
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── D6: Validation ───

function D6Tab({ capaId }: { capaId: number }) {
  const { toast } = useToast();
  const { data: d6, isLoading } = useQuery<any>({ queryKey: ["/api/capas", capaId, "d6"] });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/capas/${capaId}/d6`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "d6"] });
      toast({ title: "D6 saved" });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Error", description: error.message }),
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/capas/${capaId}/d6/complete`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "d6"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId] });
      toast({ title: "D6 completed" });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Error", description: error.message }),
  });

  const [form, setForm] = useState<any>(null);

  if (d6 && !form) {
    setForm({
      implementationStatus: d6.implementationStatus || "not_started",
      implementationProgress: d6.implementationProgress || 0,
      containmentRemoved: d6.containmentRemoved || 0,
      effectivenessCheckPeriod: d6.effectivenessCheckPeriod || "",
      effectivenessMetric: d6.effectivenessMetric || "",
      effectivenessTarget: d6.effectivenessTarget || "",
      effectivenessActual: d6.effectivenessActual || "",
      effectivenessVerified: d6.effectivenessVerified || 0,
      effectivenessResult: d6.effectivenessResult || "",
      pfmeaUpdated: d6.pfmeaUpdated || 0,
      pfmeaUpdateDetails: d6.pfmeaUpdateDetails || "",
      controlPlanUpdated: d6.controlPlanUpdated || 0,
      controlPlanUpdateDetails: d6.controlPlanUpdateDetails || "",
      trainingCompleted: d6.trainingCompleted || 0,
      d6Notes: d6.d6Notes || "",
    });
  }

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-8" />;

  if (!form) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">D6 Validation has not been started.</p>
        <Button onClick={() => setForm({
          implementationStatus: "not_started", implementationProgress: 0, containmentRemoved: 0,
          effectivenessCheckPeriod: "", effectivenessMetric: "", effectivenessTarget: "",
          effectivenessActual: "", effectivenessVerified: 0, effectivenessResult: "",
          pfmeaUpdated: 0, pfmeaUpdateDetails: "", controlPlanUpdated: 0,
          controlPlanUpdateDetails: "", trainingCompleted: 0, d6Notes: "",
        })}>Start D6</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Implementation Status</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Status</Label>
              <Select value={form.implementationStatus} onValueChange={(v) => setForm({ ...form, implementationStatus: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Progress ({form.implementationProgress}%)</Label>
              <Input type="range" min="0" max="100" value={form.implementationProgress} onChange={(e) => setForm({ ...form, implementationProgress: parseInt(e.target.value) })} className="mt-2" />
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${form.implementationProgress}%` }} />
          </div>
          <div className="flex items-center gap-4">
            <Label>Containment Removed?</Label>
            <Switch checked={form.containmentRemoved === 1} onCheckedChange={(v) => setForm({ ...form, containmentRemoved: v ? 1 : 0 })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Effectiveness Verification</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Check Period</Label>
              <Select value={form.effectivenessCheckPeriod} onValueChange={(v) => setForm({ ...form, effectivenessCheckPeriod: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30_days">30 Days</SelectItem>
                  <SelectItem value="60_days">60 Days</SelectItem>
                  <SelectItem value="90_days">90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Metric</Label>
              <Input value={form.effectivenessMetric} onChange={(e) => setForm({ ...form, effectivenessMetric: e.target.value })} placeholder="e.g., Defect rate" />
            </div>
            <div>
              <Label>Target</Label>
              <Input value={form.effectivenessTarget} onChange={(e) => setForm({ ...form, effectivenessTarget: e.target.value })} placeholder="e.g., < 0.1%" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Actual Result</Label>
              <Input value={form.effectivenessActual} onChange={(e) => setForm({ ...form, effectivenessActual: e.target.value })} />
            </div>
            <div>
              <Label>Result</Label>
              <Select value={form.effectivenessResult} onValueChange={(v) => setForm({ ...form, effectivenessResult: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="effective">Effective</SelectItem>
                  <SelectItem value="partially_effective">Partially Effective</SelectItem>
                  <SelectItem value="not_effective">Not Effective</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Label>Effectiveness Verified?</Label>
            <Switch checked={form.effectivenessVerified === 1} onCheckedChange={(v) => setForm({ ...form, effectivenessVerified: v ? 1 : 0 })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Document Updates</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <Label>PFMEA Updated?</Label>
                <Switch checked={form.pfmeaUpdated === 1} onCheckedChange={(v) => setForm({ ...form, pfmeaUpdated: v ? 1 : 0 })} />
              </div>
              {form.pfmeaUpdated === 1 && (
                <Textarea value={form.pfmeaUpdateDetails} onChange={(e) => setForm({ ...form, pfmeaUpdateDetails: e.target.value })} rows={2} placeholder="Update details..." />
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <Label>Control Plan Updated?</Label>
                <Switch checked={form.controlPlanUpdated === 1} onCheckedChange={(v) => setForm({ ...form, controlPlanUpdated: v ? 1 : 0 })} />
              </div>
              {form.controlPlanUpdated === 1 && (
                <Textarea value={form.controlPlanUpdateDetails} onChange={(e) => setForm({ ...form, controlPlanUpdateDetails: e.target.value })} rows={2} placeholder="Update details..." />
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Label>Training Completed?</Label>
            <Switch checked={form.trainingCompleted === 1} onCheckedChange={(v) => setForm({ ...form, trainingCompleted: v ? 1 : 0 })} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.d6Notes} onChange={(e) => setForm({ ...form, d6Notes: e.target.value })} rows={2} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          {d6?.d6CompletedAt && `Completed: ${formatDateTime(d6.d6CompletedAt)}`}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1" /> Save D6
          </Button>
          {!d6?.d6CompletedAt && (
            <Button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Complete D6
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── D7: Preventive Actions ───

function D7Tab({ capaId }: { capaId: number }) {
  const { toast } = useToast();
  const { data: d7, isLoading } = useQuery<any>({ queryKey: ["/api/capas", capaId, "d7"] });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/capas/${capaId}/d7`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "d7"] });
      toast({ title: "D7 saved" });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Error", description: error.message }),
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/capas/${capaId}/d7/complete`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "d7"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId] });
      toast({ title: "D7 completed" });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Error", description: error.message }),
  });

  const [form, setForm] = useState<any>(null);

  if (d7 && !form) {
    setForm({
      systemicAnalysisComplete: d7.systemicAnalysisComplete || 0,
      systemicAnalysisSummary: d7.systemicAnalysisSummary || "",
      policyChangesRequired: d7.policyChangesRequired || 0,
      procedureChangesRequired: d7.procedureChangesRequired || 0,
      systemChangesRequired: d7.systemChangesRequired || 0,
      designChangesRequired: d7.designChangesRequired || 0,
      supplierActionsRequired: d7.supplierActionsRequired || 0,
      fmeaSystemReviewComplete: d7.fmeaSystemReviewComplete || 0,
      fmeaSystemReviewNotes: d7.fmeaSystemReviewNotes || "",
      lessonLearnedCreated: d7.lessonLearnedCreated || 0,
      lessonLearnedReference: d7.lessonLearnedReference || "",
      knowledgeBaseUpdated: d7.knowledgeBaseUpdated || 0,
      trainingMaterialsUpdated: d7.trainingMaterialsUpdated || 0,
      auditChecklistUpdated: d7.auditChecklistUpdated || 0,
      standardizationComplete: d7.standardizationComplete || 0,
      standardizationSummary: d7.standardizationSummary || "",
      d7Notes: d7.d7Notes || "",
    });
  }

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-8" />;

  if (!form) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">D7 Preventive Actions has not been started.</p>
        <Button onClick={() => setForm({
          systemicAnalysisComplete: 0, systemicAnalysisSummary: "", policyChangesRequired: 0,
          procedureChangesRequired: 0, systemChangesRequired: 0, designChangesRequired: 0,
          supplierActionsRequired: 0, fmeaSystemReviewComplete: 0, fmeaSystemReviewNotes: "",
          lessonLearnedCreated: 0, lessonLearnedReference: "", knowledgeBaseUpdated: 0,
          trainingMaterialsUpdated: 0, auditChecklistUpdated: 0, standardizationComplete: 0,
          standardizationSummary: "", d7Notes: "",
        })}>Start D7</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Systemic Analysis</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label>Analysis Complete?</Label>
            <Switch checked={form.systemicAnalysisComplete === 1} onCheckedChange={(v) => setForm({ ...form, systemicAnalysisComplete: v ? 1 : 0 })} />
          </div>
          <div>
            <Label>Summary</Label>
            <Textarea value={form.systemicAnalysisSummary} onChange={(e) => setForm({ ...form, systemicAnalysisSummary: e.target.value })} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">System Changes Required</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[
              { key: "policyChangesRequired", label: "Policy Changes" },
              { key: "procedureChangesRequired", label: "Procedure Changes" },
              { key: "systemChangesRequired", label: "System Changes" },
              { key: "designChangesRequired", label: "Design Changes" },
              { key: "supplierActionsRequired", label: "Supplier Actions" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3 p-3 border rounded-lg">
                <Switch checked={(form as any)[key] === 1} onCheckedChange={(v) => setForm({ ...form, [key]: v ? 1 : 0 })} />
                <Label className="text-sm">{label}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Knowledge Capture</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Switch checked={form.fmeaSystemReviewComplete === 1} onCheckedChange={(v) => setForm({ ...form, fmeaSystemReviewComplete: v ? 1 : 0 })} />
              <Label className="text-sm">FMEA System Review Complete</Label>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Switch checked={form.lessonLearnedCreated === 1} onCheckedChange={(v) => setForm({ ...form, lessonLearnedCreated: v ? 1 : 0 })} />
              <Label className="text-sm">Lesson Learned Created</Label>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Switch checked={form.knowledgeBaseUpdated === 1} onCheckedChange={(v) => setForm({ ...form, knowledgeBaseUpdated: v ? 1 : 0 })} />
              <Label className="text-sm">Knowledge Base Updated</Label>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Switch checked={form.trainingMaterialsUpdated === 1} onCheckedChange={(v) => setForm({ ...form, trainingMaterialsUpdated: v ? 1 : 0 })} />
              <Label className="text-sm">Training Materials Updated</Label>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Switch checked={form.auditChecklistUpdated === 1} onCheckedChange={(v) => setForm({ ...form, auditChecklistUpdated: v ? 1 : 0 })} />
              <Label className="text-sm">Audit Checklist Updated</Label>
            </div>
          </div>
          {form.lessonLearnedCreated === 1 && (
            <div>
              <Label>Lesson Learned Reference</Label>
              <Input value={form.lessonLearnedReference} onChange={(e) => setForm({ ...form, lessonLearnedReference: e.target.value })} />
            </div>
          )}
          {form.fmeaSystemReviewComplete === 1 && (
            <div>
              <Label>FMEA Review Notes</Label>
              <Textarea value={form.fmeaSystemReviewNotes} onChange={(e) => setForm({ ...form, fmeaSystemReviewNotes: e.target.value })} rows={2} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Standardization</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label>Standardization Complete?</Label>
            <Switch checked={form.standardizationComplete === 1} onCheckedChange={(v) => setForm({ ...form, standardizationComplete: v ? 1 : 0 })} />
          </div>
          <div>
            <Label>Summary</Label>
            <Textarea value={form.standardizationSummary} onChange={(e) => setForm({ ...form, standardizationSummary: e.target.value })} rows={2} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.d7Notes} onChange={(e) => setForm({ ...form, d7Notes: e.target.value })} rows={2} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          {d7?.d7CompletedAt && `Completed: ${formatDateTime(d7.d7CompletedAt)}`}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1" /> Save D7
          </Button>
          {!d7?.d7CompletedAt && (
            <Button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Complete D7
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── D8: Closure ───

function D8Tab({ capaId }: { capaId: number }) {
  const { toast } = useToast();
  const { data: d8, isLoading } = useQuery<any>({ queryKey: ["/api/capas", capaId, "d8"] });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/capas/${capaId}/d8`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "d8"] });
      toast({ title: "D8 saved" });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Error", description: error.message }),
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/capas/${capaId}/d8/complete`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "d8"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId] });
      toast({ title: "D8 completed" });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Error", description: error.message }),
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/capas/${capaId}/d8/close`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "d8"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId] });
      toast({ title: "CAPA closed successfully" });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Error", description: error.message }),
  });

  const [form, setForm] = useState<any>(null);

  if (d8 && !form) {
    setForm({
      closureCriteriaMet: d8.closureCriteriaMet || 0,
      allActionsComplete: d8.allActionsComplete || 0,
      actionsCompletionSummary: d8.actionsCompletionSummary || "",
      effectivenessConfirmed: d8.effectivenessConfirmed || 0,
      effectivenessSummary: d8.effectivenessSummary || "",
      noRecurrence: d8.noRecurrence || 0,
      recurrenceMonitoringPeriod: d8.recurrenceMonitoringPeriod || "",
      documentationComplete: d8.documentationComplete || 0,
      containmentRemoved: d8.containmentRemoved || 0,
      teamRecognitionMethod: d8.teamRecognitionMethod || "",
      teamFeedback: d8.teamFeedback || "",
      lessonsLearnedSummary: d8.lessonsLearnedSummary || "",
      lessonsLearnedShared: d8.lessonsLearnedShared || 0,
      costSavingsRealized: d8.costSavingsRealized || 0,
      cycleTimeDays: d8.cycleTimeDays || 0,
      onTimeCompletion: d8.onTimeCompletion || 0,
      customerClosed: d8.customerClosed || 0,
      customerFeedback: d8.customerFeedback || "",
      d8Notes: d8.d8Notes || "",
    });
  }

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin mx-auto mt-8" />;

  if (!form) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">D8 Closure has not been started.</p>
        <Button onClick={() => setForm({
          closureCriteriaMet: 0, allActionsComplete: 0, actionsCompletionSummary: "",
          effectivenessConfirmed: 0, effectivenessSummary: "", noRecurrence: 0,
          recurrenceMonitoringPeriod: "", documentationComplete: 0, containmentRemoved: 0,
          teamRecognitionMethod: "", teamFeedback: "", lessonsLearnedSummary: "",
          lessonsLearnedShared: 0, costSavingsRealized: 0, cycleTimeDays: 0,
          onTimeCompletion: 0, customerClosed: 0, customerFeedback: "", d8Notes: "",
        })}>Start D8</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Closure Criteria</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { key: "closureCriteriaMet", label: "All Closure Criteria Met" },
              { key: "allActionsComplete", label: "All Actions Complete" },
              { key: "effectivenessConfirmed", label: "Effectiveness Confirmed" },
              { key: "noRecurrence", label: "No Recurrence" },
              { key: "documentationComplete", label: "Documentation Complete" },
              { key: "containmentRemoved", label: "Containment Removed" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3 p-3 border rounded-lg">
                <Switch checked={(form as any)[key] === 1} onCheckedChange={(v) => setForm({ ...form, [key]: v ? 1 : 0 })} />
                <Label className="text-sm">{label}</Label>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <Label>Actions Completion Summary</Label>
              <Textarea value={form.actionsCompletionSummary} onChange={(e) => setForm({ ...form, actionsCompletionSummary: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Effectiveness Summary</Label>
              <Textarea value={form.effectivenessSummary} onChange={(e) => setForm({ ...form, effectivenessSummary: e.target.value })} rows={2} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Team Recognition</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Recognition Method</Label>
            <Input value={form.teamRecognitionMethod} onChange={(e) => setForm({ ...form, teamRecognitionMethod: e.target.value })} placeholder="e.g., Team celebration, certificates..." />
          </div>
          <div>
            <Label>Team Feedback / Retrospective</Label>
            <Textarea value={form.teamFeedback} onChange={(e) => setForm({ ...form, teamFeedback: e.target.value })} rows={3} placeholder="What went well? What could improve?" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Lessons Learned & Metrics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Lessons Learned Summary</Label>
            <Textarea value={form.lessonsLearnedSummary} onChange={(e) => setForm({ ...form, lessonsLearnedSummary: e.target.value })} rows={3} />
          </div>
          <div className="flex items-center gap-4">
            <Label>Lessons Shared?</Label>
            <Switch checked={form.lessonsLearnedShared === 1} onCheckedChange={(v) => setForm({ ...form, lessonsLearnedShared: v ? 1 : 0 })} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Cost Savings Realized ($)</Label>
              <Input type="number" step="0.01" value={form.costSavingsRealized} onChange={(e) => setForm({ ...form, costSavingsRealized: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Cycle Time (days)</Label>
              <Input type="number" value={form.cycleTimeDays} onChange={(e) => setForm({ ...form, cycleTimeDays: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center gap-4">
              <Label>On-Time Completion?</Label>
              <Switch checked={form.onTimeCompletion === 1} onCheckedChange={(v) => setForm({ ...form, onTimeCompletion: v ? 1 : 0 })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Customer Closure</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label>Customer Closed?</Label>
            <Switch checked={form.customerClosed === 1} onCheckedChange={(v) => setForm({ ...form, customerClosed: v ? 1 : 0 })} />
          </div>
          {form.customerClosed === 1 && (
            <div>
              <Label>Customer Feedback</Label>
              <Textarea value={form.customerFeedback} onChange={(e) => setForm({ ...form, customerFeedback: e.target.value })} rows={2} />
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Textarea value={form.d8Notes} onChange={(e) => setForm({ ...form, d8Notes: e.target.value })} rows={2} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          {d8?.d8CompletedAt && `Completed: ${formatDateTime(d8.d8CompletedAt)}`}
          {d8?.closedAt && ` | Closed: ${formatDateTime(d8.closedAt)}`}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-1" /> Save D8
          </Button>
          {!d8?.d8CompletedAt && (
            <Button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Complete D8
            </Button>
          )}
          {d8?.d8CompletedAt && !d8?.closedAt && (
            <Button variant="default" onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending}>
              Close CAPA
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Attachments Panel ───

function AttachmentsPanel({ capaId }: { capaId: number }) {
  const { toast } = useToast();
  const { data: attachments, isLoading } = useQuery<any[]>({
    queryKey: ["/api/capas", capaId, "attachments"],
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Attachments</CardTitle>
        <Badge variant="secondary">{(attachments || []).length}</Badge>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (attachments || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No attachments.</p>
        ) : (
          <div className="space-y-1">
            {(attachments || []).slice(0, 8).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between text-sm py-1">
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{a.title || a.originalName}</span>
                </div>
                {a.isEvidence === 1 && <Badge variant="outline" className="text-[10px] flex-shrink-0">Evidence</Badge>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Audit Trail Panel ───

function AuditTrailPanel({ capaId }: { capaId: number }) {
  const { data: logs, isLoading } = useQuery<any[]>({
    queryKey: ["/api/capas", capaId, "audit-log"],
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (logs || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded.</p>
        ) : (
          <div className="space-y-2">
            {(logs || []).slice(0, 8).map((log: any) => (
              <div key={log.id} className="text-xs border-b pb-1 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{(log.action || "").replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground">{log.discipline || ""}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>{log.userName || log.userId}</span>
                  <span>{log.timestamp ? new Date(log.timestamp).toLocaleDateString() : ""}</span>
                </div>
                {log.changeDescription && (
                  <p className="text-muted-foreground mt-0.5">{log.changeDescription}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Overview Tab ───

function OverviewTab({ capa }: { capa: any }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Problem Description</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{capa.description || "No description provided."}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Key Dates</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Date Occurred:</span><span>{formatDate(capa.dateOccurred)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date Discovered:</span><span>{formatDate(capa.dateDiscovered)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Date Reported:</span><span>{formatDate(capa.dateReported)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Target Closure:</span><span>{formatDate(capa.targetClosureDate)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Actual Closure:</span><span>{formatDate(capa.actualClosureDate)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Created:</span><span>{formatDate(capa.createdAt)}</span></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Type:</span><span className="capitalize">{capa.type}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Source:</span><span>{(capa.sourceType || "").replace(/_/g, " ")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Category:</span><span className="capitalize">{capa.category || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Customer:</span><span>{capa.customerName || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Plant:</span><span>{capa.plantLocation || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Risk Level:</span><span className="capitalize">{capa.riskLevel || "—"}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Main Detail Page ───

export default function CapaDetail() {
  const [, params] = useRoute("/capa/:id");
  const capaId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: capa, isLoading } = useQuery<any>({
    queryKey: ["/api/capas", capaId],
    enabled: capaId > 0,
  });

  const advanceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/capas/${capaId}/advance-discipline`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId] });
      toast({ title: "Discipline advanced" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const holdMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/capas/${capaId}/hold`, { reason: "Manual hold" });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId] });
      toast({ title: "CAPA put on hold" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  if (isLoading || !capa) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/capa">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{capa.capaNumber}</span>
              <Badge className={priorityColors[capa.priority] || ""}>{capa.priority}</Badge>
              <Badge variant="outline">{capa.currentDiscipline || "D0"}</Badge>
              {capa.status === "on_hold" && <Badge variant="destructive">On Hold</Badge>}
              {capa.status === "closed" && <Badge className="bg-green-500 text-white">Closed</Badge>}
            </div>
            <h1 className="text-2xl font-bold mt-1">{capa.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {(capa.type || "corrective").charAt(0).toUpperCase() + (capa.type || "corrective").slice(1)} Action
              {capa.sourceType && ` | Source: ${capa.sourceType.replace(/_/g, " ")}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {capa.status !== "closed" && capa.status !== "cancelled" && (
            <>
              {capa.status === "on_hold" ? (
                <Button variant="outline" onClick={() => {
                  apiRequest("POST", `/api/capas/${capaId}/resume`).then(() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId] });
                    toast({ title: "CAPA resumed" });
                  });
                }}>
                  <Play className="h-4 w-4 mr-1" /> Resume
                </Button>
              ) : (
                <Button variant="outline" onClick={() => holdMutation.mutate()}>
                  <Pause className="h-4 w-4 mr-1" /> Hold
                </Button>
              )}
              <Button onClick={() => advanceMutation.mutate()} disabled={advanceMutation.isPending}>
                Advance Discipline
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 8D Progress */}
      <Card>
        <CardContent className="pt-4">
          <ProgressTimeline currentDiscipline={capa.currentDiscipline || "D0"} capa={capa} />
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {disciplines.map((d) => (
              <TabsTrigger key={d} value={d.toLowerCase()}>{d}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview"><OverviewTab capa={capa} /></TabsContent>
          <TabsContent value="d0"><D0Tab capaId={capaId} /></TabsContent>
          <TabsContent value="d1"><D1Tab capaId={capaId} /></TabsContent>
          <TabsContent value="d2"><D2Tab capaId={capaId} /></TabsContent>
          <TabsContent value="d3"><D3Tab capaId={capaId} /></TabsContent>
          <TabsContent value="d4"><D4Tab capaId={capaId} /></TabsContent>
          <TabsContent value="d5"><D5Tab capaId={capaId} /></TabsContent>
          <TabsContent value="d6"><D6Tab capaId={capaId} /></TabsContent>
          <TabsContent value="d7"><D7Tab capaId={capaId} /></TabsContent>
          <TabsContent value="d8"><D8Tab capaId={capaId} /></TabsContent>
        </Tabs>

        {/* Sidebar */}
        <div className="space-y-4">
          <TeamPanel capaId={capaId} />
          <AttachmentsPanel capaId={capaId} />
          <AuditTrailPanel capaId={capaId} />
        </div>
      </div>
    </div>
  );
}
