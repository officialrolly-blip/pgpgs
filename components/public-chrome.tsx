"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/footer";
import Header from "@/components/header";
import KnyteChatbot from "@/components/knyte-chatbot";
import type { ReactNode } from "react";

export default function PublicChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isStatusPage = pathname === "/join/status";
  const isMemberIdPage = pathname === "/member-id";
  if (isStatusPage || isMemberIdPage) return <>{children}</>;
  return (
    <>
      <Header />
      {children}
      <Footer />
      <KnyteChatbot />
    </>
  );
}
