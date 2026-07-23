"use client";

import Link from "next/link";
import { useState } from "react";
import { Anchor, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/projects", label: "Projects" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-navy/10 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-navy">
          <Anchor className="size-6 text-gold" aria-hidden />
          <span className="font-heading text-base font-semibold tracking-tight">
            DMD Marine
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-navy/70 transition-colors hover:text-navy"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button
            variant="outline"
            nativeButton={false}
            className="border-navy/20 text-navy hover:bg-navy/5"
            render={<Link href="/contact">Request Quote</Link>}
          />
          <Button
            nativeButton={false}
            className="bg-gold text-navy hover:bg-gold/90"
            render={<Link href="/book-consultation">Book Consultation</Link>}
          />
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            }
          />
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>DMD Marine</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-2 text-sm font-medium text-navy/80 hover:bg-navy/5 hover:text-navy"
                >
                  {link.label}
                </Link>
              ))}
              <Button
                nativeButton={false}
                className="mt-2 bg-gold text-navy hover:bg-gold/90"
                render={
                  <Link href="/book-consultation" onClick={() => setOpen(false)}>
                    Book Consultation
                  </Link>
                }
              />
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
