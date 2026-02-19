import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import {
  ArrowLeft, Loader2, Plus, CheckCircle2, Save, Trash2, ChevronDown, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const TOOL_TYPES = [
  { value: "is_not", label: "Is / Is Not Analysis", icon: "=" },
  { value: "five_why", label: "5-Why Chain", icon: "?" },
  { value: "three_legged", label: "3-Legged 5-Why (Ford)", icon: "3" },
  { value: "fishbone", label: "Fishbone / Ishikawa", icon: "F" },
  { value: "fault_tree", label: "Fault Tree Analysis", icon: "T" },
  { value: "comparative", label: "Comparative Analysis", icon: "C" },
  { value: "change_point", label: "Change Point Analysis", icon: "P" },
  { value: "pareto", label: "Pareto Chart", icon: "P" },
];

const statusColors: Record<string, string> = {
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  verified: "bg-purple-100 text-purple-700",
};

function parseData(tool: any) {
  try {
    return typeof tool.data === "string" ? JSON.parse(tool.data) : (tool.data || {});
  } catch { return {}; }
}

// ─── Is/Is Not Builder ───

function IsIsNotBuilder({ tool, capaId }: { tool: any; capaId: number }) {
  const { toast } = useToast();
  const data = parseData(tool);
  const [form, setForm] = useState({
    what_is: data.what_is || [{ observation: "", evidence: "" }],
    what_is_not: data.what_is_not || [{ observation: "", evidence: "" }],
    what_distinction: data.what_distinction || "",
    where_is: data.where_is || [{ observation: "" }],
    where_is_not: data.where_is_not || [{ observation: "" }],
    where_distinction: data.where_distinction || "",
    when_is: data.when_is || [{ observation: "" }],
    when_is_not: data.when_is_not || [{ observation: "" }],
    when_distinction: data.when_distinction || "",
    howmany_is: data.howmany_is || [{ observation: "" }],
    howmany_is_not: data.howmany_is_not || [{ observation: "" }],
    howmany_distinction: data.howmany_distinction || "",
    therefore: data.therefore || "",
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/capas/${capaId}/analysis-tools/${tool.id}`, {
        data: JSON.stringify(form),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "analysis-tools"] });
      toast({ title: "Saved" });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Error", description: error.message }),
  });

  const addRow = (field: string) => {
    setForm({ ...form, [field]: [...(form as any)[field], { observation: "", evidence: "" }] });
  };

  const updateRow = (field: string, idx: number, val: string) => {
    const arr = [...(form as any)[field]];
    arr[idx] = { ...arr[idx], observation: val };
    setForm({ ...form, [field]: arr });
  };

  const renderDimension = (label: string, isField: string, isNotField: string, distinctionField: string) => (
    <Card>
      <CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label className="text-green-700 font-bold">IS</Label>
            {((form as any)[isField] || []).map((row: any, i: number) => (
              <Input key={i} className="mt-1" value={row.observation} onChange={(e) => updateRow(isField, i, e.target.value)} placeholder="Observation..." />
            ))}
            <Button size="sm" variant="ghost" className="mt-1" onClick={() => addRow(isField)}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          <div>
            <Label className="text-red-700 font-bold">IS NOT</Label>
            {((form as any)[isNotField] || []).map((row: any, i: number) => (
              <Input key={i} className="mt-1" value={row.observation} onChange={(e) => updateRow(isNotField, i, e.target.value)} placeholder="Observation..." />
            ))}
            <Button size="sm" variant="ghost" className="mt-1" onClick={() => addRow(isNotField)}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          <div>
            <Label className="font-bold">DISTINCTION</Label>
            <Textarea value={(form as any)[distinctionField]} onChange={(e) => setForm({ ...form, [distinctionField]: e.target.value })} rows={3} className="mt-1" placeholder="What distinguishes IS from IS NOT?" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {renderDimension("WHAT", "what_is", "what_is_not", "what_distinction")}
      {renderDimension("WHERE", "where_is", "where_is_not", "where_distinction")}
      {renderDimension("WHEN", "when_is", "when_is_not", "when_distinction")}
      {renderDimension("HOW MANY", "howmany_is", "howmany_is_not", "howmany_distinction")}
      <Card>
        <CardHeader><CardTitle className="text-base">THEREFORE</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={form.therefore} onChange={(e) => setForm({ ...form, therefore: e.target.value })} rows={3} placeholder="Based on the analysis above, the most likely cause is..." />
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
}

// ─── 5-Why Builder ───

function FiveWhyBuilder({ tool, capaId }: { tool: any; capaId: number }) {
  const { toast } = useToast();
  const data = parseData(tool);
  const [form, setForm] = useState({
    startingPoint: data.startingPoint || "",
    whys: data.whys || [{ question: "", answer: "", evidence: "" }],
    rootCause: data.rootCause || "",
    rootCauseCategory: data.rootCauseCategory || "",
    verification: data.verification || "",
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/capas/${capaId}/analysis-tools/${tool.id}`, {
        data: JSON.stringify(form),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "analysis-tools"] });
      toast({ title: "Saved" });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Error", description: error.message }),
  });

  const addWhy = () => {
    const prev = form.whys[form.whys.length - 1];
    setForm({
      ...form,
      whys: [...form.whys, { question: prev?.answer ? `Why ${prev.answer.toLowerCase()}?` : "", answer: "", evidence: "" }],
    });
  };

  const updateWhy = (idx: number, field: string, val: string) => {
    const whys = [...form.whys];
    whys[idx] = { ...whys[idx], [field]: val };
    setForm({ ...form, whys });
  };

  const removeWhy = (idx: number) => {
    if (form.whys.length <= 1) return;
    setForm({ ...form, whys: form.whys.filter((_: any, i: number) => i !== idx) });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Starting Point</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={form.startingPoint} onChange={(e) => setForm({ ...form, startingPoint: e.target.value })} rows={2} placeholder="What is the problem being analyzed?" />
        </CardContent>
      </Card>

      {form.whys.map((why: any, i: number) => (
        <Card key={i} className="border-l-4 border-l-primary">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">WHY {i + 1}</CardTitle>
            {form.whys.length > 1 && (
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeWhy(i)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">Question</Label>
              <Input value={why.question} onChange={(e) => updateWhy(i, "question", e.target.value)} placeholder={`Why #${i + 1}?`} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Answer</Label>
              <Textarea value={why.answer} onChange={(e) => updateWhy(i, "answer", e.target.value)} rows={2} placeholder="Because..." />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Evidence</Label>
              <Input value={why.evidence} onChange={(e) => updateWhy(i, "evidence", e.target.value)} placeholder="Supporting evidence..." />
            </div>
          </CardContent>
          {i < form.whys.length - 1 && (
            <div className="flex justify-center pb-2">
              <ChevronDown className="h-5 w-5 text-primary" />
            </div>
          )}
        </Card>
      ))}

      <div className="flex justify-center">
        <Button variant="outline" onClick={addWhy}>
          <Plus className="h-4 w-4 mr-1" /> Add Why
        </Button>
      </div>

      <Card className="border-2 border-green-500">
        <CardHeader><CardTitle className="text-base text-green-700">ROOT CAUSE</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={form.rootCause} onChange={(e) => setForm({ ...form, rootCause: e.target.value })} rows={2} placeholder="The root cause is..." />
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Category</Label>
              <Select value={form.rootCauseCategory} onValueChange={(v) => setForm({ ...form, rootCauseCategory: v })}>
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
              <Label>Verification</Label>
              <Input value={form.verification} onChange={(e) => setForm({ ...form, verification: e.target.value })} placeholder="How was root cause verified?" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
}

// ─── 3-Legged 5-Why ───

function ThreeLeggedFiveWhy({ tool, capaId }: { tool: any; capaId: number }) {
  const { toast } = useToast();
  const data = parseData(tool);
  const [form, setForm] = useState({
    startingPoint: data.startingPoint || "",
    occurrence: data.occurrence || { whys: [{ q: "", a: "" }], rootCause: "" },
    detection: data.detection || { whys: [{ q: "", a: "" }], rootCause: "" },
    systemic: data.systemic || { whys: [{ q: "", a: "" }], rootCause: "" },
    summary: data.summary || "",
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/capas/${capaId}/analysis-tools/${tool.id}`, {
        data: JSON.stringify(form),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "analysis-tools"] });
      toast({ title: "Saved" });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Error", description: error.message }),
  });

  const updateLeg = (leg: string, field: string, value: any) => {
    setForm({ ...form, [leg]: { ...(form as any)[leg], [field]: value } });
  };

  const addWhyToLeg = (leg: string) => {
    const legData = (form as any)[leg];
    updateLeg(leg, "whys", [...legData.whys, { q: "", a: "" }]);
  };

  const updateWhyInLeg = (leg: string, idx: number, field: string, val: string) => {
    const legData = (form as any)[leg];
    const whys = [...legData.whys];
    whys[idx] = { ...whys[idx], [field]: val };
    updateLeg(leg, "whys", whys);
  };

  const renderLeg = (key: string, title: string, subtitle: string) => {
    const legData = (form as any)[key];
    return (
      <Card className="flex-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title}</CardTitle>
          <CardDescription className="text-xs">{subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {legData.whys.map((w: any, i: number) => (
            <div key={i} className="space-y-1">
              <Label className="text-xs">W{i + 1}</Label>
              <Input value={w.a} onChange={(e) => updateWhyInLeg(key, i, "a", e.target.value)} placeholder={`Answer ${i + 1}...`} className="text-sm" />
            </div>
          ))}
          <Button size="sm" variant="ghost" onClick={() => addWhyToLeg(key)}>
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
          <Separator />
          <div>
            <Label className="text-xs font-bold text-green-700">Root Cause</Label>
            <Textarea value={legData.rootCause} onChange={(e) => updateLeg(key, "rootCause", e.target.value)} rows={2} className="text-sm" />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Starting Point</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={form.startingPoint} onChange={(e) => setForm({ ...form, startingPoint: e.target.value })} rows={2} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {renderLeg("occurrence", "Leg 1: Occurrence", "Why did it happen?")}
        {renderLeg("detection", "Leg 2: Detection", "Why not detected?")}
        {renderLeg("systemic", "Leg 3: Systemic", "Why did system allow?")}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={3} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
}

// ─── Fishbone Diagram ───

function FishboneDiagram({ tool, capaId }: { tool: any; capaId: number }) {
  const { toast } = useToast();
  const data = parseData(tool);
  const categories = ["Man", "Machine", "Material", "Method", "Measurement", "Environment"];

  const [form, setForm] = useState({
    effect: data.effect || "",
    causes: data.causes || Object.fromEntries(categories.map((c) => [c, []])),
  });

  const [addCategory, setAddCategory] = useState<string | null>(null);
  const [newCause, setNewCause] = useState("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/capas/${capaId}/analysis-tools/${tool.id}`, {
        data: JSON.stringify(form),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "analysis-tools"] });
      toast({ title: "Saved" });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Error", description: error.message }),
  });

  const addCause = (category: string) => {
    if (!newCause.trim()) return;
    const causes = { ...form.causes };
    causes[category] = [...(causes[category] || []), { text: newCause, status: "suspected" }];
    setForm({ ...form, causes });
    setNewCause("");
    setAddCategory(null);
  };

  const toggleStatus = (category: string, idx: number) => {
    const causes = { ...form.causes };
    const arr = [...(causes[category] || [])];
    const statuses = ["suspected", "verified", "ruled_out"];
    const current = arr[idx].status || "suspected";
    arr[idx] = { ...arr[idx], status: statuses[(statuses.indexOf(current) + 1) % statuses.length] };
    causes[category] = arr;
    setForm({ ...form, causes });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Effect (Problem)</CardTitle></CardHeader>
        <CardContent>
          <Input value={form.effect} onChange={(e) => setForm({ ...form, effect: e.target.value })} placeholder="What is the effect/problem?" />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <Card key={cat}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{cat}</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setAddCategory(cat)}>
                <Plus className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent>
              {((form.causes[cat] || []) as any[]).length === 0 ? (
                <p className="text-xs text-muted-foreground">No causes added.</p>
              ) : (
                <div className="space-y-1">
                  {((form.causes[cat] || []) as any[]).map((cause: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <button onClick={() => toggleStatus(cat, i)} className="flex-shrink-0">
                        {cause.status === "verified" ? (
                          <span className="text-green-600 font-bold" title="Verified root cause">*</span>
                        ) : cause.status === "ruled_out" ? (
                          <span className="text-muted-foreground line-through" title="Ruled out">o</span>
                        ) : (
                          <span className="text-yellow-600" title="Suspected">?</span>
                        )}
                      </button>
                      <span className={cause.status === "ruled_out" ? "line-through text-muted-foreground" : ""}>
                        {cause.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {addCategory === cat && (
                <div className="flex gap-1 mt-2">
                  <Input
                    value={newCause}
                    onChange={(e) => setNewCause(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCause(cat)}
                    placeholder="Cause..."
                    className="text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => addCause(cat)}>Add</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-xs text-muted-foreground flex gap-4">
        <span><span className="text-green-600 font-bold">*</span> Verified</span>
        <span><span className="text-yellow-600">?</span> Suspected</span>
        <span><span className="line-through">o</span> Ruled Out</span>
        <span className="text-muted-foreground">(Click status to cycle)</span>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
}

// ─── Comparative Analysis ───

function ComparativeAnalysis({ tool, capaId }: { tool: any; capaId: number }) {
  const { toast } = useToast();
  const data = parseData(tool);
  const [form, setForm] = useState({
    goodItems: data.goodItems || [""],
    badItems: data.badItems || [""],
    factors: data.factors || [{ name: "", good: "", bad: "", significant: false, notes: "" }],
    hypothesis: data.hypothesis || "",
    verification: data.verification || "",
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/capas/${capaId}/analysis-tools/${tool.id}`, {
        data: JSON.stringify(form),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "analysis-tools"] });
      toast({ title: "Saved" });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Error", description: error.message }),
  });

  const updateFactor = (idx: number, field: string, val: any) => {
    const factors = [...form.factors];
    factors[idx] = { ...factors[idx], [field]: val };
    setForm({ ...form, factors });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700">Good Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {form.goodItems.map((item: string, i: number) => (
              <Input key={i} value={item} onChange={(e) => {
                const items = [...form.goodItems]; items[i] = e.target.value;
                setForm({ ...form, goodItems: items });
              }} placeholder="Good sample ID..." className="text-sm" />
            ))}
            <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, goodItems: [...form.goodItems, ""] })}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700">Bad Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {form.badItems.map((item: string, i: number) => (
              <Input key={i} value={item} onChange={(e) => {
                const items = [...form.badItems]; items[i] = e.target.value;
                setForm({ ...form, badItems: items });
              }} placeholder="Bad sample ID..." className="text-sm" />
            ))}
            <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, badItems: [...form.badItems, ""] })}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Comparison Factors</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setForm({
            ...form,
            factors: [...form.factors, { name: "", good: "", bad: "", significant: false, notes: "" }],
          })}>
            <Plus className="h-3 w-3 mr-1" /> Add Factor
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Factor</TableHead>
                <TableHead className="text-green-700">Good</TableHead>
                <TableHead className="text-red-700">Bad</TableHead>
                <TableHead className="w-20">Diff?</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {form.factors.map((f: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>
                    <Input value={f.name} onChange={(e) => updateFactor(i, "name", e.target.value)} className="text-sm" placeholder="Factor..." />
                  </TableCell>
                  <TableCell>
                    <Input value={f.good} onChange={(e) => updateFactor(i, "good", e.target.value)} className="text-sm" />
                  </TableCell>
                  <TableCell>
                    <Input value={f.bad} onChange={(e) => updateFactor(i, "bad", e.target.value)} className="text-sm" />
                  </TableCell>
                  <TableCell>
                    <Switch checked={f.significant} onCheckedChange={(v) => updateFactor(i, "significant", v)} />
                  </TableCell>
                  <TableCell>
                    <Input value={f.notes} onChange={(e) => updateFactor(i, "notes", e.target.value)} className="text-sm" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Hypothesis</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={form.hypothesis} onChange={(e) => setForm({ ...form, hypothesis: e.target.value })} rows={3} placeholder="Based on comparison..." />
          <div>
            <Label>Verification</Label>
            <Input value={form.verification} onChange={(e) => setForm({ ...form, verification: e.target.value })} placeholder="How was hypothesis verified?" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
}

// ─── Change Point Analysis ───

function ChangePointAnalysis({ tool, capaId }: { tool: any; capaId: number }) {
  const { toast } = useToast();
  const data = parseData(tool);
  const [form, setForm] = useState({
    problemDate: data.problemDate || "",
    windowStart: data.windowStart || "",
    changes: data.changes || [] as { date: string; category: string; description: string; status: string }[],
    hypothesis: data.hypothesis || "",
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/capas/${capaId}/analysis-tools/${tool.id}`, {
        data: JSON.stringify(form),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "analysis-tools"] });
      toast({ title: "Saved" });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Error", description: error.message }),
  });

  const addChange = () => {
    setForm({ ...form, changes: [...form.changes, { date: "", category: "machine", description: "", status: "suspected" }] });
  };

  const updateChange = (idx: number, field: string, val: string) => {
    const changes = [...form.changes];
    changes[idx] = { ...changes[idx], [field]: val };
    setForm({ ...form, changes });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Timeline Setup</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Problem First Observed</Label>
              <Input type="date" value={form.problemDate} onChange={(e) => setForm({ ...form, problemDate: e.target.value })} />
            </div>
            <div>
              <Label>Analysis Window Start</Label>
              <Input type="date" value={form.windowStart} onChange={(e) => setForm({ ...form, windowStart: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Changes (5M)</CardTitle>
          <Button size="sm" variant="outline" onClick={addChange}>
            <Plus className="h-3 w-3 mr-1" /> Add Change
          </Button>
        </CardHeader>
        <CardContent>
          {form.changes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No changes recorded. Add changes that occurred before the problem.</p>
          ) : (
            <div className="space-y-3">
              {form.changes.map((change: any, i: number) => (
                <div key={i} className="grid gap-2 md:grid-cols-[120px_120px_1fr_120px] items-start border-b pb-2">
                  <Input type="date" value={change.date} onChange={(e) => updateChange(i, "date", e.target.value)} />
                  <Select value={change.category} onValueChange={(v) => updateChange(i, "category", v)}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="man">Man</SelectItem>
                      <SelectItem value="machine">Machine</SelectItem>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="method">Method</SelectItem>
                      <SelectItem value="measurement">Measurement</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={change.description} onChange={(e) => updateChange(i, "description", e.target.value)} placeholder="Description..." />
                  <Select value={change.status} onValueChange={(v) => updateChange(i, "status", v)}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="likely">Likely</SelectItem>
                      <SelectItem value="suspected">Suspected</SelectItem>
                      <SelectItem value="ruled_out">Ruled Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Hypothesis</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={form.hypothesis} onChange={(e) => setForm({ ...form, hypothesis: e.target.value })} rows={3} placeholder="Based on the change point analysis..." />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
}

// ─── Generic Tool Placeholder ───

function GenericToolView({ tool, capaId }: { tool: any; capaId: number }) {
  const { toast } = useToast();
  const data = parseData(tool);
  const [notes, setNotes] = useState(data.notes || "");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/capas/${capaId}/analysis-tools/${tool.id}`, {
        data: JSON.stringify({ ...data, notes }),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "analysis-tools"] });
      toast({ title: "Saved" });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Error", description: error.message }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Analysis Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} placeholder="Enter analysis details..." />
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
      </div>
    </div>
  );
}

// ─── Tool Renderer ───

function ToolRenderer({ tool, capaId }: { tool: any; capaId: number }) {
  switch (tool.toolType) {
    case "is_not": return <IsIsNotBuilder tool={tool} capaId={capaId} />;
    case "five_why": return <FiveWhyBuilder tool={tool} capaId={capaId} />;
    case "three_legged": return <ThreeLeggedFiveWhy tool={tool} capaId={capaId} />;
    case "fishbone": return <FishboneDiagram tool={tool} capaId={capaId} />;
    case "comparative": return <ComparativeAnalysis tool={tool} capaId={capaId} />;
    case "change_point": return <ChangePointAnalysis tool={tool} capaId={capaId} />;
    default: return <GenericToolView tool={tool} capaId={capaId} />;
  }
}

// ─── Main Page ───

export default function CapaAnalysisTools() {
  const [, params] = useRoute("/capa/:id/tools");
  const capaId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newToolType, setNewToolType] = useState("five_why");
  const [newToolName, setNewToolName] = useState("");

  const { data: capa } = useQuery<any>({
    queryKey: ["/api/capas", capaId],
    enabled: capaId > 0,
  });

  const { data: tools, isLoading } = useQuery<any[]>({
    queryKey: ["/api/capas", capaId, "analysis-tools"],
    enabled: capaId > 0,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/capas/${capaId}/analysis-tools`, {
        toolType: newToolType,
        name: newToolName || TOOL_TYPES.find((t) => t.value === newToolType)?.label || newToolType,
        discipline: capa?.currentDiscipline || "D4",
        data: "{}",
      });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "analysis-tools"] });
      toast({ title: "Tool created" });
      setCreateOpen(false);
      setNewToolName("");
      setSelectedTool(data);
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Error", description: error.message }),
  });

  const completeMutation = useMutation({
    mutationFn: async (toolId: number) => {
      const res = await apiRequest("POST", `/api/capas/${capaId}/analysis-tools/${toolId}/complete`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "analysis-tools"] });
      toast({ title: "Tool marked complete" });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Error", description: error.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (toolId: number) => {
      await apiRequest("DELETE", `/api/capas/${capaId}/analysis-tools/${toolId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas", capaId, "analysis-tools"] });
      setSelectedTool(null);
      toast({ title: "Tool deleted" });
    },
    onError: (error: Error) => toast({ variant: "destructive", title: "Error", description: error.message }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allTools = tools || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/capa/${capaId}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Analysis Tools</h1>
            <p className="text-muted-foreground">
              {capa?.capaNumber} — {capa?.title}
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Tool
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Tool List */}
        <div className="space-y-2">
          {allTools.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No analysis tools created yet.</p>
                <Button className="mt-3" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Create First Tool
                </Button>
              </CardContent>
            </Card>
          ) : (
            allTools.map((tool: any) => (
              <Card
                key={tool.id}
                className={`cursor-pointer transition-colors ${selectedTool?.id === tool.id ? "border-primary" : "hover:bg-muted/50"}`}
                onClick={() => setSelectedTool(tool)}
              >
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{tool.name || tool.toolType}</p>
                      <p className="text-xs text-muted-foreground">
                        {TOOL_TYPES.find((t) => t.value === tool.toolType)?.label || tool.toolType}
                      </p>
                    </div>
                    <Badge className={statusColors[tool.status] || ""}>{tool.status}</Badge>
                  </div>
                  {tool.conclusion && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{tool.conclusion}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Tool Detail */}
        <div>
          {selectedTool ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">{selectedTool.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {TOOL_TYPES.find((t) => t.value === selectedTool.toolType)?.label}
                    {selectedTool.discipline && ` — ${selectedTool.discipline}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedTool.status === "in_progress" && (
                    <Button size="sm" variant="outline" onClick={() => completeMutation.mutate(selectedTool.id)}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => {
                    if (confirm("Delete this analysis tool?")) deleteMutation.mutate(selectedTool.id);
                  }}>
                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                  </Button>
                </div>
              </div>
              <ToolRenderer tool={selectedTool} capaId={capaId} />
            </div>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-muted-foreground">Select a tool from the list or create a new one.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Analysis Tool</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tool Type</Label>
              <Select value={newToolType} onValueChange={setNewToolType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TOOL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Name (optional)</Label>
              <Input
                value={newToolName}
                onChange={(e) => setNewToolName(e.target.value)}
                placeholder={TOOL_TYPES.find((t) => t.value === newToolType)?.label}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              Create Tool
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
