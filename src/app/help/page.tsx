import { AppShell } from "@/components/layout/app-shell";
import { HelpBook } from "./help-book";

export const dynamic = "force-dynamic";

export default function HelpPage() {
  return (
    <AppShell>
      <HelpBook />
    </AppShell>
  );
}
