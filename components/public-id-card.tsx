import Image from "next/image";

export type PublicIdMember = {
  id: string;
  memberId: string;
  fullName: string;
  status: string;
  chapter: string;
  dateOfBirth: string;
  placeOfBirth: string;
  address: string;
  dateSurvived: string;
  baptizedName: string;
  photoUrl: string | null;
  hasPhoto: boolean;
  guardianName: string;
  guardianAddress: string;
  guardianContact: string;
  contactNumber: string;
  qrCode: string;
};

const GREEN_DARK = "#0f3d26";
const GREEN = "#1b5c38";
const GOLD = "#e8c96a";

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0]!)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function DetailCard({
  label,
  value,
  large,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div className="px-1 py-1">
      <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#8a7b52]">
        {label}
      </p>
      {large ? (
        <p
          className="text-[13px] font-bold uppercase leading-tight"
          style={{ color: GREEN_DARK }}
        >
          {value}
        </p>
      ) : (
        <p className="text-[10px] font-semibold leading-tight text-[#1c2c22]">
          {value}
        </p>
      )}
    </div>
  );
}

export function PublicIdCardFront({ member }: { member: PublicIdMember }) {
  return (
    <div className="flex h-full flex-col" style={{ color: GREEN_DARK }}>
      <header
        className="relative z-10 flex h-[56px] shrink-0 items-center pl-3 pr-4"
        style={{ background: `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN})` }}
      >
        <Image
          src="/logo2.png"
          alt="Pi Gamma Phi Gamma Sigma logo"
          width={360}
          height={80}
          className="h-[44px] w-[280px] object-contain"
        />
      </header>
      <div className="watermark-container pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <Image
          src="/LOGOS.png"
          alt=""
          width={400}
          height={400}
          unoptimized
          className="w-1/2 object-contain opacity-[0.08]"
        />
      </div>
      <div className="relative z-10 flex flex-1 gap-3 px-3 py-2">
        <div className="flex shrink-0 flex-col items-center gap-1">
          {member.hasPhoto && member.photoUrl ? (
            <Image
              src={member.photoUrl}
              unoptimized
              width={192}
              height={256}
              alt=""
              className="h-[140px] w-[110px] rounded-[8px] border-2 border-[#e0d6bf] bg-white object-cover object-top shadow-[0_2px_6px_rgba(15,61,38,0.12)]"
              style={{ objectPosition: "center 15%" }}
            />
          ) : (
            <div
              className="flex h-[140px] w-[110px] items-center justify-center rounded-[8px] border-2 border-[#e0d6bf] text-3xl font-bold shadow-[0_2px_6px_rgba(15,61,38,0.12)]"
              style={{ background: "#e7f0ea", color: GREEN }}
            >
              {initialsOf(member.fullName)}
            </div>
          )}
          <span className="text-[7px] font-semibold uppercase tracking-[0.1em] text-[#8a7b52]">
            Member photo
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <DetailCard label="Full name" value={member.fullName} large />
          <div className="grid grid-cols-2 gap-1.5">
            <DetailCard label="Date of birth" value={member.dateOfBirth} />
            <DetailCard label="Place of birth" value={member.placeOfBirth} />
          </div>
          <div className="flex-1">
            <DetailCard label="Complete address" value={member.address} />
          </div>
        </div>
      </div>
      <footer
        className="relative z-10 flex h-[28px] shrink-0 items-center justify-between px-3"
        style={{ background: `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN})` }}
      >
        <p
          className="text-[8px] font-bold uppercase tracking-[0.14em]"
          style={{ color: GOLD }}
        >
          PGPGS Membership ID number
        </p>
        <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.06em] text-white">
          {member.memberId}
        </p>
      </footer>
    </div>
  );
}


export function PublicIdCardBack({ member }: { member: PublicIdMember }) {
  return (
    <div className="flex h-full flex-col" style={{ color: GREEN_DARK }}>
      <header
        className="relative z-10 flex h-[36px] shrink-0 items-center gap-2 px-3"
        style={{ background: `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN})` }}
      >
        <p className="min-w-0 text-[9px] font-bold uppercase leading-tight tracking-[0.18em] text-white">
          In case of <span style={{ color: GOLD }}>emergency</span>
        </p>
        <div className="ml-auto h-7 w-7 shrink-0 rounded-full bg-white/15 p-0.5">
          <Image
            src="/logo2.png"
            alt="PGPGS"
            width={36}
            height={36}
            className="h-full w-full object-contain"
          />
        </div>
      </header>
      <div
        className="watermark-container pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        {[...Array(12)].map((_, row) => (
          <div
            key={row}
            className="absolute flex justify-around"
            style={{
              top: row * 32 - 32,
              left: "-8%",
              right: "-8%",
              transform: `translateX(${row % 2 === 0 ? 0 : -26}px)`,
            }}
          >
            {[...Array(11)].map((_, col) => (
              <span
                key={col}
                className="select-none font-bold uppercase tracking-[0.14em] text-[#1b5c38]"
                style={{
                  fontSize: "10px",
                  opacity: 0.06,
                  transform: "rotate(80deg)",
                  transformOrigin: "center center",
                  whiteSpace: "nowrap",
                }}
              >
                PGPGS
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="relative z-10 flex flex-1 gap-2 px-3 py-2">
        <div className="flex min-w-0 flex-[2] flex-col gap-1.5">
          <div className="px-1 py-1">
            <p className="text-[7px] font-bold uppercase tracking-[0.16em] text-[#8a7b52]">
              Emergency Contact Details
            </p>
            <p
              className="mt-0.5 text-[10px] font-bold uppercase leading-3.5"
              style={{ color: GREEN_DARK }}
            >
              {member.guardianName}
            </p>
            <p className="mt-0.5 text-[8px] leading-3.5 text-[#37473c]">
              {member.guardianAddress}
            </p>
            <p
              className="mt-0.5 font-mono text-[11px] font-bold tracking-[0.04em]"
              style={{ color: GREEN }}
            >
              {member.guardianContact}
            </p>
          </div>
          <div className="flex-1 px-1 py-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-[#8a7b52]">
                  Chapter
                </p>
                <p className="text-[9px] font-semibold leading-tight text-[#1c2c22]">
                  {member.chapter}
                </p>
              </div>
              <div className="min-w-0 text-right">
                <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-[#8a7b52]">
                  Member Contact
                </p>
                <p className="font-mono text-[9px] font-semibold text-[#1c2c22]">
                  {member.contactNumber}
                </p>
              </div>
            </div>
            <div className="mt-1.5 pt-1.5">
              <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-[#8a7b52]">
                Date Survive
              </p>
              <p className="font-mono text-[9px] font-semibold text-[#1c2c22]">
                {member.dateSurvived}
              </p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center justify-center gap-2">
          <Image
            src={member.qrCode}
            alt="Scan to verify membership"
            width={130}
            height={130}
            unoptimized
            className="h-[130px] w-[130px] object-contain"
          />
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8a7b52]">
            Scan to verify
          </p>
        </div>
      </div>
      <footer
        className="relative z-10 flex h-[24px] shrink-0 items-center justify-center px-3"
        style={{ background: `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN})` }}
      >
        <p
          className="text-center text-[7px] font-bold uppercase leading-tight tracking-[0.18em]"
          style={{ color: GOLD }}
        >
          Pi Gamma Phi 1975 Gamma Sigma · Roxas City Capiz Chapter
        </p>
      </footer>
    </div>
  );
}
