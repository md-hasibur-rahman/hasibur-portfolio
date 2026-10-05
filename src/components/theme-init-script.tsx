"use client";

import { useRef } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { themeInitScript } from "@/lib/theme";

// The snippet has to run before first paint (no flash), but a <script> rendered inside the
// component tree gets re-created by React 19 during hydration. useServerInsertedHTML
// flushes it into the head outside the hydratable tree instead; the ref keeps later
// stream flush points from injecting it again.
export function ThemeInitScript() {
  const inserted = useRef(false);

  useServerInsertedHTML(() => {
    if (inserted.current) {
      return null;
    }
    inserted.current = true;
    return <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />;
  });

  return null;
}
