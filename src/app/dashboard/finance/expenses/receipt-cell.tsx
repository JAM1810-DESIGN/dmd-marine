"use client";

import { useRef, useTransition } from "react";
import { Paperclip, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { uploadExpenseReceipt } from "./actions";

type ReceiptRow = { id: string; fileName: string; url: string };

export function ReceiptCell({
  expenseId,
  receipts,
  storageConfigured,
}: {
  expenseId: string;
  receipts: ReceiptRow[];
  storageConfigured: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadExpenseReceipt(expenseId, {}, formData);
      if (result.error) {
        notify.error(result.error);
        return;
      }
      notify.success("Receipt uploaded");
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="flex items-center gap-1">
      {receipts.map((receipt) => (
        <a
          key={receipt.id}
          href={receipt.url}
          target="_blank"
          rel="noreferrer"
          aria-label={receipt.fileName}
          className="text-muted-foreground hover:text-foreground"
        >
          <Paperclip className="size-4" />
        </a>
      ))}
      {storageConfigured && (
        <>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            id={`receipt-${expenseId}`}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isPending}
            aria-label="Upload receipt"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}
