/**
 * What is on this site, and what each section is allowed to claim.
 *
 * The old shape of this file described screenshots: an image per step, a caption,
 * a pointer angle, a crop. It described pictures of software. Every one of those
 * pictures went stale — four of the projects had been renamed, one had been
 * rewritten from scratch, and one did not exist yet.
 *
 * So a project no longer carries media. It carries an id for a demo component that runs
 * the actual thing.
 *
 * It no longer carries a feature list either, and that was the second half of the same
 * mistake. Every project had three written notes set in a column beside its scene, and the
 * observation that killed them is one anybody makes in the first ten seconds of the page:
 * *nobody reads the description while the animation is running*. The scene and the list
 * were competing for the same attention, the list lost every time, and it was still taking
 * up the room — so the page was explaining itself in the one place a visitor was
 * guaranteed not to be looking.
 *
 * The claims did not go; they moved into the frames. Each scene now labels its own
 * evidence — "Notifications muted" beside the badge that just lost its red, "0 of 3" over
 * the shot you cannot see anything in, "Real positions, so late reads late" on the row
 * that says a bus is two minutes late. See `demos/scene/spec.tsx` for the component and
 * each pod's own `SPECS` for what it claims.
 *
 * What survives here is a name, a platform, a headline and a reason. A section needs a
 * title and one sentence about the problem, because a problem is the one thing a
 * demonstration of the solution cannot state. Everything past that belongs on screen, next
 * to the thing doing it. If a claim cannot be found by reading the repository the section
 * links to, it should be deleted rather than softened.
 */

/**
 * Which demo component a section mounts.
 *
 * `two-factor-paster` rather than `2fa-paster`, and that is not a style preference. The
 * id is also the section's DOM id, and six of the review scripts locate a section with
 * `page.locator(`#${id}`)` — a CSS selector, where an identifier may not begin with a
 * digit. `#2fa-paster` throws rather than missing, so the failure would have been
 * `drive-site`, `beat-shot`, `film-strip`, `click-order`, `immersion` and `presence` all
 * breaking at once on a page that rendered perfectly.
 *
 * There is precedent either way: an id here has never had to match its repository. Choir
 * Practice lives in `satb-practice` and GRT Next Bus in `grt-bus-time`.
 */
export type DemoId =
  | "night-neutralizer"
  | "grt-next-bus"
  | "n-back"
  | "pagepack"
  | "decaf"
  | "pdf-explainer"
  | "choir-practice"
  | "two-factor-paster"
  | "totem"
  | "byte-budget";

/**
 * Where the heading, the scene and the facts sit.
 *
 * Four compositions across ten sections, assigned so that no two neighbours share
 * one. That is the only constraint worth enforcing: a visitor never notices a
 * repeat, because any two sections using the same arrangement are four thousand
 * pixels apart. Ten bespoke layouts would have been ten things to maintain for
 * an effect nobody can perceive — and the ratio only got better when three
 * projects were added and the number of compositions did not have to move.
 */
export type Stage = "beside" | "beside-flip" | "stacked" | "offset";

export type Project = {
  id: string;
  number: string;
  name: string;
  platform: string;
  status?: string;
  /** Which composition this section uses. See `Stage`. */
  stage: Stage;
  /** What it does, in one line, without selling it. */
  headline: string;
  /**
   * Why it exists. The problem, not the feature. One sentence.
   *
   * Optional, because one headline turned out to already contain its own reason. PagePack's
   * is "Save linked pages together. Read them with no connection." — a reader who has
   * understood that sentence has understood the problem, and "a reading list is just a
   * list of links once the signal drops" was the same thought again with a metaphor on
   * it. Where the headline does the work, this is nothing but a second paragraph above a
   * moving scene, which is the thing this page has been removing all along.
   */
  why?: string;
  /**
   * Which of the rooms this section is.
   *
   * The first six names describe colours none of them has had for a long time — `black`
   * is a cornflower blue and `white` is a lilac — and they are kept because renaming them
   * would touch the stylesheet in about forty places to change nothing a visitor sees.
   * The three added with the eighth, ninth and tenth projects are named for the colour
   * they actually are, which is the convention worth having going forward.
   */
  theme:
    | "paper"
    | "mint"
    | "black"
    | "white"
    | "navy"
    | "forest"
    | "violet"
    | "rose"
    | "amber";
  source: string;
  live?: string;
  demo: DemoId;
  /**
   * How the well behind the demo is lit. Demos that ship their own dark interface
   * get a dark recess, so a pale page does not put a glowing halo around a UI
   * designed to be the dimmest thing on a screen at 1 a.m.
   */
  well: "light" | "dark";
  /**
   * A fragment of framing above the scene. Shorter than a sentence, ideally.
   *
   * These describe what is about to happen rather than instructing anyone, because
   * there is nothing to operate. An earlier version invited the visitor to drag,
   * press and play, which was honest about demos built as working software and is
   * the wrong promise now that they are films.
   */
  /**
   * One line of framing above the scene, and exactly one project still has one.
   *
   * There were seven, then four, and now one, and each round of cutting was the same
   * discovery in a different place: the line was saying something the frame beneath it
   * was already showing. PDF Explainer's "Four parts of the workspace, in turn" sat
   * directly above a rail naming all four and lighting the one playing. GRT's "Nothing
   * open. Five minutes out, it tells you" was both of its own notes, shortened.
   *
   * The last three went when the scenes learned to label themselves. Night Neutralizer's
   * "The same shot, twice" is now a chip in the pod's own rig, over the two panels it is
   * about. Decaf's "A feed at full volume, then the same feed on Decaf" is answered by six
   * labels that fly out of the switch and land on the six things it changed. PagePack's
   * "One save, then the connection dies" was a summary of a film that is perfectly clear
   * while you watch it.
   *
   * What is left earns it, on the one ground prose still has over a moving picture: it can
   * make a claim about the *status* of what you are looking at. Choir Practice is the real
   * application, running, and no amount of watching it can tell you that rather than that
   * it is a very good reconstruction. It also has the one instruction on the page, because
   * it is the one thing that has to be clicked.
   */
  invitation?: string;
};

const projectData: Project[] = [
  {
    id: "choir-practice",
    /**
     * `stacked`, and the reason changed completely without the answer changing.
     *
     * What this note used to say was that the application was broken at the sizes `beside`
     * would give it: its parts panel was a fixed 300px column that could not be closed
     * above 900px wide and did not scroll, so a short frame cut the score off — 243px of
     * overflow at 609px tall, 392px at 460px — and below the app's own `max-width: 899px`
     * breakpoint that column became a modal dialog covering the score completely. `beside`
     * was tried, narrowed the frame to 801px, and was photographed unusable.
     *
     * None of that is true any more. The application was audited and both defects were
     * fixed at the source: the panel is a non-modal `<dialog open>` in its own grid track,
     * closable at every width, and the track collapses when it is shut. Measured over
     * there, the score covered by an open panel went from 83% to 0% and the play button
     * became hit-testable. The vendored copy here is that version.
     *
     * So this is now a composition decision rather than a workaround, and it lands in the
     * same place for a plainer reason. `beside` still narrows the frame to about 801px,
     * which is still under the app's breakpoint — and under it the panel is no longer a
     * dialog over the music but a block *beneath* it, capped at `min(46dvh, 360px)`. In a
     * frame this tall that is 360px taken from a score that is the entire point of the
     * section. The app is composed for its desktop layout; the section should show it in
     * that layout.
     *
     * The heading therefore stays in a band above, the pod keeps its full width, and the
     * height is bought back by giving the frame the height the app actually needs.
     *
     * If this is ever revisited: the thing to measure is not whether `beside` fits, but
     * how much of the score survives at 801px with the panel stacked under it.
     */
    stage: "stacked",
    number: "01",
    name: "Choir Practice",
    platform: "Web app",
    headline: "Hear your own part against the other three.",
    why: "A recording of the whole choir tells you almost nothing about your line.",
    theme: "mint",
    source: "https://github.com/xiangthebung/satb-practice",
    live: "https://satb-practice.xiangli3625.workers.dev/",
    demo: "choir-practice",
    well: "dark",
    /* The one line of framing left on the page, and the only one that was not restating
       the frame under it. Two claims, neither of which the pod can make by running: that
       this is the actual application rather than a reconstruction of it, and that it needs
       a click. Everything the three deleted notes said is inside the frame now — the mixer
       and the pitch detector carry leader lines to the app's own controls, and the four
       voices are discs in the score's own colours moving with the mix. */
    invitation: "The real app, on a real score. Play it and all four parts sing.",
  },
  {
    id: "decaf",
    stage: "beside",
    number: "02",
    name: "Decaf",
    platform: "Chrome extension",
    /* The "Work in progress" label is gone, and it went because the work finished rather
       than because the label got tired. What was actually unfinished was a class of bug
       rather than a feature: the exemption that stops a puzzle board being mistaken for a
       row of notification badges was gated on a route pattern that existed for one of the
       twelve sites, so the same LinkedIn board was safe at `/games/` and had a cell blanked
       at `/puzzles/`. Every test covering it used a `/games/` URL, so all of them passed.
       Unambiguous evidence — a board the site names itself — is honoured everywhere now. */
    headline: "Make social media boring on purpose.",
    why: "Blocking a site makes you want it. Dullness doesn't.",
    theme: "paper",
    // The repository was renamed along with the extension; the old `blokamine`
    // path is not a redirect.
    source: "https://github.com/xiangthebung/Decaf",
    demo: "decaf",
    well: "light",
    /* No invitation and no notes. This section was the clearest case of the problem: the
       three notes here were the only place the page said what Decaf does, and they sat
       beside ten seconds of hearts crossing the screen. Every one of them is now a label
       that flies out of the toolbar switch and lands on the thing it changed — the
       greyscaled media, the hidden counts, the muted badge that keeps its number, the
       suggestions column that goes. The escalating hold was always in the notice card. */
  },
  {
    id: "pdf-explainer",
    stage: "beside-flip",
    number: "03",
    name: "PDF Explainer",
    platform: "Web app",
    headline: "The slide, and what it means, without switching windows.",
    theme: "black",
    source: "https://github.com/xiangthebung/pdf-explainer",
    live: "https://pdf-explainer.xiangli3625.workers.dev/",
    demo: "pdf-explainer",
    well: "light",
    /* The act rail across the top of the scene names the four parts and lights the one
       playing, so there was never anything for an invitation to add. The two notes that
       were carrying real information — the overlay wakes on approach, and the practice
       material comes out of your own deck — are labels inside the stage now, on the panels
       making those claims. */
  },
  {
    id: "pagepack",
    stage: "offset",
    number: "04",
    name: "PagePack",
    platform: "Chrome extension",
    headline: "Save linked pages together. Read them with no connection.",
    /* No reason line. "A reading list is just a list of links once the signal drops" was the
       headline again with a metaphor on it — anyone who has read "read them with no
       connection" already has the problem in mind. */
    theme: "white",
    source: "https://github.com/xiangthebung/pagepack-extension",
    demo: "pagepack",
    well: "light",
    /* This scene narrates itself better than any other on the page, and every string and
       colour it prints is now one the extension actually produces: the popup says "Reading
       this page…", the toolbar badge counts up to seven in the blue `paintActionBadge`
       paints a save, the library row reads "7 pages · 1.6 MB · 29 Aug" from `packMeta`, and
       the reader opens with "Opening your save…" over "Reading it from this device."

       It used to stamp the reader "saved copy · no network request" and foot the library
       with "Opens with no connection". Neither string exists anywhere in the extension —
       they were the scene making the product's claims in the product's voice, which is the
       one voice a reconstruction may not borrow. Both are gone; the claims they were making
       are pinned labels now, which is where a claim on this page belongs.

       Four of those labels. Two on the save — what got saved, and that it followed the
       links. Two on the outage: that the saved copy is what opens when the load fails, and
       what it costs to read it. */
  },
  {
    id: "grt-next-bus",
    stage: "beside",
    number: "05",
    name: "GRT Next Bus",
    platform: "Chrome extension",
    headline: "See the next Grand River Transit bus without opening a map.",
    why: "Checking one stop should not mean loading a route planner and finding it again.",
    theme: "mint",
    source: "https://github.com/xiangthebung/grt-bus-time",
    demo: "grt-next-bus",
    well: "light",
    /* The scene was always full of numbers and short of a reason to care about any of
       them — a badge counting down, a notification and three stop rows are evidence, and
       the claims they were evidence for used to be in a written list here. They are labels
       now, each arriving on the beat its evidence does: on the badge, on the notification,
       on the row that says a bus is running two minutes late, and on the row that says
       which stop is closest and how far.

       The alert's label carries the lead time rather than the word "before", because the
       card it hangs on prints "7 in 5 min" and the five is `DEFAULT_ALERT_LEAD_MINUTES`
       rather than a number someone liked. The "2 min late" is not invented either —
       measured against the live feed, 670 rows read exactly that on the day it was staged.

       The claim this project would most like to make is that the countdown survives Chrome
       killing the service worker, which `tests/background-lifecycle.test.mjs` checks by
       restarting the worker and asking the new generation what the badge says. It is not a
       label, and cannot be: a teardown has no interface, so there is no frame that contains
       the evidence. A label pinned to a picture that does not show its subject is the thing
       this whole arrangement exists to prevent. */
  },
  /* The three that arrived after the page had settled into seven, inserted here rather
     than appended. Appending would have put them after N-Back, and N-Back is last on
     purpose — see the note below it. Inserting also means no existing section changes its
     composition: the four `stage` variants still alternate so that no two neighbours
     share one, which is the only rule this ordering has. */
  {
    id: "two-factor-paster",
    stage: "stacked",
    number: "06",
    name: "2FA Paster",
    platform: "Chrome extension",
    headline: "Takes the code out of your email and types it into the form.",
    why: "The code expires while you are still switching tabs to find the message it came in.",
    theme: "violet",
    source: "https://github.com/xiangthebung/2fa-paster",
    demo: "two-factor-paster",
    well: "light",
    /* `stacked`, because the thing worth watching is a form being filled in and a form is
       wide. The claim this scene has that no competitor of it does is that the extension
       shows its reasoning — the popup carries a "Why this one" disclosure listing the
       signals it scored — so the scene has something to point at when it says it picked
       the right code out of several.
       The safety half is the other reason this is not just a convenience: it refuses card
       security-code fields, and it refuses to press a button that would delete an account. */
  },
  {
    id: "totem",
    stage: "beside-flip",
    number: "07",
    name: "Totem",
    platform: "iOS, Android and web",
    headline: "A todo list that hides its own words behind symbols you learn.",
    why: "A list you skim without reading is a list you have stopped noticing.",
    theme: "rose",
    source: "https://github.com/xiangthebung/totem",
    demo: "totem",
    /* The only dark well among the three new sections, and the app earns it: it is drawn
       near-black so that the totems are the only saturated things on screen. A pale recess
       behind a phone that dark would put a halo round the one idea the scene is about. */
    well: "dark",
    /* The one project here that is not a browser, which is worth something on a page of
       nine that are. It is also the only scene with a sound to show and no way to play it —
       the same problem Night Neutralizer solved by printing its soundtrack at the size it
       sounds. Totem's own design answers it: colour picks the pitch and object picks the
       timbre, so what you see and what you hear are the same two facts twice. */
  },
  {
    id: "byte-budget",
    stage: "offset",
    number: "08",
    name: "Byte Budget",
    platform: "Chrome extension",
    headline: "What each site costs you in data, and a cap it cannot go past.",
    why: "On a metered connection you find out what the browsing cost after you have spent it.",
    theme: "amber",
    source: "https://github.com/xiangthebung/byte-budget",
    demo: "byte-budget",
    well: "light",
    /* The interesting claim is not the measuring, which every data-usage tool says it does.
       It is that this one says how much of each figure it actually measured rather than
       inferred, and marks the inferred part in amber — which is where this section's colour
       comes from. A tool that admits the parts it is guessing at is the whole argument, and
       it is checkable: `measuredShare` is computed and threaded end to end. */
  },
  {
    id: "night-neutralizer",
    stage: "stacked",
    number: "06",
    name: "Night Neutralizer",
    platform: "Chrome extension",
    /* The reason line has been right for a while: everybody who watches anything late has
       spent the film with a hand on the remote.
       The headline had not. It read "Dark scenes brighter, loud scenes quieter,
       automatically", and the second of those three is something this extension does not
       do. Measured from its own core at the default strength, a full-scale peak comes out
       at −0.09 dB; at maximum strength it comes out at −1.2. It never meaningfully touches
       loud material. What it does is lift the quiet by 8 dB, which closes the gap, which is
       what lets you run the whole thing lower.
       So the headline is the two knobs now rather than the two halves of the signal. It is
       what the software is for, it survives contact with the measurements, and it is the
       same sentence the scene below it acts out: one panel at 30% volume, one at 12%, the
       same line of dialogue audible in both. */
    headline: "Turn the screen and the volume down without losing the film.",
    why: "Watching anything late means riding the volume and brightness for two hours: dialogue you can't hear, then a bang that wakes the house.",
    theme: "navy",
    source: "https://github.com/xiangthebung/night-neutralizer",
    demo: "night-neutralizer",
    well: "dark",
    /* "The same shot, twice" was the last invitation to go and it was the one doing the most
       work: two dark rectangles side by side could be two different shots, and the entire
       comparison depends on them being one. It is a chip in the pod's own rig now, beside a
       brightness dial that visibly never moves — which answers the objection the line could
       only assert.
       The three notes went the same way, into four pairs of verdicts under the two panels:
       dark scenes brighter, the dialogue audible for less volume, the bang therefore lower,
       nothing to adjust. And the audio half is legible on a silent page because the
       soundtrack is printed at the size it arrives at — the whispered line the same size in
       both panels, over volume dials reading 30% and 12%, and the explosion at forty pixels
       against twenty-six. The version before it drew both lines landing within five pixels
       of each other, which is a compressor flattening a soundtrack and is not what this
       software does. */
  },
  /* Last on purpose, and it stayed last when three more projects arrived rather than
     being pushed along by them. It is the hardest section to arrive at cold — the other
     nine describe a problem you have already had, and this one has to teach a rule before
     its scene means anything — so it reads better as the thing you find at the end than
     as the third thing you are asked to understand. That is also why the three new
     sections were inserted above it instead of appended after it. */
  {
    id: "n-back",
    stage: "beside-flip",
    number: "07",
    name: "N-Back",
    platform: "Web game",
    headline: "Match each cue to the one two or three turns back—without gamification.",
    why: "Most versions look like a lab instrument or promise you a higher IQ. This one is four quiet minutes.",
    theme: "forest",
    source: "https://github.com/xiangthebung/n-back",
    /* Was `n-back.ai.studio`, which is where this was first hosted. It runs on Cloudflare
       now, like everything else here, and the old host no longer serves it. */
    live: "https://n-back.xiangli3625.workers.dev/",
    demo: "n-back",
    well: "dark",
    /* No invitation: "Two back: now, against two cues ago" was the fourth statement of that
       rule on one screen, after the caption, the strip's own `2 BACK` badge and the register
       chips in the backdrop. And no notes: the three streams are chips beside the board,
       including the colour one this film does not run, and the scoring rule sits under the
       two keys it is about. This is the one scene that keeps a caption, because its subject
       is a rule rather than an interface — see the note on `CAPTION` in the pod. */
  },
];

export const projects: Project[] = projectData.map((project, index) => ({
  ...project,
  number: String(index + 1).padStart(2, "0"),
}));

/** A quiet mark per section, used by the heading. Decorative. */
export const projectMotifs: Record<string, { label: string; mark: string }> = {
  "night-neutralizer": { label: "after dark", mark: "◑" },
  "grt-next-bus": { label: "next stop", mark: "●—●" },
  "n-back": { label: "two back", mark: "▦" },
  pagepack: { label: "kept offline", mark: "⇩" },
  decaf: { label: "colour off", mark: "B/W" },
  "pdf-explainer": { label: "slide over slide", mark: "▱" },
  "choir-practice": { label: "four voices", mark: "♪" },
  "two-factor-paster": { label: "one keypress", mark: "••••••" },
  totem: { label: "names hidden", mark: "◆" },
  "byte-budget": { label: "measured, not guessed", mark: "▮▮▯" },
};

export const funMedia = [
  {
    kind: "image",
    src: "/fun/01-coconut.jpg",
    alt: "A can of Casablanca pure coconut water on a shopping app",
  },
  {
    kind: "video",
    src: "/fun/clip-01.mp4",
    alt: "User-provided video clip 01",
  },
  {
    kind: "image",
    src: "/fun/02-salmon.jpg",
    alt: "Cooked salmon on a white plate",
  },
  {
    kind: "image",
    src: "/fun/09-mirror-portrait.jpg",
    alt: "A dim mirror portrait of Xiang carrying a bag",
  },
  {
    kind: "image",
    src: "/fun/03-bok-choy.jpg",
    alt: "Cooked bok choy in a white bowl",
  },
  {
    kind: "video",
    src: "/fun/clip-02.mp4",
    alt: "User-provided video clip 02",
  },
  {
    kind: "image",
    src: "/fun/15-tree-portrait.jpg",
    alt: "A sideways portrait of Xiang resting beneath a pine tree",
  },
  {
    kind: "image",
    src: "/fun/04-sky-building.jpg",
    alt: "Blue sky, trees, and a glass building seen from beneath an awning",
  },
  {
    kind: "video",
    src: "/fun/clip-03.mp4",
    alt: "User-provided video clip 03",
  },
  {
    kind: "image",
    src: "/fun/16-garden-portrait.jpg",
    alt: "Xiang seated beside a garden pond",
  },
  {
    kind: "image",
    src: "/fun/05-sunset.jpg",
    alt: "A vivid pink and gold sunset above a parking lot",
  },
  {
    kind: "video",
    src: "/fun/human-flag-right-side.mp4",
    alt: "User-provided human flag video from the right side",
  },
  {
    kind: "image",
    src: "/fun/08-hallway.jpg",
    alt: "A long fluorescent-lit hallway with white block walls",
  },
  {
    kind: "video",
    src: "/fun/clip-04.mp4",
    alt: "User-provided video clip 04",
  },
  {
    kind: "image",
    src: "/fun/10-cafeteria.jpg",
    alt: "Food on a cafeteria table beside a laptop",
  },
  {
    kind: "image",
    src: "/fun/11-flowers.jpg",
    alt: "A hanging basket of pink and white flowers under a blue sky",
  },
  {
    kind: "image",
    src: "/fun/12-railway.jpg",
    alt: "Railway tracks and overhead wires at dusk",
  },
  {
    kind: "image",
    src: "/fun/13-niagara-falls.jpg",
    alt: "Niagara Falls beneath a blue sky",
  },
  {
    kind: "image",
    src: "/fun/14-campus-window.jpg",
    alt: "A green campus viewed through tall windows",
  },
  {
    kind: "image",
    src: "/fun/17-city-fountain.jpg",
    alt: "A city fountain and garden beneath apartment buildings",
  },
  {
    kind: "image",
    src: "/fun/06-street-sunset.jpg",
    alt: "A sunset over a street with overhead wires and traffic lights",
  },
  {
    kind: "image",
    src: "/fun/07-winter-sunset.jpg",
    alt: "A pink winter sunset over a snowy field",
  },
  {
    kind: "image",
    src: "/fun/pan-fried-fish.jpg",
    alt: "Two pieces of fish cooking in a cast-iron skillet",
  },
  {
    kind: "image",
    src: "/fun/gym-map.png",
    alt: "Annotated gym floor plan with colored waypoints and a route from a you-are-here marker",
  },
] as const;
