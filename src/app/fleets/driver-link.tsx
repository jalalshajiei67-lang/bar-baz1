"use client";

import { useState } from "react";

/**
 * The only place a fleet's link exists, now that the picker is gone. The admin
 * sends it to the driver once and the driver bookmarks it.
 *
 * The absolute URL is built in the browser rather than on the server, so it is
 * right on localhost and on the deployed domain without any configuration.
 */
export function DriverLink({ fleetId }: { fleetId: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/fleet/${fleetId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard is blocked without https or permission; show it to be copied by hand.
      window.prompt("لینک راننده:", url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-lg border border-black/15 px-2 py-1 text-xs whitespace-nowrap transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
    >
      {copied ? "کپی شد ✓" : "کپی لینک راننده"}
    </button>
  );
}
