import type { Metadata } from "next";
import KnyteChat from "./knyte-chat";

export const metadata: Metadata = {
  title: "Knyte AI Assistant | PGPGS",
  description: "Your friendly AI assistant and study buddy for Pi Gamma Phi Gamma Sigma. Get help with the brotherhood, member verification, homework and assignments, and more.",
};

export default function KnytePage() {
  return <KnyteChat />;
}