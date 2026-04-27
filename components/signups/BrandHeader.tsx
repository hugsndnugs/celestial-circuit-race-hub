import Image from "next/image";
import Link from "next/link";
import logo from "@/app/celestial_circuit_logo.png";

type BrandHeaderProps = {
  title?: string;
};

export function BrandHeader({ title = "Team signup" }: BrandHeaderProps) {
  return (
    <header className="brand-header">
      <Link href="/signups" className="brand-link">
        <Image src={logo} alt="Celestial Circuit logo" className="brand-logo" priority />
        <div className="flex flex-col leading-tight">
          <span className="brand-name">Team Signup</span>
          <span className="brand-subtitle">{title}</span>
        </div>
      </Link>
    </header>
  );
}
