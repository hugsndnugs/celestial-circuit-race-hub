import Link from "next/link";

type BrandHeaderProps = {
  title?: string;
  clickable?: boolean;
  centered?: boolean;
};

export function BrandHeader({ title, clickable = true, centered = false }: Readonly<BrandHeaderProps>) {
  const headerContent = (
    <div className="flex flex-col items-center text-center leading-tight">
      <span className="brand-name">Team Signup</span>
      {title ? <span className="brand-subtitle">{title}</span> : null}
    </div>
  );

  const linkClasses = `brand-link${centered ? " brand-link-centered" : ""}${clickable ? "" : " brand-link-static"}`;

  return (
    <header className="brand-header">
      {clickable ? (
        <Link href="/signups" className={linkClasses}>
          {headerContent}
        </Link>
      ) : (
        <div className={linkClasses}>{headerContent}</div>
      )}
    </header>
  );
}
