/**
 * What is on this site, and what each section is allowed to claim.
 *
 * The old shape of this file described screenshots: an image per step, a caption,
 * a pointer angle, a crop. It described pictures of software. Every one of those
 * pictures went stale — four of the projects had been renamed, one had been
 * rewritten from scratch, and one did not exist yet.
 *
 * So a project no longer carries media. It carries an id for a demo component
 * that runs the actual thing, and a short list of facts that are checkable by
 * reading the source it links to. If a fact here cannot be found in that
 * repository, it should be deleted rather than softened.
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
  /** Why it exists. The problem, not the feature. One sentence. */
  why: string;
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
  invitation: string;
  /**
   * Three short notes about the project. Fragments, not sentences.
   *
   * This was `facts`, and it read like one: five or six full lines each, stacked
   * into a bulleted column beside every scene. Two problems with that. It was more
   * words than anyone reads beside something that is moving — the scene and the
   * list competed, and the list lost while still taking up the room. And the
   * register was flat: a row of declarative claims about software reads as a
   * specification sheet, which is the opposite of curious.
   *
   * So: three, short, and only the things a picture cannot say on its own. Where a
   * note and the scene would say the same thing, the note goes and the scene keeps
   * it — that is the whole point of having seven of them running.
   *
   * Still no counts of anything, and still nothing that cannot be found by reading
   * the repository the section links to.
   */
  notes: string[];
};

const projectData: Project[] = [
  {
    id: "choir-practice",
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
    invitation: "The real app, open on a score. Sound is one press away.",
    notes: [
      "Turn your part up and the other three down, or the reverse",
      "It sings all four parts itself, so you never need a recording",
      "Sing along and it shows whether you were sharp or flat",
    ],
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
    invitation: "The same feed, with all of it switched off.",
    /* These were written from the inside. "Empties the feed where it sits, without
       the page jumping" is a thing I was pleased with in the code and nothing a
       person wants; "Badges" meant notification badges and did not say so. Each line
       now names something the reader would notice happening to them. */
    notes: [
      "The colour, the view counts and the autoplay all switch off",
      "Notification badges keep their number but lose the red",
      "The feed isn't blocked, just three seconds away. Tomorrow, seven.",
    ],
  },
  {
    id: "pdf-explainer",
    stage: "beside-flip",
    number: "03",
    name: "PDF Explainer",
    platform: "Web app",
    headline: "The slide, and what it means, in one window.",
    why: "Otherwise you lose sight of the slide to read the explanation of it.",
    theme: "black",
    source: "https://github.com/xiangthebung/pdf-explainer",
    demo: "pdf-explainer",
    well: "light",
    invitation: "Four parts of the workspace, in turn.",
    notes: [
      "Notes sit over the slide, faint until you move towards them",
      "Ask it questions about the slide you are looking at",
      "It writes quizzes and flashcards from your own deck",
    ],
  },
  {
    id: "pagepack",
    stage: "offset",
    number: "04",
    name: "PagePack",
    platform: "Chrome extension",
    headline: "Save whole websites. Read them with no connection.",
    why: "A reading list is just a list of links once the signal drops.",
    theme: "white",
    source: "https://github.com/xiangthebung/pagepack-extension",
    demo: "pagepack",
    well: "light",
    invitation: "One save, then the connection dies.",
    notes: [
      "Saves the page exactly as you saw it, pictures and all",
      "Follow the links and it takes the whole section with it",
      "On a plane or underground, the saved copy just opens",
    ],
  },
  {
    id: "grt-next-bus",
    stage: "beside",
    number: "05",
    name: "GRT Next Bus",
    platform: "Chrome extension",
    headline: "See the next bus without opening a map.",
    why: "Checking one stop should not mean loading a route planner and finding it again.",
    theme: "mint",
    source: "https://github.com/xiangthebung/grt-bus-time",
    demo: "grt-next-bus",
    well: "light",
    invitation: "Nothing open. Five minutes out, it tells you.",
    notes: [
      "The countdown sits on your toolbar with nothing open",
      "Real bus positions, so a late bus shows up as late",
      "It taps you on the shoulder five minutes before your bus",
    ],
  },
  {
    id: "night-neutralizer",
    stage: "stacked",
    number: "06",
    name: "Night Neutralizer",
    platform: "Chrome extension",
    headline: "Watch things at night without the volume war.",
    why: "Turn the screen down and dark scenes vanish. Turn the volume down and the dialogue does.",
    theme: "navy",
    source: "https://github.com/xiangthebung/night-neutralizer",
    demo: "night-neutralizer",
    well: "dark",
    invitation: "The same shot twice. Watch what the explosion does.",
    notes: [
      "Explosions come down, whispers come up",
      "Dark scenes brighten without the bright ones blowing out",
      "Works on the streaming sites that block other extensions",
    ],
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
    headline: "Dual and triple n-back, without the gamification.",
    why: "Most versions look like a lab instrument or promise you a higher IQ. This one is four quiet minutes.",
    theme: "forest",
    source: "https://github.com/xiangthebung/n-back",
    live: "https://n-back.ai.studio/",
    demo: "n-back",
    well: "dark",
    invitation: "Two back: now, against two cues ago.",
    notes: [
      "Watch a square and hear a letter. Triple adds a colour.",
      "Pressing everything scores worse than pressing nothing",
      "Practice, not a test of you",
    ],
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
