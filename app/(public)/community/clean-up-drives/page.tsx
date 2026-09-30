import type { Metadata } from "next";
import PageShell from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Clean Up Drives",
  description:
    "Community clean-up drives of the Pi Gamma Phi Gamma Sigma Roxas City Capiz Chapter.",
  robots: { index: false, follow: true },
};

export default function Page() {
  return <PageShell title="Clean Up Drives" />;
}
