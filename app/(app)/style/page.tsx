import { WinLossChart } from "@/components/charts";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StatusVariant } from "@/lib/constants";

const VARIANTS: StatusVariant[] = ["success", "warning", "danger", "info", "neutral"];
const SAMPLE_LABEL: Record<StatusVariant, string> = {
  success: "Covered / approved / won",
  warning: "Partly covered / pending / due soon",
  danger: "No cover / overdue / lost / expired",
  info: "Submitted / in progress / in transit",
  neutral: "Closed / cancelled / not pursued",
};

export default function StyleGuidePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Style guide</h1>
      <p className="text-sm text-muted-foreground">
        The design system from docs/DESIGN.md, rendered in both themes. Toggle the theme in the
        top bar. Components reference semantic tokens only — no raw hex outside globals.css.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inputs</CardTitle>
        </CardHeader>
        <CardContent className="grid max-w-md gap-3">
          <div className="space-y-1">
            <Label>Reference</Label>
            <Input placeholder="REQ-2026-013" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status badges — icon + label + colour</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {VARIANTS.map((variant) => (
            <StatusBadge key={variant} variant={variant} label={SAMPLE_LABEL[variant]} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Table with tabular figures</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead>State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">PN-1001</TableCell>
                <TableCell className="text-right tabular-nums">1,000</TableCell>
                <TableCell className="text-right tabular-nums">42,000</TableCell>
                <TableCell>
                  <StatusBadge variant="success" label="Covered" />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">PN-2002</TableCell>
                <TableCell className="text-right tabular-nums">500</TableCell>
                <TableCell className="text-right tabular-nums">51,000</TableCell>
                <TableCell>
                  <StatusBadge variant="warning" label="Partly covered" />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chart (Recharts, token colours)</CardTitle>
        </CardHeader>
        <CardContent>
          <WinLossChart
            data={[
              { month: "Aug 2026", won: 1, lost: 1 },
              { month: "Sep 2026", won: 1, lost: 1 },
              { month: "Oct 2026", won: 0, lost: 1 },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
