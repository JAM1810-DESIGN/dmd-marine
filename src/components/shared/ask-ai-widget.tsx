"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Sparkles, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { askAssistant, type ChatMessage } from "@/app/dashboard/assistant-actions";

export function AskAiWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isPending]);

  function submit() {
    const question = input.trim();
    if (!question || isPending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    startTransition(async () => {
      const result = await askAssistant(next);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: result.reply ?? result.error ?? "Something went wrong." },
      ]);
    });
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 z-50 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-card shadow-lg ring-1 ring-foreground/10">
          <div className="flex items-center justify-between border-b border-border p-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-accent" />
              <p className="text-sm font-medium text-foreground">Ask AI</p>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={() => setOpen(false)}>
              <X className="size-4" />
            </Button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ask how to do something in the app — e.g. &ldquo;How do I set a service price?&rdquo; or
                &ldquo;Where do I assign a consultant?&rdquo;
              </p>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm",
                  message.role === "user"
                    ? "ml-auto bg-accent/15 text-foreground"
                    : "bg-secondary/60 text-foreground",
                )}
              >
                {message.content}
              </div>
            ))}
            {isPending && (
              <div className="max-w-[85%] rounded-xl bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
                Thinking…
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-border p-2">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder="Ask a question..."
              className="h-9"
            />
            <Button size="icon-sm" aria-label="Send" onClick={submit} disabled={isPending || !input.trim()}>
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <Button
        onClick={() => setOpen((value) => !value)}
        aria-label="Ask AI"
        className="fixed bottom-4 right-4 z-50 size-12 rounded-full shadow-lg"
      >
        {open ? <X className="size-5" /> : <Sparkles className="size-5" />}
      </Button>
    </>
  );
}
