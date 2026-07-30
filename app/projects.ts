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
  /** Why it exists. The problem, not the feature. */
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
   * One line of framing above the scene.
   *
   * These read as descriptions of what is happening rather than instructions,
   * because there is nothing to operate. An earlier version invited the visitor to
   * drag, press and play, which was honest about demos that had been built as
   * working software and is the wrong promise now that they are films.
   */
  invitation: string;
  /**
   * What the project does, four or five lines of it.
   *
   * Each line has to describe the software from outside: what it does for the
   * person using it, and where a technical decision is the reason something is
   * possible, that decision stated as the reason. Not internals for their own
   * sake, and never a count of anything.
   *
   * This list used to hold lines like "Frames measured at 48x27, Rec.709 luma,
   * 64-bin histogram" and one that counted the project's own test suite. Both
   * were true and neither told a reader what the extension is for.
   *
   * A line still has to be checkable by reading the repository the section links
   * to. If it cannot be found there, delete it rather than softening it.
   */
  facts: string[];
};

const projectData: Project[] = [
  {
    id: "choir-practice",
    stage: "stacked",
    number: "07",
    name: "Choir Practice",
    platform: "Web app",
    headline: "Rehearse your part with the other three voices behind it.",
    why: "Learning an inner line from a recording of the whole choir is guesswork. You need your line loud and the rest quiet, then the reverse.",
    theme: "mint",
    source: "https://github.com/xiangthebung/satb-practice",
    live: "https://satb-practice.xiangli3625.workers.dev/",
    demo: "choir-practice",
    well: "dark",
    invitation:
      "Not a scene — the actual application, running in this page with a score already open. Sound is one press away.",
    facts: [
      "Open a MusicXML score and it engraves the whole thing — beams, ties, slurs, key changes",
      "Four rehearsal mixes: mostly your part, only your part, everyone but you, everyone",
      "Every voice is synthesised, so a score plays without waiting for a recording of it",
      "Sing into the microphone and it shows where your pitch sat against the written note",
      "Scores never leave the device, and the finished mix exports as a WAV",
    ],
  },
  {
    id: "decaf",
    stage: "beside",
    number: "05",
    name: "Decaf",
    platform: "Chrome extension",
    status: "Work in progress",
    headline: "Make social media boring on purpose.",
    why: "Blocking a site makes you want it. Removing the colour, the counts and the autoplay just makes it dull.",
    theme: "paper",
    // The repository was renamed along with the extension; the old `blokamine`
    // path is not a redirect.
    source: "https://github.com/xiangthebung/Decaf",
    demo: "decaf",
    well: "light",
    invitation:
      "A feed doing everything it can to hold you, and then the same feed with all of it switched off.",
    facts: [
      "Empties the feed where it sits — the header and sidebars do not move a pixel",
      "Reward counts become a dash in the text and in the label a screen reader reads",
      "Notification badges keep their number and lose the red, so a real message gets through",
      "Twelve sites, and messaging deliberately excluded — a conversation is not a feed",
      "The first pass each day costs a 3-second hold, the next 7, then 11, then 15",
    ],
  },
  {
    id: "pdf-explainer",
    stage: "beside-flip",
    number: "06",
    name: "PDF Explainer",
    platform: "Web app",
    headline: "Read a lecture deck with the explanation on top of it.",
    why: "The slide and the thing that explains the slide are usually in different windows, and you lose one to look at the other.",
    theme: "black",
    source: "https://github.com/xiangthebung/pdf-explainer",
    demo: "pdf-explainer",
    well: "light",
    invitation:
      "Four parts of the workspace in turn: notes floating over the slide, a tutor that knows which slide you are on, a marked quiz, and the terms paired up.",
    facts: [
      "Explanations arrive a batch of slides at a time, so reading starts in seconds",
      "A tutor you can ask about the slide you are on, given that slide's text and notes",
      "Practice built from the same deck: quizzes, matched pairs and fill-in-the-blanks",
      "Three layouts — notes beside the slide, floating over it, or out of the way",
      "Your Gemini key stays on your device, and the server strips it from every log line",
    ],
  },
  {
    id: "pagepack",
    stage: "offset",
    number: "04",
    name: "PagePack",
    platform: "Chrome extension",
    headline: "Save whole websites. Read them with no connection.",
    why: "Reading lists assume you will always have data. On a plane or underground, they are just a list of links.",
    theme: "white",
    source: "https://github.com/xiangthebung/pagepack-extension",
    demo: "pagepack",
    well: "light",
    invitation:
      "One save, then the connection dies. Every label under the bar is the string the extension actually prints.",
    facts: [
      "Saves the page as rendered, with its stylesheets, images and the fonts they ask for",
      "Follow the links and a whole section of a site comes with it, up to 1,000 pages",
      "Save as I browse collects the pages you visit, then you untick the ones you do not want",
      "A library with folders, and search that reaches the text inside a saved page",
      "With no connection, opening a saved address serves the saved copy instead",
    ],
  },
  {
    id: "grt-next-bus",
    stage: "beside",
    number: "02",
    name: "GRT Next Bus",
    platform: "Chrome extension",
    headline: "See the next bus without opening a map.",
    why: "Checking one stop should not mean loading a route planner and finding it again.",
    theme: "mint",
    source: "https://github.com/xiangthebung/grt-bus-time",
    demo: "grt-next-bus",
    well: "light",
    invitation:
      "Counting down on the toolbar with nothing open, and a notification five minutes before the bus reaches your stop.",
    facts: [
      "Your saved stops, with the next departure counting down on the toolbar icon",
      "Live predictions laid over the published timetable, so a late bus reads as late",
      "An alert before the bus reaches your stop, and how many stops away it is now",
      "Region of Waterloo open data, read straight from the source with no server in between",
      "Location, when you grant it, is used on the device and never sent anywhere",
    ],
  },
  {
    id: "n-back",
    stage: "beside-flip",
    number: "03",
    name: "N-Back",
    platform: "Web game",
    headline: "Dual and triple n-back, without the gamification.",
    why: "Most versions of this either look like a research instrument or promise to raise your IQ. It can just be a quiet thing you do for four minutes.",
    theme: "forest",
    source: "https://github.com/xiangthebung/n-back",
    live: "https://n-back.ai.studio/",
    demo: "n-back",
    well: "dark",
    invitation:
      "Two back means comparing what is on screen now with what was on screen two cues ago. Here is one match arriving.",
    facts: [
      "Dual mode tracks a position and a spoken letter; triple mode adds a colour",
      "One back to six back, a cue every 1.5 to 4 seconds, and it suggests where to go next",
      "Scored on balanced accuracy, so pressing everything does worse than pressing nothing",
      "Colours differ in lightness as well as hue, so the third stream survives colour blindness",
      "Practice, not an assessment — the transfer research is contested and this makes no claim",
    ],
  },
  {
    id: "night-neutralizer",
    stage: "stacked",
    number: "01",
    name: "Night Neutralizer",
    platform: "Chrome extension",
    headline: "Watch things at night without the volume war.",
    why: "Turn the screen down and dark scenes vanish. Turn the volume down and dialogue vanishes. Neither has to be true.",
    theme: "navy",
    source: "https://github.com/xiangthebung/night-neutralizer",
    demo: "night-neutralizer",
    well: "dark",
    invitation:
      "The same shot twice: once as the film shipped it, once through the extension. Watch what the explosion does to the volume.",
    facts: [
      "Closes the gap between the explosions and the dialogue, and lifts the picture's shadows with it",
      "Adapts to the scene: shadows open on a dark shot, highlights hold back on a bright one",
      "A bright cut is dimmed on the next frame and let back up over about a second and a half",
      "Paints a filter over the frames rather than reading them, so it works on DRM video too",
      "Music is left alone — dynamic range is the point of a record and a nuisance in a film",
      "Stands down until night: a light sensor decides where there is one, the clock otherwise",
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
