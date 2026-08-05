"use client";

import { Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { useCurrencyOptional } from "./currency-provider";

export type ReportCell = string | number | { phpAmount: number };

function isPhpAmount(cell: ReportCell): cell is { phpAmount: number } {
  return typeof cell === "object" && cell !== null && "phpAmount" in cell;
}

export function ReportTable({
  title,
  columns,
  rows,
  filename,
}: {
  title: string;
  columns: string[];
  rows: ReportCell[][];
  filename: string;
}) {
  const currency = useCurrencyOptional();

  const formatCell = (cell: ReportCell) =>
    isPhpAmount(cell) ? (currency ? currency.format(cell.phpAmount) : String(cell.phpAmount)) : cell;

  function exportCsv() {
    const stringRows = rows.map((row) => row.map((cell) => String(formatCell(cell))));
    downloadCsv(filename, buildCsv(columns, stringRows));
  }

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between p-4">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted-foreground">No data for this period.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col}>{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {row.map((cell, j) => (
                  <TableCell key={j} className={j === 0 ? "font-medium text-foreground" : "text-sm"}>
                    {formatCell(cell)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
