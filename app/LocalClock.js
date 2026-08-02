"use client";

import { useEffect, useState } from "react";
import { formatLocalDateTime } from "@/lib/snapshotTime";

/** Renders after mount so Vercel UTC SSR never disagrees with the viewer's zone. */
export default function LocalClock({ value, fallback = "—" }) {
  const [text, setText] = useState(fallback);
  useEffect(() => {
    setText(formatLocalDateTime(value) || fallback);
  }, [value, fallback]);
  return <span suppressHydrationWarning>{text}</span>;
}
