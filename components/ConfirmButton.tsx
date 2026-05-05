"use client";

import type { ButtonHTMLAttributes } from "react";

type Props = {
  message: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

// Submit button that asks for confirmation before letting the form submit.
// Useful when paired with `formAction={someServerAction}` for destructive ops.
export function ConfirmButton({ message, onClick, ...rest }: Props) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...rest}
    />
  );
}
