'use client';

/**
 * A submit button that asks first.
 *
 * Deleting a round destroys everyone's guesses, and deleting a tournament
 * destroys the bracket — both sit one stray click away in a panel that is
 * open while a stream is running. The rest of the admin panel is deliberately
 * unguarded because everything in it is reversible; these two are not, which
 * is the whole reason they get a prompt and nothing else does.
 *
 * `confirm()` rather than a modal on purpose: it cannot be missed, it cannot
 * be styled into looking like the button next to it, and it needs no state.
 *
 * It stays a real submit button inside a real form, so the server action still
 * runs the admin check. If the script never loads, the button still deletes —
 * unguarded, but working, which is the right way round for a control that has
 * to function on stream.
 */
export function ConfirmSubmit({
  message,
  className,
  children,
  ...rest
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type'>) {
  return (
    <button
      className={className}
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
