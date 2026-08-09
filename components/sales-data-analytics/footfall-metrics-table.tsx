import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatCount(value: number) {
  return value.toLocaleString("en-IN");
}

export function FootfallMetricsTable({
  data,
  labelHeader,
}: {
  data: Array<{ label: string; count: number }>;
  labelHeader: string;
}) {
  const total = data.reduce((sum, row) => sum + row.count, 0);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{labelHeader}</TableHead>
          <TableHead className="text-right">Footfall</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={2} className="text-center text-muted-foreground">
              No data for this range.
            </TableCell>
          </TableRow>
        ) : (
          data.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCount(row.count)}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
      {data.length > 0 ? (
        <TableFooter>
          <TableRow>
            <TableCell className="font-medium">Total</TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {formatCount(total)}
            </TableCell>
          </TableRow>
        </TableFooter>
      ) : null}
    </Table>
  );
}
