/**
 * Social sign-in placeholders, styled for the dark glass auth card.
 *
 * Rendered as DISABLED on purpose. The backend has no OAuth provider —
 * `auth.routes.ts` exposes only email/password signup, login, verify-email and
 * password reset. Wiring these would either fake a flow or dead-end the guest,
 * so they are visibly inert and labelled, never merely styled to look clickable.
 *
 * Not in the design reference, but explicitly requested in the written brief
 * ("Social login placeholders — UI only if backend not available"), so they're
 * kept rather than silently dropped. Say the word and I'll remove them.
 *
 * When Google/Apple sign-in is actually built, swap `disabled` for the real
 * handler — the layout and styling stay as-is.
 */
export default function SocialPlaceholders() {
  const providers = ["Google", "Apple"];

  return (
    <div>
      <div className="flex items-center gap-4">
        <span className="h-px flex-1 bg-cream/15" />
        <span className="text-[0.8125rem] font-medium uppercase tracking-luxe text-cream/65">Or</span>
        <span className="h-px flex-1 bg-cream/15" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {providers.map((name) => (
          <button
            key={name}
            type="button"
            disabled
            title="Social sign-in is coming soon"
            className="cursor-not-allowed rounded-xl border border-cream/15 px-4 py-3
                       text-[0.9375rem] font-light text-cream/55"
          >
            {name}
          </button>
        ))}
      </div>

      <p className="mt-3 text-center text-sm font-light text-cream/65">Social sign-in coming soon</p>
    </div>
  );
}
