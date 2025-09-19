'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CookieIcon } from "lucide-react";
import { PreferencesDialog } from "./PreferencesDialog";

export function ConsentManagerTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="secondary"
        size="icon"
        className="fixed bottom-4 right-4 rounded-full shadow-lg z-50 h-12 w-12"
        onClick={() => setOpen(true)}
      >
        <CookieIcon className="h-6 w-6" />
      </Button>

      <PreferencesDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
