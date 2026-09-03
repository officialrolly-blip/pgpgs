import type { Metadata } from "next";
import PageShell from "@/components/page-shell";
import ChapterRegistrationForm from "../chapter-registration-form";

export const metadata: Metadata = {
  title: "Register a Chapter",
};

export default function RegisterChapterPage() {
  return (
    <PageShell title="Register a Chapter">
      <p className="max-w-2xl text-sm leading-6 text-black/65">
        Fill out the form below to register a new PGPGS chapter. The council will
        review the submission before publishing it.
      </p>

      <div className="mt-8">
        <ChapterRegistrationForm />
      </div>
    </PageShell>
  );
}
