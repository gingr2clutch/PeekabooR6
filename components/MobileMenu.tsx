"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

const itemCls =
  "flex min-h-[44px] items-center gap-3 rounded-btn px-3 py-3 text-left text-base font-medium text-ink transition-colors duration-150 ease-out hover:bg-ink/[0.06] hover:text-brand";

const CloseContext = createContext<() => void>(() => {});

function useCloseMenu() {
  return useContext(CloseContext);
}

type MenuProps = {
  children: ReactNode;
  ariaLabel?: string;
};

export function MobileMenu({ children, ariaLabel = "Menu" }: MenuProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={
          open ? `Close ${ariaLabel.toLowerCase()}` : `Open ${ariaLabel.toLowerCase()}`
        }
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-btn text-ink transition-colors duration-150 ease-out hover:bg-ink/[0.06]"
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      {open && (
        <CloseContext.Provider value={close}>
          <button
            type="button"
            aria-label={`Close ${ariaLabel.toLowerCase()}`}
            tabIndex={-1}
            onClick={close}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
          />
          <div
            role="menu"
            aria-label={ariaLabel}
            className="absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-card border border-border bg-card p-2 shadow-lg"
          >
            {children}
          </div>
        </CloseContext.Provider>
      )}
    </div>
  );
}

type MenuLinkProps = {
  href: string;
  icon?: ReactNode;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className">;

export function MobileMenuLink({
  href,
  icon,
  children,
  onClick,
  ...rest
}: MenuLinkProps) {
  const close = useCloseMenu();
  return (
    <Link
      href={href}
      role="menuitem"
      className={itemCls}
      onClick={(e) => {
        onClick?.(e);
        close();
      }}
      {...rest}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}

type MenuButtonProps = {
  icon?: ReactNode;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function MobileMenuButton({
  icon,
  children,
  type = "submit",
  className,
  onClick,
  ...rest
}: MenuButtonProps) {
  const close = useCloseMenu();
  return (
    <button
      type={type}
      role="menuitem"
      className={`${itemCls} w-full ${className ?? ""}`}
      onClick={(e) => {
        onClick?.(e);
        close();
      }}
      {...rest}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export function MobileMenuBack() {
  const router = useRouter();
  return (
    <MobileMenuButton
      type="button"
      icon={<BackArrowIcon />}
      onClick={() => router.back()}
    >
      Back
    </MobileMenuButton>
  );
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-6 w-6 fill-none stroke-current"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-6 w-6 fill-none stroke-current"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 6l12 12M6 18L18 6" />
    </svg>
  );
}

function BackArrowIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden
      className="fill-none stroke-current"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 8H2M8 14L2 8l6-6" />
    </svg>
  );
}
