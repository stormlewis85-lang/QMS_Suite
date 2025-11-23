import { useState } from "react";
import { Package, Plus, Search, FileText, Download } from "lucide-react";
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

//todo: remove mock functionality
const mockParts = [
  { id: 1, partNumber: "WHL-2024-001", name: "Wheel Assembly", customer: "Ford", program: "F-150", plant: "Detroit", status: "effective" as const },
  { id: 2, partNumber: "BRK-2024-007", name: "Brake Caliper", customer: "GM", program: "Silverado", plant: "Arlington", status: "review" as const },
  { id: 3, partNumber: "ENG-2024-012", name: "Engine Mount", customer: "Tesla", program: "Model Y", plant: "Austin", status: "draft" as const },
  { id: 4, partNumber: "SUS-2024-004", name: "Suspension Arm", customer: "Ford", program: "Mustang", plant: "Flat Rock", status: "effective" as const },
  { id: 5, partNumber: "TRN-2024-009", name: "Transmission Case", customer: "GM", program: "Corvette", plant: "Bowling Green", status: "effective" as const },
];

export default function Parts() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredParts = mockParts.filter(part => 
    part.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.customer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Parts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage customer parts and their process documentation
          </p>
        </div>
        <Button data-testid="button-new-part">
          <Plus className="h-4 w-4 mr-2" />
          New Part
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by part number, name, or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-parts"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input type="checkbox" className="rounded" data-testid="checkbox-select-all" />
                  </TableHead>
                  <TableHead className="font-semibold">Part Number</TableHead>
                  <TableHead className="font-semibold">Part Name</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Program</TableHead>
                  <TableHead className="font-semibold">Plant</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="w-24 text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.map((part) => (
                  <TableRow key={part.id} className="hover-elevate" data-testid={`row-part-${part.id}`}>
                    <TableCell>
                      <input type="checkbox" className="rounded" />
                    </TableCell>
                    <TableCell className="font-mono font-medium">{part.partNumber}</TableCell>
                    <TableCell>{part.name}</TableCell>
                    <TableCell>{part.customer}</TableCell>
                    <TableCell>{part.program}</TableCell>
                    <TableCell>{part.plant}</TableCell>
                    <TableCell>
                      <StatusBadge status={part.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" data-testid={`button-view-${part.id}`}>
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" data-testid={`button-download-${part.id}`}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredParts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No parts found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting your search or create a new part.
              </p>
              <Button data-testid="button-create-first-part">
                <Plus className="h-4 w-4 mr-2" />
                Create First Part
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
