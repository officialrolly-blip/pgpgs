import type { Metadata } from "next";
import Image from "next/image";
import PageShell from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Message of the Chapter President",
};

export default function ChapterPresidentMessagePage() {
  return (
    <PageShell title="Message of the Chapter President">
      <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
        <div className="relative min-h-[360px] overflow-hidden bg-[var(--green-soft)]">
          <Image
            src="https://ik.imagekit.io/pgpgsrcity/samuel-barredo-1787842140661_cErQxtgiV.jpg"
            alt="Newly Elected Chapter President"
            fill
            sizes="(max-width: 1024px) 100vw, 35vw"
            className="object-cover object-top"
          />
        </div>
        <div className="space-y-5 leading-8 text-black/70">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
            Pi Gamma Phi Gamma Sigma Roxas City Capiz Chapter
          </p>
          <p>To our beloved brothers, esteemed alumni, fellow members, and friends in the community,

It is with great humility, gratitude, and a deep sense of responsibility that I accept the honor of serving as the newly elected Chapter President of Pi Gamma Phi Gamma Sigma – Roxas City, Capiz Chapter.</p>
          <p>
            I am truly grateful for the trust and confidence that our brothers have placed in me. I recognize that this position is not simply a title or a position of authority—it is a commitment to serve, to listen, to lead with integrity, and to work together for the continued growth and success of our chapter.

As I begin this new chapter of service, I look forward to building upon the strong foundation established by the leaders and brothers who came before us. Their dedication, sacrifices, and contributions have helped shape our brotherhood into what it is today. We honor their legacy not only by remembering their accomplishments, but by carrying their values forward and continuing the work they started.

Our chapter has tremendous potential. With unity, cooperation, and genuine brotherhood, I believe we can create more meaningful opportunities for fellowship, leadership development, community involvement, and service. I envision a chapter where every brother feels valued, heard, and encouraged to contribute; where our alumni remain an important part of our family; and where our collective efforts extend beyond our brotherhood and create a positive impact in the community.
          </p>
          <p>
            Leadership is never a journey taken alone. I believe that the strength of our chapter comes from every brother who is willing to lend a hand, share an idea, offer guidance, and serve whenever needed. I therefore call upon our brothers, alumni, and friends to continue working with us, supporting one another, and strengthening the bonds that unite us.

Let us make this term a time of renewed fellowship, meaningful service, responsible leadership, and purposeful action. Let us transform our ideas into programs, our plans into accomplishments, and our brotherhood into a force for positive change.

Most importantly, let us continue to live out the principles and values that have united us throughout the years. May we remain brothers not only in name, but in our actions—standing together in times of celebration and difficulty, extending a helping hand to those in need, and inspiring one another to become better leaders and better members of our community.

As we move forward, I ask for your cooperation, your support, and most importantly, your unity. Together, we can strengthen the Pi Gamma Phi Gamma Sigma Roxas City, Capiz Chapter and leave a legacy that future generations of brothers will be proud to inherit.

May our brotherhood continue to grow stronger, our service become more meaningful, and our commitment to our community become even greater.
          </p>
          <p className="pt-3 font-serif text-2xl font-semibold text-[var(--green-dark)]">
            One Brotherhood. One Purpose. One Commitment to Service.
            <br />
            The Newly Elected Chapter President
            Brod. Samuel E. Barredo
Pi Gamma Phi Gamma Sigma
Roxas City, Capiz Chapter
          </p>
        </div>
      </div>
    </PageShell>
  );
}