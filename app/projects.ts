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

/** Which demo component a section mounts. */
export type DemoId =
  | "night-neutralizer"
  | "grt-next-bus"
  | "n-back"
  | "pagepack"
  | "decaf"
  | "pdf-explainer"
  | "choir-practice";

/**
 * Where the heading, the scene and the facts sit.
 *
 * Four compositions rather than seven, assigned so that no two neighbours share
 * one. That is the only constraint worth enforcing: a visitor never notices a
 * repeat, because any two sections using the same arrangement are four thousand
 * pixels apart. Seven bespoke layouts would have been seven things to maintain for
 * an effect nobody can perceive.
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
  theme: "paper" | "mint" | "black" | "white" | "navy" | "forest";
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
     * `beside`, not `stacked`, and the reason is arithmetic rather than taste.
     *
     * This is the one section holding a real application, and the application has a floor:
     * its parts panel is a fixed side column in the desktop layout, it does not scroll, and
     * it cannot be closed at desktop widths — so below about 850px of height the app
     * overflows its own frame and the score gets cut off. Measured: 243px of overflow at
     * 609px tall, 392px at 460px tall.
     *
     * It also needs at least 900px of *width*: the app's own stylesheet switches at
     * `max-width: 899px` and turns that side column into a modal dialog that covers the
     * score completely.
     *
     * `beside` was tried, because a heading in a column beside the pod costs nothing
     * vertical and brought the section from 1110px to 972px. It also narrowed the frame to
     * 801px, under the app's breakpoint, and the section rendered with a full-width Parts
     * dialog over the music. Photographed, and unusable.
     *
     * So the heading stays in a band above and the pod keeps its full 980px. The height is
     * bought back by giving the frame the height the app actually needs, and by deleting
     * the footnote that used to sit under it.
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
    status: "Work in progress",
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
    /* This scene narrates itself better than any other on the page: the popup says
       "Reading this page…", the badge lands on seven, the library head prints the page
       count and the total, the crash screen says ERR_INTERNET_DISCONNECTED, and the reader
       is stamped "saved copy · no network request". Two of the three notes were restating
       those. The two claims the frame genuinely could not make — what got saved, and that
       the save followed the links — are labels on the popup and on the cards. */
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
       the claims they were evidence for were in this list. All three are labels now, each
       arriving on the beat its evidence does: on the badge, on the bell, on the row that
       says a bus is running two minutes late. */
  },
  {
    id: "night-neutralizer",
    stage: "stacked",
    number: "06",
    name: "Night Neutralizer",
    platform: "Chrome extension",
    /* Both lines were rewritten because the pair had drifted into describing the product
       twice. "Watch things at night without the volume war" is a benefit, and "turn the
       screen down and dark scenes vanish" is a mechanism dressed as a problem — it asks the
       reader to picture an adjustment they have not made yet in order to understand why they
       would not want to make it.
       The problem is much more ordinary than that, and everybody who watches anything late
       has had it: you spend the film with a hand on the remote. So the headline says what
       the extension does to the film, and the reason says what you are doing instead. */
    headline: "Dark scenes brighter, loud scenes quieter, automatically.",
    why: "Watching anything late means riding the volume and brightness for two hours: dialogue you can't hear, then a bang that wakes the house.",
    theme: "navy",
    source: "https://github.com/xiangthebung/night-neutralizer",
    demo: "night-neutralizer",
    well: "dark",
    /* "The same shot, twice" was the last invitation to go and it was the one doing the most
       work: two dark rectangles side by side could be two different shots, and the entire
       comparison depends on them being one. It is a chip in the pod's own rig now, beside a
       brightness dial and a volume dial that visibly never move — which answers the
       objection the line could only assert.
       The three notes went the same way, into four pairs of verdicts under the two panels:
       dark scenes brighter, quiet parts louder, loud parts quieter, nothing to adjust. And
       the audio half is legible on a silent page because the soundtrack is printed at the
       size it sounds — a whisper at ten pixels, an explosion at forty, and both of them
       landing within five pixels of each other once the extension has them. */
  },
  /* Last on purpose. It is the hardest section to arrive at cold — the other six
     describe a problem you have had, and this one has to teach a rule before its
     scene means anything — so it reads better as the thing you find at the end than
     as the third thing you are asked to understand. */
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
