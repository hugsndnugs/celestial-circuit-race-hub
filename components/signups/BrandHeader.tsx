import Link from "next/link";

type BrandHeaderProps = {
  title?: string;
  clickable?: boolean;
  centered?: boolean;
};

export function BrandHeader({
  title = "Team Signup",
  clickable = true,
  centered = false,
}: Readonly<BrandHeaderProps>) {
  const headerContent = (
    <div className="brand-header-content">
      <span className="brand-name">Race Operations Hub</span>
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
