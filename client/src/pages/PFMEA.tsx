import { useState } from "react";
import { FileText, Plus, Search, Filter, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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

//todo: remove mock functionality
const mockPFMEAs = [
  { id: 1, part: "WHL-2024-001", process: "Wheel Assembly", rev: "A", status: "effective" as const, highAP: 3, mediumAP: 8, lowAP: 12 },
  { id: 2, part: "BRK-2024-007", process: "Brake Caliper", rev: "C", status: "review" as const, highAP: 1, mediumAP: 5, lowAP: 15 },
  { id: 3, part: "ENG-2024-012", process: "Engine Mount", rev: "B", status: "draft" as const, highAP: 0, mediumAP: 4, lowAP: 8 },
  { id: 4, part: "SUS-2024-004", process: "Suspension Arm", rev: "A", status: "effective" as const, highAP: 2, mediumAP: 7, lowAP: 14 },
];

export default function PFMEA() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPFMEAs = mockPFMEAs.filter(pfmea => 
    pfmea.part.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pfmea.process.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total PFMEAs</p>
                <p className="text-3xl font-bold mt-1">{mockPFMEAs.length}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Priority</p>
                <p className="text-3xl font-bold mt-1 text-destructive">
                  {mockPFMEAs.reduce((sum, p) => sum + p.highAP, 0)}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Medium Priority</p>
                <p className="text-3xl font-bold mt-1 text-chart-5">
                  {mockPFMEAs.reduce((sum, p) => sum + p.mediumAP, 0)}
                </p>
              </div>
              <Filter className="h-8 w-8 text-chart-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Priority</p>
                <p className="text-3xl font-bold mt-1 text-chart-4">
                  {mockPFMEAs.reduce((sum, p) => sum + p.lowAP, 0)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-chart-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search PFMEAs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-pfmea"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Part Number</TableHead>
                  <TableHead className="font-semibold">Process</TableHead>
                  <TableHead className="font-semibold">Rev</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-center">High AP</TableHead>
                  <TableHead className="font-semibold text-center">Med AP</TableHead>
                  <TableHead className="font-semibold text-center">Low AP</TableHead>
                  <TableHead className="w-24 text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPFMEAs.map((pfmea) => (
                  <TableRow key={pfmea.id} className="hover-elevate" data-testid={`row-pfmea-${pfmea.id}`}>
                    <TableCell className="font-mono font-medium">{pfmea.part}</TableCell>
                    <TableCell>{pfmea.process}</TableCell>
                    <TableCell className="font-mono">{pfmea.rev}</TableCell>
                    <TableCell>
                      <StatusBadge status={pfmea.status} />
                    </TableCell>
                    <TableCell className="text-center">
                      {pfmea.highAP > 0 ? (
                        <Badge variant="destructive" className="font-mono">{pfmea.highAP}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {pfmea.mediumAP > 0 ? (
                        <Badge className="bg-chart-5 text-white font-mono">{pfmea.mediumAP}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {pfmea.lowAP > 0 ? (
                        <Badge className="bg-chart-4 text-white font-mono">{pfmea.lowAP}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" data-testid={`button-view-${pfmea.id}`}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
