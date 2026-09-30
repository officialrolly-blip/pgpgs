import type { Metadata } from "next";
import PageShell from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Our Founding Fathers",
  description:
    "The founding fathers of Pi Gamma Phi 1975 Gamma Sigma and the Roxas City Capiz Chapter.",
  robots: { index: false, follow: true },
};

export default function Page() {
  return <PageShell title="Our Founding Fathers" />;
}
