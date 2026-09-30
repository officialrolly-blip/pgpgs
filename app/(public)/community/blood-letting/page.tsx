import type { Metadata } from "next";
import PageShell from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Blood Letting Activities",
  description:
    "Blood letting activities of the Pi Gamma Phi Gamma Sigma Roxas City Capiz Chapter.",
  robots: { index: false, follow: true },
};

export default function Page() {
  return <PageShell title="Blood Letting Activities" />;
}
