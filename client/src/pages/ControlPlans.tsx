import { useState } from "react";
import { BookOpen, Plus, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
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
const mockControlPlans = [
  { id: 1, part: "WHL-2024-001", rev: "A", status: "effective" as const, characteristics: 15, specialChars: 3 },
  { id: 2, part: "BRK-2024-007", rev: "C", status: "review" as const, characteristics: 22, specialChars: 5 },
  { id: 3, part: "ENG-2024-012", rev: "B", status: "draft" as const, characteristics: 12, specialChars: 2 },
  { id: 4, part: "SUS-2024-004", rev: "A", status: "effective" as const, characteristics: 18, specialChars: 4 },
];

export default function ControlPlans() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPlans = mockControlPlans.filter(plan => 
    plan.part.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Control Plans</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quality control plans with inspection characteristics
          </p>
        </div>
        <Button data-testid="button-generate-control-plan">
          <Plus className="h-4 w-4 mr-2" />
          Generate Control Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Plans</p>
                <p className="text-3xl font-bold mt-1">{mockControlPlans.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Characteristics</p>
                <p className="text-3xl font-bold mt-1">
                  {mockControlPlans.reduce((sum, p) => sum + p.characteristics, 0)}
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">Total</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Special Chars</p>
                <p className="text-3xl font-bold mt-1 text-chart-5">
                  {mockControlPlans.reduce((sum, p) => sum + p.specialChars, 0)}
                </p>
              </div>
              <Badge className="bg-chart-5 text-white text-xs">Critical</Badge>
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
                placeholder="Search control plans..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-control-plans"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Part Number</TableHead>
                  <TableHead className="font-semibold">Rev</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-center">Characteristics</TableHead>
                  <TableHead className="font-semibold text-center">Special Chars</TableHead>
                  <TableHead className="w-24 text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.map((plan) => (
                  <TableRow key={plan.id} className="hover-elevate" data-testid={`row-control-plan-${plan.id}`}>
                    <TableCell className="font-mono font-medium">{plan.part}</TableCell>
                    <TableCell className="font-mono">{plan.rev}</TableCell>
                    <TableCell>
                      <StatusBadge status={plan.status} />
                    </TableCell>
                    <TableCell className="text-center font-mono">{plan.characteristics}</TableCell>
                    <TableCell className="text-center">
                      {plan.specialChars > 0 ? (
                        <Badge className="bg-chart-5 text-white font-mono">{plan.specialChars}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" data-testid={`button-view-${plan.id}`}>
                          View
                        </Button>
                        <Button variant="ghost" size="icon" data-testid={`button-download-${plan.id}`}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
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
