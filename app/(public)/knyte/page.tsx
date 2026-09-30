import type { Metadata } from "next";
import KnyteChat from "./knyte-chat";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Knyte AI Assistant",
  description:
    "Your friendly AI assistant for Pi Gamma Phi Gamma Sigma. Get help with the brotherhood, member verification, homework, and more.",
  path: "/knyte",
});

export default function KnytePage() {
  return <KnyteChat />;
}