import type { Metadata } from "next";
import Image from "next/image";
import PageShell from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Pi Gamma Phi Gamma Sigma History",
  description:
    "Learn the history of Pi Gamma Phi 1975 Gamma Sigma, founded by Ysmael Ulanday, Enrique Gomez, and Henry Pesimo, and discover its principles of Lux, Bonitas, and Unitas.",
  keywords: [
    "Pi Gamma Phi history",
    "Gamma Sigma 1975",
    "Pi Gamma Phi founding fathers",
    "Lux Bonitas Unitas",
  ],
};

export default function Page() {
  return (
    <PageShell title="Pi Gamma Phi Gamma Sigma History">
      <article className="max-w-4xl text-[1.05rem] leading-8 text-black/75">
        <figure className="float-right mb-8 ml-8 mt-1 w-44 sm:w-60">
          <div className="border border-[var(--gold)]/40 bg-[var(--green-soft)] p-3 shadow-[0_12px_28px_rgba(15,61,38,0.1)] sm:p-5">
            <Image
              src="/pgpgs.webp"
              alt="Official Pi Gamma Phi 1975 Gamma Sigma logo"
              width={650}
              height={650}
              sizes="(max-width: 640px) 176px, 240px"
              className="h-auto w-full"
            />
          </div>
          <figcaption className="mt-3 text-center text-xs uppercase leading-5 tracking-[0.14em] text-[var(--green)]">
            Pi Gamma Phi 1975
            <br />
            Gamma Sigma
          </figcaption>
        </figure>

        <p className="mb-6 first-letter:float-left first-letter:mr-2 first-letter:font-serif first-letter:text-7xl first-letter:font-semibold first-letter:leading-[0.75] first-letter:text-[var(--green)]">
          It was established by three founding fathers namely; lord Ysmael
          “Leamsy” Ulanday, lord Enrique “Eric” Gomez and lord Henry Pesimo. The
          founders made an agreement to call every member of <strong>Pi Gamma Phi</strong> as
          <strong> GAMMA SIGMA</strong> means brothers and sisters in PI GAMMA PHI.
        </p>

        <p className="mb-6">
          Together with active founding father Henry Pesimo with the support of
          some of his batchmates, elders, and representatives from Luzon,
          Visayas, Mindanao, the <strong>CONSEJO NACIONAL INTERNATIONAL</strong> emerged.
          The <strong>Pi Gamma Phi (ΓΣ) Consejo Nacional International Incorporated</strong>
          was designed in order to form a centralized system as the overall
          governing body of PI GAMMA PHI 1975. It is the only council approved
          and was created together with active founding father Henry Pesimo,
          registered with the Securities and Exchange Commission with
          Registration Number CN201823947.
        </p>

        <h2 className="mt-14 border-t border-[var(--gold)]/40 pt-8 font-serif text-4xl font-semibold leading-tight text-[var(--green-dark)]">
          Brief History
        </h2>
        <p className="mt-5">
          PI GAMMA PHI 1975 (Gamma Sigma) International Fraternity and Sorority
          came from the combined ideas of the three founding fathers who were
          former members of other fraternities.
        </p>

        <div className="my-8 grid gap-px bg-[var(--gold)]/30 sm:grid-cols-3">
          <div className="bg-[var(--green-soft)] p-5">
            <p className="font-serif text-3xl font-semibold text-[var(--green-dark)]">PI</p>
            <p className="mt-2 text-sm leading-6">Came from founder Ysmael Ulanday, a former member of Pi Beta.</p>
          </div>
          <div className="bg-[var(--green-soft)] p-5">
            <p className="font-serif text-3xl font-semibold text-[var(--green-dark)]">GAMMA</p>
            <p className="mt-2 text-sm leading-6">Came from founder Enrique Gomez, a former member of Tau Gamma Phi.</p>
          </div>
          <div className="bg-[var(--green-soft)] p-5">
            <p className="font-serif text-3xl font-semibold text-[var(--green-dark)]">PHI</p>
            <p className="mt-2 text-sm leading-6">Came from founder Henry Pesimo, a former member of Delta Phi Omega.</p>
          </div>
        </div>

        <p className="mb-6">
          Before they created and formed PI GAMMA PHI (Gamma Sigma) 1975, they
          made an agreement to quit or dismember themselves from their former
          fraternities. Therefore, PI GAMMA PHI (GAMMA SIGMA) 1975 has no
          relation or affiliation to their former fraternities.
        </p>
        <p className="mb-6">
          Pi Gamma Phi has its own unique identity and characteristic embodied
          by the ideals of the three Founding Fathers where they used
          <strong> GAMMA SIGMA</strong> as the name of the individual member of Pi Gamma
          Phi. The Fraternity/Sorority name is <strong>PI GAMMA PHI</strong> and the member’s
          name is <strong>GAMMA SIGMA</strong>. To assure that the member is truly legitimate,
          the founders created only one password.
        </p>
        <p className="mb-6">
          Furthermore, active Founding Father Henry Pesimo added that the two
          Greek words <strong>GAMMA SIGMA</strong> created by the three founders serve as a
          code to recognize a true member of Pi Gamma Phi.
        </p>
        <p className="mb-6">
          From Francisco College “Kiko”, the group rapidly increased its
          population with enormous strength in and outside the school. More
          chapters were then established in many colleges, universities,
          communities, and barangays. The group did not stay only in Metro
          Manila but went across Visayas, Mindanao, and even abroad. Currently,
          Pi Gamma Phi continues to grow stronger and has made a name for itself
          as one of the top fraternities and sororities in the Philippines.
        </p>
        <p>
          Pi Gamma Phi established a good reputation throughout the country
          from its good deeds, following the vision based on the letter by
          capital of the tenets of PI GAMMA PHI 1975 GAMMA SIGMA. The
          organization has seven top priorities and core values that inspire
          members to do good. In addition, PI GAMMA PHI has twelve Golden Rules
          that serve as its fundamental rules.
        </p>

        <div className="my-14 grid gap-8 border-y border-[var(--gold)]/50 py-10 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">Aim</p>
            <p className="mt-3 font-serif text-2xl font-semibold leading-tight text-[var(--green-dark)]">
              “To Promote Brotherhood/Sisterhood and Unity with Others.”
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">Motto</p>
            <p className="mt-3 font-serif text-2xl font-semibold leading-tight text-[var(--green-dark)]">
              “Cooperation, do or die; we’ll stand united forever.”
            </p>
          </div>
        </div>

        <h2 className="font-serif text-4xl font-semibold leading-tight text-[var(--green-dark)]">
          Fraternal Principles
        </h2>
        <div className="mt-5 border-l-4 border-[var(--gold)] pl-6">
          <h3 className="font-serif text-3xl font-semibold text-[var(--green-dark)]">LUX</h3>
          <p className="mt-3">
            Light from God, the Ultimate Creator of all being, space, and
            existence, was innate in the individual human being from the moment
            of conception. The Light or Spirit of every member of Pi Gamma Phi
            1975 Gamma Sigma that dwells within forces each member to do good,
            like the burning fire that serves as light during darkness. Amidst
            diversity, the Light within encourages every member to promote
            brotherhood, sisterhood, and unity with others. The same Light
            illumines every member’s heart as the prime mover to love and
            minister to fellow brothers, sisters, and other people outside the
            vicinity of PI GAMMA PHI 1975 GAMMA SIGMA. As long as there is Light,
            Pi Gamma Phi 1975 Gamma Sigma will never demise.
          </p>
        </div>

        <div className="mt-10 border-l-4 border-[var(--gold)] pl-6">
          <h3 className="font-serif text-3xl font-semibold text-[var(--green-dark)]">BONITAS</h3>
          <p className="mt-3">
            Pi Gamma Phi 1975 Gamma Sigma tolerates good, not evil. Goodness
            means sharing what members have with their fellow members: talents,
            skills, knowledge, service, time, spirituality, ideas, resources,
            presence, or anything that could benefit needy brothers and sisters
            and better the entire Fraternity/Sorority. It is the inner goodness
            that drives PI GAMMA PHI 1975 Gamma Sigma to become an instrument of
            leadership and morality in society.
          </p>
        </div>

        <div className="mt-10 border-l-4 border-[var(--gold)] pl-6">
          <h3 className="font-serif text-3xl font-semibold text-[var(--green-dark)]">UNITAS</h3>
          <p className="mt-3">
            Together with one heart and mind, members unite themselves to
            commit and dedicate their lives for the good of their brothers and
            sisters and to other people. God Bless! PI GAMMA PHI 1975 GAMMA
            SIGMA.
          </p>
        </div>

        <div className="mt-14 bg-[var(--green-dark)] px-6 py-8 text-white sm:px-10 sm:py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--gold-light)]">
            Pi Gamma Phi Way of Life
          </p>
          <p className="mt-5 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
            “Service to humanity, service to environment, service to the poor
            and needy.”
          </p>
          <p className="mt-6 text-sm text-white/60">
            Source: Primary and direct source according to the Founders and
            Batch 1975.
          </p>
        </div>
      </article>
    </PageShell>
  );
}
