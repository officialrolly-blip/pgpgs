import type { Metadata } from "next";
import KnyteChat from "./knyte-chat";

export const metadata: Metadata = {
  title: "Knyte AI Assistant | PGPGS",
  description: "Your friendly AI assistant for Pi Gamma Phi Gamma Sigma. Get help with anything about the brotherhood, member verification, and more.",
};

export default function KnytePage() {
  return <KnyteChat />;
}