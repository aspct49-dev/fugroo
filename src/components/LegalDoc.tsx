import { PRIMARY_PARTNER, SOCIALS } from '@/lib/partners';
import { SITE } from '@/lib/site';

/**
 * The frame both policies share: title, when it last changed, and the one way
 * to reach a person about it.
 *
 * The contact block is part of the frame rather than typed into each page,
 * because a policy that tells you what is collected and then leaves you no way
 * to ask about it is half a policy — and the half that gets forgotten is
 * always the same half.
 */
export function LegalDoc({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  /** Written out, e.g. "20 September 2026". Bumped when the text changes. */
  updated: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <section className="section wrap">
      <h1 className="h-page">{title}</h1>
      <p className="lede" style={{ marginTop: 14 }}>
        {intro}
      </p>
      <p className="legal-updated">Last updated {updated}</p>

      <div className="prose" style={{ marginTop: 30 }}>
        {children}

        <h2>Getting in touch</h2>
        <p>
          The quickest way to reach us about anything on this page is a direct message on X at{' '}
          <a href={SOCIALS.x} target="_blank" rel="noreferrer">
            @Fugroo_
          </a>
          , or a ticket in the{' '}
          <a href={SOCIALS.discord} target="_blank" rel="noreferrer">
            Discord
          </a>
          . Anything about your {PRIMARY_PARTNER.name} account itself — deposits, withdrawals,
          verification, self-exclusion — has to go to {PRIMARY_PARTNER.name} support, because{' '}
          {SITE.name} has no access to it.
        </p>
      </div>
    </section>
  );
}
