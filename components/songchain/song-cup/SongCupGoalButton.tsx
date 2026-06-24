import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type SongCupGoalButtonProps = {
  label: string;
  className?: string;
  onClick?: () => void;
} & ({ href: string } | { href?: never; onClick: () => void });

const buttonClassName =
  "group relative inline-flex shrink-0 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF66CC] focus-visible:ring-offset-2 focus-visible:ring-offset-black";

function SongCupGoalButtonContent({ label }: { label: string }) {
  return (
    <>
      <Image
        src="/songchain/button.svg"
        alt=""
        width={296}
        height={129}
        className="h-auto w-[clamp(120px,38vw,330px)] object-contain"
        aria-hidden
      />
      <span className="absolute left-[10.1%] top-[10.9%] flex h-[53.5%] w-[79.7%] items-center justify-center text-[clamp(11px,3vw,24px)] font-bold uppercase tracking-wide text-black">
        {label}
      </span>
    </>
  );
}

export function SongCupGoalButton({ label, className, href, onClick }: SongCupGoalButtonProps) {
  if (href) {
    return (
      <Link href={href} onClick={onClick} className={cn(buttonClassName, className)}>
        <SongCupGoalButtonContent label={label} />
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cn(buttonClassName, className)}>
      <SongCupGoalButtonContent label={label} />
    </button>
  );
}
