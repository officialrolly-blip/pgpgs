import type { Metadata } from "next";
import PageShell from "@/components/page-shell";

export const metadata: Metadata = { title: "Be one of us" };

export default function JoinPage() {
  return (
    <PageShell title="Be one of us!">
      <p>
        Membership inquiries for the Roxas City Capiz Chapter will be available
        here.
      </p>
    </PageShell>
  );
}
