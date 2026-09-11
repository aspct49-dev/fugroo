/**
 * What a navigation shows while the next page is being rendered.
 *
 * This does two jobs, and the second is the less obvious one.
 *
 * The first is feedback: every page here renders on the server per request —
 * the root layout reads the session, which opts the whole app out of static
 * rendering — so a click costs a round trip. Without a boundary the browser
 * sits on the old page for that whole time with nothing moving, which reads
 * as a dead link rather than a slow one.
 *
 * The second is that `<Link>` prefetching had nothing to prefetch. For a
 * dynamically rendered route Next prefetches only as far as the nearest
 * loading boundary, so with none anywhere it did nothing at all on hover. One
 * file turns every nav link into a warm one.
 *
 * Shaped like the pages it stands in for — banner, then a rack of cards —
 * rather than a spinner, so the layout does not jump when the real thing
 * lands.
 */
export default function Loading() {
  return (
    <section className="section wrap" aria-busy="true" aria-label="Loading">
      <div className="skel-banner skel" />
      <div className="skel-title skel" />
      <div className="skel-rack">
        <div className="skel-card skel" />
        <div className="skel-card skel" />
        <div className="skel-card skel" />
      </div>
    </section>
  );
}
