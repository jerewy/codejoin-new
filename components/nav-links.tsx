"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings", label: "Settings" },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-6">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={clsx(
            "text-sm font-medium",
            pathname === href
              ? "text-primary"
              : "hover:underline underline-offset-4"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
