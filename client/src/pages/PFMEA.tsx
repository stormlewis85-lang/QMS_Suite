import { useState } from "react";
import { FileText, Plus, Loader2, ChevronLeft, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, APBadge } from "@/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Part, PFMEA, PFMEARow } from "@shared/schema";

type PFMEAWithRows = PFMEA & { rows: PFMEARow[] };

export default function PFMEA() {
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [selectedPfmeaId, setSelectedPfmeaId] = useState<string | null>(null);

  const { data: parts = [], isLoading: partsLoading } = useQuery<Part[]>({
    queryKey: ["/api/parts"],
  });

  const { data: pfmeas = [], isLoading: pfmeasLoading } = useQuery<PFMEA[]>({
    queryKey: ["/api/pfmea", selectedPartId],
    enabled: !!selectedPartId,
    queryFn: async () => {
      const res = await fetch(`/api/pfmea?partId=${selectedPartId}`);
      if (!res.ok) throw new Error("Failed to fetch PFMEAs");
      return res.json();
    },
  });

  const { data: pfmeaDetail, isLoading: pfmeaDetailLoading } = useQuery<PFMEAWithRows>({
    queryKey: ["/api/pfmea", selectedPfmeaId, "detail"],
    enabled: !!selectedPfmeaId,
    queryFn: async () => {
      const res = await fetch(`/api/pfmea/${selectedPfmeaId}`);
      if (!res.ok) throw new Error("Failed to fetch PFMEA details");
      return res.json();
    },
  });

  const selectedPart = parts.find(p => p.id === selectedPartId);

  if (selectedPfmeaId) {
    return <PFMEADetailView pfmea={pfmeaDetail} part={selectedPart!} onBack={() => setSelectedPfmeaId(null)} loading={pfmeaDetailLoading} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">PFMEA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Process Failure Mode and Effects Analysis (AIAG-VDA 2019)
          </p>
        </div>
        <Button data-testid="button-generate-pfmea">
          <Plus className="h-4 w-4 mr-2" />
          Generate PFMEA
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Part</CardTitle>
        </CardHeader>
        <CardContent>
          {partsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Select value={selectedPartId || ""} onValueChange={setSelectedPartId}>
              <SelectTrigger data-testid="select-part">
                <SelectValue placeholder="Choose a part..." />
              </SelectTrigger>
              <SelectContent>
                {parts.map((part) => (
                  <SelectItem key={part.id} value={part.id}>
                    {part.partNumber} - {part.partName} ({part.customer})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedPartId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">PFMEAs for {selectedPart?.partNumber}</CardTitle>
            <Button data-testid="button-generate-pfmea">
              <Plus className="h-4 w-4 mr-2" />
              Generate PFMEA
            </Button>
          </CardHeader>
          <CardContent>
            {pfmeasLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : pfmeas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No PFMEAs found for this part. Click "Generate PFMEA" to create one.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Revision</TableHead>
                      <TableHead>Document No.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Effective From</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pfmeas.map((pfmea) => (
                      <TableRow key={pfmea.id} className="hover-elevate" data-testid={`row-pfmea-${pfmea.id}`}>
                        <TableCell className="font-mono font-medium">{pfmea.rev}</TableCell>
                        <TableCell className="font-mono">{pfmea.docNo || "-"}</TableCell>
                        <TableCell>
                          <StatusBadge status={pfmea.status} />
                        </TableCell>
                        <TableCell>
                          {pfmea.effectiveFrom ? new Date(pfmea.effectiveFrom).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPfmeaId(pfmea.id)}
                            data-testid={`button-view-pfmea-${pfmea.id}`}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PFMEADetailView({ pfmea, part, onBack, loading }: {
  pfmea?: PFMEAWithRows;
  part: Part;
  onBack: () => void;
  loading: boolean;
}) {
  if (loading || !pfmea) {
    return (
      <div className="space-y-6">
        <Button variant="outline" size="sm" onClick={onBack} data-testid="button-back">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-12 w-12 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack} data-testid="button-back">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">
            PFMEA: {part.partNumber} Rev {pfmea.rev}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {part.partName} - {part.customer}
          </p>
        </div>
        <StatusBadge status={pfmea.status} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Document No.</p>
            <p className="text-lg font-semibold mt-1">{pfmea.docNo || "N/A"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Effective From</p>
            <p className="text-lg font-semibold mt-1">
              {pfmea.effectiveFrom ? new Date(pfmea.effectiveFrom).toLocaleDateString() : "N/A"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Rows</p>
            <p className="text-lg font-semibold mt-1">{pfmea.rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">High AP Items</p>
            <p className="text-lg font-semibold mt-1 text-destructive">
              {pfmea.rows.filter(r => parseInt(r.ap) >= 100).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">FMEA Rows</CardTitle>
          <Button data-testid="button-add-row">
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : pfmea.rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No FMEA rows yet. Click "Add Row" to create one.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-24">Step</TableHead>
                    <TableHead className="min-w-36">Function</TableHead>
                    <TableHead className="min-w-36">Failure Mode</TableHead>
                    <TableHead className="min-w-36">Effect</TableHead>
                    <TableHead className="min-w-12 text-center">S</TableHead>
                    <TableHead className="min-w-36">Cause</TableHead>
                    <TableHead className="min-w-12 text-center">O</TableHead>
                    <TableHead className="min-w-12 text-center">D</TableHead>
                    <TableHead className="min-w-16 text-center">AP</TableHead>
                    <TableHead className="min-w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pfmea.rows.map((row) => (
                    <TableRow key={row.id} className="hover-elevate" data-testid={`row-fmea-${row.id}`}>
                      <TableCell className="font-mono text-sm">{row.stepRef}</TableCell>
                      <TableCell className="text-sm">{row.function}</TableCell>
                      <TableCell className="text-sm">{row.failureMode}</TableCell>
                      <TableCell className="text-sm">{row.effect}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono">{row.severity}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{row.cause}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono">{row.occurrence}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono">{row.detection}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <APBadge ap={row.ap} />
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" data-testid={`button-edit-row-${row.id}`}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
