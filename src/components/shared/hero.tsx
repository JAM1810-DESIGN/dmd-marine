"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6 lg:px-8">
      <motion.span
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-full bg-secondary px-3 py-1 text-xs font-medium tracking-wide text-navy uppercase"
      >
        Independent Marine Consultancy
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="max-w-3xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl"
      >
        Professional Marine Consultancy You Can Trust
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="max-w-2xl text-lg text-muted-foreground"
      >
        Providing reliable marine consultation, surveys, inspections, and maritime
        mentoring services with professionalism and international standards.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <Button
          size="lg"
          nativeButton={false}
          className="bg-gold text-navy hover:bg-gold/90"
          render={<Link href="/book-consultation">Book Consultation</Link>}
        />
        <Button
          size="lg"
          variant="outline"
          nativeButton={false}
          className="border-navy/20 text-navy hover:bg-navy/5"
          render={<Link href="/contact">Request Quote</Link>}
        />
      </motion.div>
    </section>
  );
}
