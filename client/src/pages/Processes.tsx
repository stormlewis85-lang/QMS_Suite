import { useState } from "react";
import { Layers, Plus, Search, Eye, Copy, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";

//todo: remove mock functionality
const mockProcesses = [
  { id: 1, name: "Wheel Assembly", rev: "A", status: "effective" as const, steps: 8, effectiveDate: "2024-01-15" },
  { id: 2, name: "Brake Caliper Machining", rev: "C", status: "effective" as const, steps: 12, effectiveDate: "2023-11-20" },
  { id: 3, name: "Engine Mount Welding", rev: "B", status: "review" as const, steps: 6, effectiveDate: null },
  { id: 4, name: "Suspension Arm Forming", rev: "A", status: "draft" as const, steps: 10, effectiveDate: null },
  { id: 5, name: "Transmission Case Casting", rev: "D", status: "effective" as const, steps: 15, effectiveDate: "2023-09-10" },
  { id: 6, name: "Paint Application", rev: "A", status: "effective" as const, steps: 7, effectiveDate: "2024-02-01" },
];

export default function Processes() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProcesses = mockProcesses.filter(process => 
    process.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    process.rev.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Process Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manufacturing process definitions with version control
          </p>
        </div>
        <Button data-testid="button-new-process">
          <Plus className="h-4 w-4 mr-2" />
          New Process
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search processes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-processes"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredProcesses.map((process) => (
          <Card key={process.id} className="hover-elevate" data-testid={`card-process-${process.id}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                  <Layers className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-medium leading-none">{process.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">Rev {process.rev}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <StatusBadge status={process.status} />
                <Badge variant="secondary" className="text-xs">
                  {process.steps} steps
                </Badge>
              </div>
              
              {process.effectiveDate && (
                <div className="text-xs text-muted-foreground">
                  Effective: {new Date(process.effectiveDate).toLocaleDateString()}
                </div>
              )}
              
              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" data-testid={`button-view-${process.id}`}>
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button variant="outline" size="icon" data-testid={`button-edit-${process.id}`}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" data-testid={`button-copy-${process.id}`}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProcesses.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Layers className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No processes found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your search or create a new process.
            </p>
            <Button data-testid="button-create-first-process">
              <Plus className="h-4 w-4 mr-2" />
              Create First Process
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
