export type ProjectStep = {
  title: string;
  text: string;
  image: string;
  video?: string;
  poster?: string;
  alt: string;
  fit?: "cover" | "contain";
  surface?: "light" | "dark";
  position?: string;
  cardRatio?: string;
  display?: "portrait-popout";
  portraitRatio?: string;
  pointer?: {
    x: string;
    y: string;
    length: string;
    angle: string;
  };
  calloutSide?: "left" | "right";
};

export type Project = {
  id: string;
  number: string;
  name: string;
  platform: string;
  status?: string;
  mode?: string;
  headline: string;
  why: string;
  theme: "paper" | "mint" | "black" | "white" | "navy" | "forest";
  source: string;
  live?: string;
  steps: ProjectStep[];
};

const projectData: Project[] = [
  {
    id: "blokamine",
    number: "01",
    name: "blokamine",
    platform: "Chrome extension",
    status: "Work in progress",
    mode: "Monochrome mode",
    headline: "Make social media less rewarding.",
    why: "Remove the parts that keep you scrolling.",
    theme: "paper",
    source: "https://github.com/xiangthebung/blokamine",
    steps: [
      {
        title: "Make the feed less interesting.",
        text: "Keep the sites. Remove colour, numbers, and other attention triggers.",
        image: "/projects/blokamine.png",
        alt: "YouTube with desaturated, upside-down media",
        fit: "contain",
        cardRatio: "1600 / 934",
        surface: "dark",
        pointer: { x: "56%", y: "48%", length: "22%", angle: "158deg" },
      },
      {
        title: "Hide the reward signals.",
        text: "Remove likes, views, follower counts, and notification badges.",
        image: "/projects/blokamine-settings.png",
        alt: "blokamine core experience settings",
        fit: "contain",
        surface: "light",
        pointer: { x: "88%", y: "22%", length: "26%", angle: "166deg" },
      },
      {
        title: "Choose what to remove.",
        text: "Hide Reels, comments, Explore, suggested posts, and Shorts per site.",
        image: "/projects/blokamine-sites.png",
        alt: "blokamine site-specific controls",
        fit: "contain",
        surface: "light",
        pointer: { x: "58%", y: "58%", length: "24%", angle: "158deg" },
      },
      {
        title: "Turn down the rest.",
        text: "Blur or remove media, or flip the page upside down.",
        image: "/projects/blokamine-instagram.png",
        alt: "Instagram with media turned upside down and desaturated",
        fit: "contain",
        cardRatio: "1600 / 900",
        surface: "dark",
        pointer: { x: "52%", y: "48%", length: "22%", angle: "-14deg" },
      },
    ],
  },
  {
    id: "grt-next-bus",
    number: "02",
    name: "GRT Next Bus",
    platform: "Chrome extension",
    headline: "See the next bus without opening Google Maps.",
    why: "Faster than searching Google Maps for the same stop.",
    theme: "mint",
    source: "https://github.com/xiangthebung/grt-bus-time",
    steps: [
      {
        title: "See the next departures.",
        text: "Saved stops show live or scheduled times on the front page.",
        image: "/projects/grt-next-bus.png",
        alt: "GRT Next Bus saved stops and departure times",
        fit: "contain",
        surface: "light",
        display: "portrait-popout",
        portraitRatio: "842 / 1200",
        pointer: { x: "54%", y: "43%", length: "52%", angle: "158deg" },
      },
      {
        title: "Save a stop once.",
        text: "Choose a route, direction, and stop.",
        image: "/projects/grt-add-stop.png",
        alt: "GRT Next Bus add a stop form",
        fit: "contain",
        surface: "light",
        display: "portrait-popout",
        portraitRatio: "830 / 720",
        pointer: { x: "50%", y: "72%", length: "48%", angle: "-14deg" },
      },
      {
        title: "Use Pro for alerts.",
        text: "Add closest-stop sorting, countdowns, and alerts.",
        image: "/projects/grt-pro.png",
        alt: "GRT Next Bus Pro countdown and alert controls",
        fit: "contain",
        surface: "light",
        display: "portrait-popout",
        portraitRatio: "842 / 1196",
        pointer: { x: "85%", y: "8%", length: "52%", angle: "156deg" },
      },
      {
        title: "Leave when the alert arrives.",
        text: "Get a Chrome notification when the bus is close.",
        image: "/projects/grt-alert.png",
        alt: "Chrome notification for an arriving GRT bus",
        fit: "contain",
        cardRatio: "760 / 188",
        surface: "dark",
        pointer: { x: "52%", y: "39%", length: "22%", angle: "-14deg" },
      },
    ],
  },
  {
    id: "pagepack",
    number: "03",
    name: "PagePack",
    platform: "Chrome extension",
    headline: "Save websites. Read them offline.",
    why: "Useful when you have no mobile data.",
    theme: "black",
    source: "https://github.com/xiangthebung/pagepack-extension",
    steps: [
      {
        title: "Save one page or a whole browse.",
        text: "Keep one page or collect pages as you browse.",
        image: "/projects/pagepack.png",
        alt: "PagePack save page and browsing journey options",
        fit: "contain",
        surface: "dark",
        display: "portrait-popout",
        portraitRatio: "826 / 1304",
        pointer: { x: "54%", y: "43%", length: "52%", angle: "158deg" },
      },
      {
        title: "Choose what to save.",
        text: "Follow same-site links, keep supported scripts, and save to a folder.",
        image: "/projects/pagepack-options.png",
        alt: "PagePack link depth and script options",
        fit: "contain",
        surface: "dark",
        display: "portrait-popout",
        portraitRatio: "758 / 904",
        pointer: { x: "61%", y: "58%", length: "48%", angle: "-14deg" },
      },
      {
        title: "Keep a local library.",
        text: "Search saved pages and sort them into folders.",
        image: "/projects/pagepack-library.png",
        alt: "PagePack saved pages library",
        fit: "contain",
        surface: "dark",
        display: "portrait-popout",
        portraitRatio: "760 / 1194",
        pointer: { x: "53%", y: "52%", length: "52%", angle: "158deg" },
      },
      {
        title: "Save packs, not just pages.",
        text: "Open any saved link and read the pack without a connection.",
        image: "/projects/pagepack-folder.png",
        alt: "A PagePack folder containing a 57-page pack",
        fit: "contain",
        surface: "dark",
        display: "portrait-popout",
        portraitRatio: "752 / 1186",
        pointer: { x: "52%", y: "46%", length: "50%", angle: "-14deg" },
      },
      {
        title: "Keep the original look.",
        text: "Styles, images, fonts, and supported media come along. DRM video, live streams, and heavily scripted pages may not.",
        image: "/projects/pagepack-reader.png",
        alt: "A full website open inside the PagePack offline reader",
        fit: "contain",
        cardRatio: "1600 / 1002",
        surface: "light",
        pointer: { x: "56%", y: "54%", length: "22%", angle: "158deg" },
      },
    ],
  },
  {
    id: "pdf-explainer",
    number: "04",
    name: "PDF Slide Explainer",
    platform: "Web app",
    status: "Work in progress",
    headline: "Turn a lecture PDF into an interactive study layer.",
    why: "Hover for help, move away to read, then quiz or ask the current slide.",
    theme: "white",
    source: "https://github.com/xiangthebung/pdf-explainer",
    live: "https://pdf-explainer.ai.studio/",
    steps: [
      {
        title: "Study without leaving the deck.",
        text: "Upload a lecture PDF. Notes, questions, and tutoring open over the current slide.",
        image: "/projects/pdf-explainer-demo-poster.png",
        video: "/projects/pdf-explainer-demo.mp4",
        poster: "/projects/pdf-explainer-demo-poster.png",
        alt: "PDF Slide Explainer demo showing notes, a quiz, and the AI tutor over lecture slides",
        fit: "contain",
        cardRatio: "1600 / 1034",
        surface: "dark",
        pointer: { x: "81%", y: "53%", length: "28%", angle: "150deg" },
      },
      {
        title: "Move away. The slide comes back.",
        text: "The study layer fades when the pointer leaves it, keeping the original slide easy to reach.",
        image: "/projects/pdf-explainer-transparency.png",
        alt: "The PDF Slide Explainer study layer fading to reveal the lecture slide underneath",
        fit: "contain",
        cardRatio: "1600 / 1034",
        surface: "dark",
        pointer: { x: "82%", y: "52%", length: "22%", angle: "-16deg" },
      },
      {
        title: "Try an answer. See the reasoning.",
        text: "Generate a multiple-choice check and a worked practice problem from the current slide.",
        image: "/projects/pdf-explainer-quiz.png",
        alt: "PDF Slide Explainer showing quiz feedback and a worked practice problem",
        fit: "contain",
        cardRatio: "1600 / 1034",
        surface: "dark",
        pointer: { x: "75%", y: "64%", length: "24%", angle: "158deg" },
      },
      {
        title: "Ask a tutor that knows the slide.",
        text: "Get a slide-specific answer while the diagram and source context stay visible underneath.",
        image: "/projects/pdf-explainer-tutor.png",
        alt: "PDF Slide Explainer AI tutor comparing trilateration and triangulation",
        fit: "contain",
        cardRatio: "1600 / 1034",
        surface: "dark",
        pointer: { x: "75%", y: "48%", length: "22%", angle: "-16deg" },
      },
      {
        title: "Switch up the practice.",
        text: "Generate matching, fill-in-the-blank, practice problems, and quizzes. A Gemini API key is required.",
        image: "/projects/pdf-explainer-match.png",
        alt: "PDF Slide Explainer matching activity with correct and incorrect concept pairs",
        fit: "contain",
        cardRatio: "1374 / 772",
        surface: "dark",
        pointer: { x: "53%", y: "57%", length: "22%", angle: "158deg" },
      },
    ],
  },
  {
    id: "choir-practice",
    number: "05",
    name: "Choir Practice Tool",
    platform: "Web app",
    headline: "Practice one choir part in the browser.",
    why: "Play the full score, isolate your part, and check pitch.",
    theme: "navy",
    source: "https://github.com/xiangthebung/satb-practice",
    live: "https://satb-practice.xiangli3625.workers.dev/",
    steps: [
      {
        title: "Play the full score.",
        text: "Open an uncompressed MusicXML file and hear every part.",
        image: "/projects/choir-overview.png",
        alt: "Choir Practice Tool playing a six-part score",
        fit: "contain",
        cardRatio: "1600 / 919",
        surface: "dark",
        pointer: { x: "65%", y: "48%", length: "24%", angle: "158deg" },
      },
      {
        title: "Bring out your part.",
        text: "Choose a section and lower the others.",
        image: "/projects/choir-mix.png",
        alt: "Choir Practice Tool part mixer and volume presets",
        fit: "contain",
        surface: "dark",
        display: "portrait-popout",
        portraitRatio: "562 / 1994",
        calloutSide: "right",
        pointer: { x: "19%", y: "56%", length: "78%", angle: "-10deg" },
      },
      {
        title: "Check your pitch.",
        text: "Use the microphone to see pitch over the score.",
        image: "/projects/choir-pitch.png",
        alt: "Choir Practice Tool showing live pitch guidance",
        fit: "contain",
        cardRatio: "1600 / 921",
        surface: "dark",
        pointer: { x: "43%", y: "66%", length: "18%", angle: "168deg" },
      },
      {
        title: "Focus on one line.",
        text: "Dim the other sections while you practice.",
        image: "/projects/choir-focus.png",
        alt: "Choir Practice Tool with the tenor section in focus",
        fit: "contain",
        cardRatio: "1600 / 923",
        surface: "dark",
        pointer: { x: "48%", y: "65%", length: "31%", angle: "-12deg" },
      },
      {
        title: "Slow down and loop passages.",
        text: "Use tempo control, metronome, repeat, passage practice, and WAV export. Compressed .mxl files are not supported.",
        image: "/projects/choir-practice.png",
        alt: "Choir Practice Tool playing a four-part score",
        fit: "contain",
        cardRatio: "1600 / 922",
        surface: "dark",
        pointer: { x: "50%", y: "92%", length: "23%", angle: "-148deg" },
      },
    ],
  },
  {
    id: "zen-n-back",
    number: "06",
    name: "Zen N-Back",
    platform: "Web game",
    headline: "Play dual or triple N-back.",
    why: "Set the difficulty, learn the rules, and play a short session.",
    theme: "forest",
    source: "https://github.com/xiangthebung/n-back",
    live: "https://n-back.ai.studio/",
    steps: [
      {
        title: "Set the difficulty.",
        text: "Choose dual or triple N-back, memory depth, speed, and optional help.",
        image: "/projects/zen-n-back.png",
        alt: "Zen N-Back setup screen",
        fit: "contain",
        cardRatio: "1600 / 1467",
        surface: "dark",
        pointer: { x: "50%", y: "35%", length: "22%", angle: "158deg" },
      },
      {
        title: "Learn what counts.",
        text: "See how position, letters, and colour count as matches.",
        image: "/projects/nback-tutorial.png",
        alt: "Zen N-Back tutorial explaining a dual match",
        fit: "contain",
        cardRatio: "1600 / 1527",
        surface: "dark",
        pointer: { x: "51%", y: "53%", length: "21%", angle: "-14deg" },
      },
      {
        title: "Play a short session.",
        text: "Use the buttons or keyboard, then check your stats. It’s a game, not a clinical test.",
        image: "/projects/nback-game.png",
        alt: "Zen N-Back game board",
        fit: "contain",
        cardRatio: "1600 / 1459",
        surface: "dark",
        pointer: { x: "52%", y: "48%", length: "22%", angle: "158deg" },
      },
    ],
  },
];

// Keep the monochrome blokamine section between two color-led projects.
export const projects: Project[] = [
  projectData[1],
  projectData[0],
  projectData[2],
  projectData[3],
  projectData[4],
  projectData[5],
].map((project, index) => ({
  ...project,
  number: String(index + 1).padStart(2, "0"),
}));

export const entranceStyles = [
  "orbit",
  "drop",
  "pop",
  "whip",
  "rise",
  "flip",
] as const;

export const projectMotifs: Record<string, { label: string; mark: string }> = {
  blokamine: { label: "colour off", mark: "B/W" },
  "grt-next-bus": { label: "next stop", mark: "●—●" },
  pagepack: { label: "saved offline", mark: "⇩" },
  "pdf-explainer": { label: "next slide", mark: "▱" },
  "choir-practice": { label: "follow along", mark: "♪" },
  "zen-n-back": { label: "next round", mark: "▦" },
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
