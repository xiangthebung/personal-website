"use client";

/**
 * 2FA Paster, as the two verdicts it can reach.
 *
 * The convenience is easy to state and boring to watch: a code arrives, a keypress
 * puts it in the box. What the extension actually has — and what 1.3.0 put on
 * screen for the first time — is an account of *what it did and why*, and a refusal
 * to finish the job when it cannot vouch for the sender. So the film is two takes
 * of the same page.
 *
 *   THE CLEAN CASE. One mail, from the site in front of you. The shortcut is
 *   pressed, the six digits leave the mail row and land in the six boxes, the
 *   page's own Verify is pressed, and the popup shows the decision card: the
 *   sender's address rather than its display name, a green pill saying it is the
 *   site you are on, what was filled, what was pressed, and the one field it
 *   would not write to — "Security code", the card field, left empty.
 *
 *   THE AMBIGUOUS CASE. Two codes arrive at once, both through relay senders,
 *   neither naming the site. `deliver()` computes `hold = ambiguous && !siteMatch`
 *   and `content.js fill()` skips `submitFrom` when held: the code goes in, the
 *   button is not pressed, the in-page card reads "Held — check the sender" and
 *   offers "Submit anyway" and the other recent codes, one click each.
 *
 * WHAT IS REAL HERE
 *
 * Every string the popup, the page card and the badge print is the product's:
 * the decision rows come from `renderOutcome` (`Filled “Verification code”`,
 * `Pressed Verify`, `Skipped “Security code” — card field`, `Copied to your
 * clipboard`, `Not submitted — check the sender first`), the pills from
 * `renderOrigin`, the page card's title/detail/note from `fill()` in `content.js`
 * (`Code filled in, Verify pressed`, `Held — check the sender`, `Filled but not
 * submitted: several codes arrived and none name ledgerline.example.`), the
 * picker heading `Other recent codes` and its `Use NNNNNN instead` rows from
 * `showCard`, the badge glyphs and colours from `flashBadge` (`…` violet, `✓`
 * #1b8a3a, `?` amber while held). The popup is 380px because Chrome gives it
 * 380px; its palette is `popup.css` verbatim; the page card is `CARD_STYLE`
 * verbatim. The two relay senders and the held code are the ones the product's
 * own screenshots were taken with.
 *
 * WHAT IS STAGED
 *
 * The keyboard chord, drawn for the beat it happens on. The mail strip, which is
 * a reconstruction of the unread inbox `inbox-feed.js` reads — sender, address,
 * subject, snippet, and the newest at the top. The six digits flying out of the
 * mail and into the boxes, which nothing does; that is the project's own first
 * sentence, drawn. And two liberties so the last frame can be a diagram: the
 * violet outline `content.js` lifts after 1200ms stays up, and the popup shows
 * its whole card rather than the 600px Chrome would scroll it inside.
 *
 * The site is invented. Ledgerline, its checkout, its card on file and its copy
 * are the scene's; nothing here is a brand.
 */

import { useEffect, useRef, type CSSProperties } from "react";
import { PhantomCursor } from "../scene/cursor";
import { usePressGate } from "../scene/press-gate";
import { useSectionBeat } from "../scene/section-beat";
import { SpecTags, type SpecTag } from "../scene/spec";
import { useStoryboard, type Beat } from "../scene/storyboard";
import { useOnScreen } from "../use-on-screen";
import { useSceneRun } from "../scene/use-scene-run";
import { useSectionFocused } from "../use-section-focus";
import "./demo.css";

type BeatName =
  | "form"
  | "mail"
  | "pick"
  | "fill"
  | "submit"
  | "why"
  | "again"
  | "chord"
  | "hold"
  | "offer";

/**
 * Ten beats over 20.1 seconds, in two acts.
 *
 * The first act is the shape every scene here has — establish, act, account for
 * the act. `form` and `mail` are the setup: empty boxes, an empty inbox, one mail
 * landing in it. `pick` is the keypress and the scorer's choice in one beat, because
 * both are fast. `fill` has to be long enough for six digits to cross the frame on a
 * stagger. `submit` is the page's own button going down and the card saying so.
 * `why` is the popup opening on a click and a reader being given three seconds with
 * a card that has seven lines on it.
 *
 * The second act is the same page, later. `again` is the cut: the boxes clear, the
 * card goes, two new mails land on top of the old one. `chord` is the keypress
 * again. `hold` is the whole argument of the release — the code goes in and the
 * button does not go down — and `offer` is the reader's time with the picker, which
 * is also the still.
 */
const BEATS: readonly Beat<BeatName>[] = [
  { name: "form", ms: 1600 },
  { name: "mail", ms: 2000 },
  { name: "pick", ms: 1400 },
  { name: "fill", ms: 2000 },
  { name: "submit", ms: 1800 },
  { name: "why", ms: 3000 },
  { name: "again", ms: 1800 },
  { name: "chord", ms: 1300 },
  { name: "hold", ms: 2400 },
  { name: "offer", ms: 2800 },
];

/**
 * Where the pointer is. One click, one hover.
 *
 * Everything else happens without anybody touching the browser, which is the point
 * of the keyboard path. The popup is opened on `why` for the reason a person opens
 * it — to see what it decided — and `usePressGate` holds the panel back until the
 * ring lands. On `offer` the pointer comes back to rest on the picker's first row
 * and presses nothing: the claim is that the other code is one click away, and a
 * hand hovering over the click is the picture of that.
 */
const CURSOR: Partial<Record<BeatName, string>> = { why: "toolbar", offer: "swap" };
const OPENS: ReadonlySet<BeatName> = new Set<BeatName>(["why"]);

/** The site in the address bar, and therefore the site every sender is matched against. */
const SITE = "ledgerline.example";
/** The account the popup header shows, in `popup.js`'s connected green. */
const MAILBOX = "you@gmail.com";
/** The suggested key in `manifest.json`, under `commands.paste-code`. */
const CHORD: readonly string[] = ["Ctrl", "Shift", "2"];

/**
 * The three mails, in the order they arrive. The senders are invented; the
 * addresses are the ones the product's own held-state screenshots were taken with,
 * and the point of the second act is that two of them are relay domains that name
 * no site at all.
 */
const LEDGERLINE = {
  from: "Ledgerline",
  address: "no-reply@ledgerline.example",
  subject: "482917 is your Ledgerline verification code",
  snippet: "Enter this code to confirm your payment. It expires in 10 minutes.",
  code: "482917",
  site: "ledgerline.example",
  initial: "L",
};

const ACCOUNT_TEAM = {
  from: "Account Team",
  address: "noreply@accountprotection.net",
  subject: "Your verification code is 558102",
  snippet: "Use this code to continue. If you did not request it, ignore this email.",
  code: "558102",
  site: "accountprotection.net",
  initial: "A",
};

const NORTHWIND = {
  from: "Northwind Market",
  address: "bounce@sendgrid.net",
  subject: "771204 is your Northwind sign-in code",
  snippet: "Your one-time code expires in 5 minutes. Do not share it with anyone.",
  code: "771204",
  site: "sendgrid.net",
  initial: "N",
};

type RowTone = "ok" | "skip" | "hold";

/**
 * The two decision cards, line by line, as `popup.js` renders them and as
 * `content.js` draws the page card for the same fill.
 *
 * The rows are in `renderOutcome`'s order: what was filled, what happened to the
 * submit, what was refused, and whether the code was copied. `Skipped “Security
 * code” — card field` is on both, because the page has a card field on it both
 * times and the extension declines it both times.
 */
const CLEAN = {
  code: LEDGERLINE.code,
  source: "From Ledgerline · 12s ago",
  address: LEDGERLINE.address,
  pill: { tone: "match", title: `Sent by ${SITE} — the site you are on`, note: "" },
  rows: [
    ["ok", "Filled “Verification code”"],
    ["ok", "Pressed Verify"],
    ["skip", "Skipped “Security code” — card field"],
    ["ok", "Copied to your clipboard"],
  ] as const satisfies readonly (readonly [RowTone, string])[],
  sure: "100% sure",
  toast: {
    title: "Code filled in, Verify pressed",
    detail: `2FA Paster · from ${LEDGERLINE.address}`,
    note: "",
  },
};

const HELD = {
  code: ACCOUNT_TEAM.code,
  source: "From Account Team · 12s ago",
  address: ACCOUNT_TEAM.address,
  pill: {
    tone: "unsure",
    title: "Held — check the sender",
    note: `Several codes just arrived and none name ${SITE}.`,
  },
  rows: [
    ["ok", "Filled “Verification code”"],
    ["hold", "Not submitted — check the sender first"],
    ["skip", "Skipped “Security code” — card field"],
    ["ok", "Copied to your clipboard"],
  ] as const satisfies readonly (readonly [RowTone, string])[],
  sure: "93% sure",
  toast: {
    title: "Held — check the sender",
    detail: `2FA Paster · from ${ACCOUNT_TEAM.address}`,
    note: `Filled but not submitted: several codes arrived and none name ${SITE}.`,
  },
};

/**
 * The other codes, newest first, as both the popup's held card and the page card's
 * picker list them: `pickerRows` and `renderHeld` both read the same history with
 * the current code left out.
 */
const ALTERNATIVES = [
  { code: NORTHWIND.code, address: NORTHWIND.address, age: "12s ago" },
  { code: LEDGERLINE.code, address: LEDGERLINE.address, age: "2 min ago" },
] as const;

/**
 * The five claims, each pinned to the thing that proves it.
 *
 * Every one is anchored rather than pinned to a percentage, and every one is still
 * pointing at something in the last frame — which is the constraint that decided
 * the staging. The inbox label hangs off the top of the list rather than off a row,
 * because the newest mail takes the top slot and the label is about the list.
 */
const SPECS: readonly SpecTag<BeatName>[] = [
  /* On the inbox. The claim is about setup and setup is the absence of something,
     so what the frame can show is mail simply being there: no sign-in, no connect
     step, no key pasted anywhere. `inbox-feed.js` reads the Atom feed Gmail already
     serves to the session cookie in the browser. Gripped to the list's top-right
     corner and pushed down half a row, so it sits beside whichever mail is newest. */
  {
    at: "mail",
    text: "Read from Gmail with no setup",
    x: 50,
    y: 82,
    anchor: "inbox",
    grip: "top right",
    nudge: { y: 34 },
    side: "right",
  },
  /* On the CVV box, which stays empty in both acts. "Security code" is the card
     label on most checkout pages, so the rule has to beat the strongest positive
     signal the field could carry — and the popup then says so in as many words. */
  {
    at: "fill",
    text: "The card field is never touched",
    x: 14,
    y: 27,
    anchor: "cvv",
    grip: "right",
    side: "right",
  },
  /* On the address line of the decision card, reading left into the corridor. This
     is the change 1.3.0 made to the source line: a spoofed display name is
     indistinguishable, an address is not — and in the second act the name reads
     "Account Team" while the address reads a relay domain. */
  {
    at: "why",
    text: "The sender's address, not its name",
    x: 66,
    y: 28,
    anchor: "address",
    grip: "left",
    side: "left",
    nudge: { x: -4 },
  },
  /* On the page's own Verify button, which the second fill leaves alone. The
     evidence is a button that did not go down under a code that went in. */
  {
    at: "hold",
    text: "Unknown sender, so held, not sent",
    x: 40,
    y: 45,
    anchor: "verify",
    grip: "right",
    side: "right",
  },
  /* On the picker's first row in the page card, which is also where the pointer
     comes to rest. The still is held on this frame. The claim is the recovery: if
     the scorer's choice was not the one you wanted, the ones it did not choose are
     listed, with their senders, and one click swaps. */
  {
    at: "offer",
    text: "The other codes are one click away",
    x: 40,
    y: 60,
    anchor: "swap",
    grip: "right",
    side: "right",
  },
];

/** Where the labels come from: the extension's own toolbar button. */
const SPEC_ORIGIN = { x: 96.5, y: 2.5 };

/** The order the payment page is confirming. Set dressing, and quiet on purpose. */
const SUMMARY: readonly { label: string; note: string; value: string }[] = [
  { label: "Brightwater Studio", note: "Slate print, A2", value: "$42.00" },
  { label: "Delivery", note: "Standard, 3–5 days", value: "$6.20" },
  { label: "Ledgerline fee", note: "Included", value: "$0.00" },
];

/** The extension's brand mark: a card with three dots on it. From `popup.html`. */
function Mark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect x="4" y="11" width="24" height="13" rx="4" />
      <circle cx="10" cy="17.5" r="1.9" />
      <circle cx="16" cy="17.5" r="1.9" />
      <circle cx="22" cy="17.5" r="1.9" />
    </svg>
  );
}

function Envelope() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 6.5h15v11h-15zM4.5 8l7.5 5 7.5-5" />
    </svg>
  );
}

/** How long the mail rows take to change slot. Shorter than `spec.tsx`'s settle. */
const ROW_MOVE_MS = 360;

export function TwoFactorPasterDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  const focused = useSectionFocused(stageRef);
  const running = useSceneRun(focused, onScreen);
  const state = useStoryboard(BEATS, {
    running,
    stage: stageRef,
    /* The frame that carries the argument: a code in the boxes, the button under
       them not pressed, the page card saying why and offering the other code, the
       popup's held card open beside it, and all five labels pinned. */
    stillBeat: "offer",
  });
  const { beat, index, run, still } = state;
  const { reached, onPress } = usePressGate(BEATS, state, OPENS);

  /* The section reacts to the verdicts — a violet wash for the pass, an amber one
     for the hold. See `#two-factor-paster` in globals.css. */
  useSectionBeat(stageRef, beat, BEATS);

  const at = (name: BeatName) => BEATS.findIndex((entry) => entry.name === name);

  /* --- act one ------------------------------------------------------------ */
  const second = index >= at("again");
  const act = second ? 2 : 1;
  const landed = index >= at("mail");
  const picked = index >= at("pick") && !second;
  const filledClean = index >= at("fill") && !second;
  const submitted = index >= at("submit") && !second;
  /* Held back until the ring lands on the toolbar button. Without the gate the panel
     is open five frames before anything says it was clicked. */
  const open = reached >= at("why");

  /* --- act two ------------------------------------------------------------ */
  const arrived = index >= at("again");
  const pickedHeld = index >= at("chord");
  const held = index >= at("hold");
  const offering = index >= at("offer");

  const filled = second ? held : filledClean;
  const decision = held ? HELD : CLEAN;
  const digits = [...(second ? HELD.code : CLEAN.code)];

  /* `…` while it looks, `✓` once a code is in the page, `?` while one is held —
     `flashBadge` in `background.js`, with its colours. Nothing in between: the badge
     is the only status there is when the popup is closed, and it says nothing when
     there is nothing to say. */
  const looking = beat === "pick" || beat === "chord";
  const badge = held ? "?" : filled ? "✓" : looking ? "…" : "";

  /**
   * Where the six digits fly from.
   *
   * The vector from the code in the mail row to the first box, measured rather than
   * authored, because the row that carries it is a different row in each act and
   * moves slot between them. Written onto the stage as custom properties the
   * stylesheet reads; see `--tfa-fly-x` there. Measured on every beat and once more
   * after the entrances have settled, the same way `spec.tsx` measures its anchors.
   *
   * Below 760px the stylesheet shortens the flight to a rise into the boxes — the
   * strip is most of a thousand pixels below the form there — so the measurement
   * stands down and lets the stylesheet's numbers through.
   */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const wide = window.matchMedia("(min-width: 761px)");
    let frame = 0;
    let settle = 0;

    const measure = () => {
      frame = 0;
      if (!wide.matches) {
        stage.style.removeProperty("--tfa-fly-x");
        stage.style.removeProperty("--tfa-fly-y");
        stage.style.removeProperty("--tfa-step");
        return;
      }
      const from = stage.querySelector<HTMLElement>(`[data-fly-from="${act}"]`);
      const boxes = stage.querySelectorAll<HTMLElement>(".tfa-box");
      if (!from || boxes.length < 2) return;
      const source = from.getBoundingClientRect();
      const first = boxes[0].getBoundingClientRect();
      const next = boxes[1].getBoundingClientRect();
      if (source.width === 0 || first.width === 0) return;
      const x = source.left + source.width / 2 - (first.left + first.width / 2);
      const y = source.top + source.height / 2 - (first.top + first.height / 2);
      stage.style.setProperty("--tfa-fly-x", `${x.toFixed(1)}px`);
      stage.style.setProperty("--tfa-fly-y", `${y.toFixed(1)}px`);
      stage.style.setProperty("--tfa-step", `${(next.left - first.left).toFixed(1)}px`);
    };

    const request = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    request();
    settle = window.setTimeout(request, ROW_MOVE_MS + 120);
    window.addEventListener("resize", request);
    const observer = new ResizeObserver(request);
    observer.observe(stage);

    return () => {
      window.removeEventListener("resize", request);
      observer.disconnect();
      window.clearTimeout(settle);
      cancelAnimationFrame(frame);
    };
  }, [act, beat, run]);

  const toast = second ? HELD.toast : CLEAN.toast;
  const toastShown = second ? held : submitted;

  return (
    <div
      className="tfa"
      ref={stageRef}
      data-beat={beat}
      data-lap={run}
      data-act={act}
      data-landed={landed}
      data-picked={picked}
      data-filled={filled}
      data-submitted={submitted}
      data-open={open}
      data-arrived={arrived}
      data-picked-held={pickedHeld}
      data-held={held}
      data-offering={offering}
      role="img"
      aria-label={
        "A payment confirmation page with the 2FA Paster extension pinned to the " +
        "browser toolbar. The page carries a saved card, an empty box labelled " +
        "Security code, six empty boxes labelled Verification code, and a Verify " +
        "button. An unread message from Ledgerline, the site being paid, arrives in " +
        "Gmail below with the code 482917 in it. The shortcut Ctrl+Shift+2 is pressed: " +
        "the six digits leave the message and land one per box, the Security code box " +
        "stays empty, Verify is pressed, and a card in the page reads Code filled in, " +
        "Verify pressed. The extension's popup is opened and shows the code at reading " +
        "size, the sender's address, that it was sent by ledgerline.example, the site " +
        "you are on, and that it filled Verification code, pressed Verify and skipped " +
        "Security code as a card field. Later the boxes are empty again and two more " +
        "codes arrive at once, from noreply@accountprotection.net and " +
        "bounce@sendgrid.net, neither naming the site. The shortcut is pressed again: " +
        "558102 goes into the boxes but Verify is not pressed. The page card reads " +
        "Held, check the sender, offers Submit anyway, and lists the other recent " +
        "codes under Other recent codes, each one click away. The popup shows the same " +
        "held verdict and the same choices."
      }
    >
      <div className="tfa-browser">
        <div className="tfa-chrome">
          <span className="tfa-lights" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="tfa-tabs">
            <span className="tfa-tab is-active">
              <i className="tfa-favicon tfa-favicon--site" />
              Confirm your payment
            </span>
            <span className="tfa-tab">
              <i className="tfa-favicon" />
              Basket
            </span>
          </span>
          <span className="tfa-bar">
            <span className="tfa-omni">{SITE}/checkout/confirm</span>
            {/* The only thing in the chrome with full contrast, and the only thing
                clicked in the whole scene. */}
            <span className="tfa-action" data-target="toolbar" data-open={open}>
              <span className="tfa-action-mark">
                <Mark />
              </span>
              {/* Keyed by its own text, so a change of glyph remounts the element and
                  replays the tick without the scene having to track when it changed. */}
              <b className="tfa-badge" key={badge} data-glyph={badge || "none"}>
                {badge}
              </b>
            </span>
          </span>
        </div>

        <div className="tfa-page">
          {/* --- the page's own form ------------------------------------------- */}
          <div className="tfa-column">
            <div className="tfa-pay">
              <p className="tfa-pay-head">Confirm your payment</p>
              <p className="tfa-pay-sub">Ledgerline is confirming $48.20 for you</p>

              <div className="tfa-card-row">
                <span className="tfa-card-face">
                  <i className="tfa-card-chip" aria-hidden="true" />
                  <span>
                    <b>Visa ···· 4126</b>
                    <small>Expires 09 / 29</small>
                  </span>
                </span>
                <span className="tfa-card-kind">Saved card</span>
              </div>

              {/* The field the extension refuses. Its label is the CVV label on most
                  checkout pages, which is exactly why `PAYMENT_HINT` has to beat it. */}
              <div className="tfa-field">
                <span className="tfa-field-label">Security code</span>
                <span className="tfa-cvv" data-spec-anchor="cvv" data-skipped={filled}>
                  <i />
                  <i />
                  <i />
                </span>
              </div>

              <div className="tfa-rule" aria-hidden="true" />

              {/* The field it fills. "Verification code" is the label `targetLabel`
                  reads off the page and the popup then quotes back. */}
              <div className="tfa-field">
                <span className="tfa-field-label">Verification code</span>
                <span className="tfa-field-hint">We emailed a 6-digit code to {MAILBOX}</span>
                <div className="tfa-boxes" data-spec-anchor="boxes">
                  {digits.map((digit, position) => (
                    <span className="tfa-box" key={position}>
                      {/* Rendered from the first frame and flown in on the fill beat,
                          because the journey is the claim. Each starts at the code in
                          the mail row below — see the measurement above — and is keyed
                          on the act and the lap, so a cut or a loop rebuilds them at the
                          start of the flight rather than transitioning backwards out of
                          the boxes. */}
                      <b
                        className="tfa-digit"
                        key={`${run}-${act}-${position}`}
                        style={{ "--tfa-i": position } as CSSProperties}
                      >
                        {digit}
                      </b>
                    </span>
                  ))}
                </div>
              </div>

              {/* The page's own button. Pressed by the extension in the first act —
                  `SUBMIT_TEXT` matches it and it is the form's declared submit — and
                  left alone in the second, which is the whole of the second act. */}
              <span
                className="tfa-verify"
                data-spec-anchor="verify"
                data-pressed={submitted}
                data-held={held}
              >
                Verify
              </span>
            </div>

            {/* `showCard` draws this in a closed shadow root at the bottom-right of the
                page. It sits under the form here because the page's own bottom-right
                corner is where the popup hangs. Its title, detail and note are the
                strings `fill()` passes; the picker is `pickerRows` with the current
                code left out. */}
            <div className="tfa-toast" data-tone={second ? "hold" : "ok"} data-shown={toastShown}>
              <div className="tfa-toast-head">
                <span className="tfa-toast-mark" aria-hidden="true">
                  {second ? "!" : "✓"}
                </span>
                <span className="tfa-toast-copy">
                  <b>{toast.title}</b>
                  <small>{toast.detail}</small>
                  {toast.note && <em className="tfa-toast-note">{toast.note}</em>}
                </span>
                <span className="tfa-toast-close" aria-hidden="true">
                  ×
                </span>
              </div>
              {second && (
                <>
                  <div className="tfa-toast-actions">
                    <span className="tfa-toast-button">Submit anyway</span>
                  </div>
                  <div className="tfa-toast-picker">
                    <span className="tfa-toast-picker-title">Other recent codes</span>
                    {ALTERNATIVES.map((other, order) => (
                      <span
                        className="tfa-toast-row"
                        key={other.code}
                        data-spec-anchor={order === 0 ? "swap" : undefined}
                        data-target={order === 0 ? "swap" : undefined}
                        data-aimed={order === 0 && offering}
                      >
                        <strong>
                          Use <b>{other.code}</b> instead
                        </strong>
                        <small>
                          {other.address} · {other.age}
                        </small>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* --- the rest of the page ------------------------------------------- */}
          <div className="tfa-summary" aria-hidden="true">
            <p className="tfa-summary-head">Order summary</p>
            <ul className="tfa-summary-list">
              {SUMMARY.map((row) => (
                <li key={row.label}>
                  <span>
                    <b>{row.label}</b>
                    <small>{row.note}</small>
                  </span>
                  <span>{row.value}</span>
                </li>
              ))}
            </ul>
            <p className="tfa-summary-total">
              <span>Total</span>
              <span>$48.20</span>
            </p>
            <dl className="tfa-summary-block">
              <dt>Status</dt>
              <dd>
                <ul className="tfa-steps">
                  <li data-done="true">Card verified</li>
                  <li data-done="true">Code sent to your inbox</li>
                  <li data-done={submitted}>
                    {submitted ? "Payment confirmed" : "Waiting for your code"}
                  </li>
                </ul>
              </dd>
            </dl>
            <dl className="tfa-summary-block">
              <dt>Delivering to</dt>
              <dd>
                Unit 4, Wells Road
                <br />
                Kitchener ON
              </dd>
            </dl>
            <p className="tfa-summary-foot">
              Ledgerline holds this payment until the emailed code is confirmed.
            </p>
          </div>

          {/* The chord, for the two beats it happens on. A keypress has no picture and
              this one does the whole job, so it gets drawn and taken away again. */}
          <div className="tfa-keys" aria-hidden="true">
            {CHORD.map((key) => (
              <kbd className="tfa-key" key={key}>
                {key}
              </kbd>
            ))}
          </div>

          {/* --- the popup, at the 380px Chrome gives it ------------------------- */}
          <div className="tfa-pop" data-spec-anchor="popup" data-open={open} data-held={held}>
            <div className="tfa-pop-head">
              <span className="tfa-pop-brand">
                <Mark />
              </span>
              <span className="tfa-pop-name">
                <b>2FA Paster</b>
                <small className="is-connected">{MAILBOX}</small>
              </span>
              <span className="tfa-pop-gear" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 4.5v2m0 11v2m-6.5-9.5 1.7 1M17.8 15l1.7 1M4.5 15l1.7-1M17.8 9l1.7-1" />
                </svg>
              </span>
            </div>

            <div className="tfa-pop-body">
              <div className="tfa-target">
                <span className="tfa-target-mark" aria-hidden="true">
                  <Envelope />
                </span>
                <span className="tfa-target-copy">
                  <b>{SITE}</b>
                  <small className="is-found">Code box found — ready to fill</small>
                </span>
              </div>

              <span className="tfa-primary">
                <span>Get my code</span>
                <kbd className="tfa-shortcut">{CHORD.join("+")}</kbd>
              </span>

              {/* The decision card. Not "a code was found" but what was done with it. */}
              <div className="tfa-code-card">
                <b className="tfa-code">{decision.code}</b>
                <div className="tfa-code-meta">
                  <span className="tfa-code-sender">
                    <span className="tfa-code-source">{decision.source}</span>
                    <span className="tfa-code-address" data-spec-anchor="address">
                      {decision.address}
                    </span>
                  </span>
                  <span className="tfa-code-open">Open in Gmail ↗</span>
                </div>

                <p className={`tfa-origin is-${decision.pill.tone}`}>
                  <strong>{decision.pill.title}</strong>
                  {decision.pill.note && <span>{decision.pill.note}</span>}
                </p>

                <ul className="tfa-outcome">
                  {decision.rows.map(([tone, text]) => (
                    <li className={`is-${tone}`} key={text}>
                      {text}
                    </li>
                  ))}
                </ul>

                {held && (
                  <div className="tfa-held">
                    <span className="tfa-held-submit">Submit anyway</span>
                    {ALTERNATIVES.map((other) => (
                      <span className="tfa-alt" key={other.code}>
                        <strong>Use {other.code} instead</strong>
                        <small>
                          {other.address} · {other.age}
                        </small>
                      </span>
                    ))}
                  </div>
                )}

                <div className="tfa-code-actions">
                  <span>Copy</span>
                  <span>Fill and submit</span>
                </div>

                <div className="tfa-why">
                  <span>Why this one</span>
                  <span className="tfa-why-value">{decision.sure}</span>
                  <i className="tfa-chevron" aria-hidden="true" />
                </div>
              </div>

              {/* `2 more`: the history less the code on display. Only once there is a
                  history — the first act's inbox held one mail. */}
              {held && (
                <div className="tfa-history">
                  <span>Recent codes</span>
                  <span className="tfa-history-count">2 more</span>
                  <i className="tfa-chevron" aria-hidden="true" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- the inbox the codes actually arrive in -------------------------- */}
      {/* Below the window rather than inside it, because that is where the mail is:
          another tab, another window, a phone — somewhere the whole point is that
          you do not have to go. Newest at the top, the way Gmail keeps it, so the
          rows are slotted rather than flowed and the old mail sinks when new ones
          land. */}
      <div className="tfa-inbox">
        <p className="tfa-inbox-head">
          <span className="tfa-inbox-mark" aria-hidden="true">
            <Envelope />
          </span>
          Gmail — unread inbox
        </p>
        <ul className="tfa-mail" data-spec-anchor="inbox">
          <li
            className="tfa-mail-row"
            data-landed={landed}
            data-state={second ? "older" : picked ? "chosen" : "new"}
            style={{ "--slot": second ? 2 : 0 } as CSSProperties}
          >
            <span className="tfa-avatar" data-who="site" aria-hidden="true">
              {LEDGERLINE.initial}
            </span>
            <span className="tfa-mail-copy">
              <span className="tfa-mail-from">
                <b>{LEDGERLINE.from}</b>
                <small>{LEDGERLINE.address}</small>
              </span>
              <p className="tfa-mail-subject">{LEDGERLINE.subject}</p>
              <p className="tfa-mail-snippet">{LEDGERLINE.snippet}</p>
            </span>
            <span className="tfa-mail-side">
              <b className="tfa-mail-code" data-fly-from="1">
                {LEDGERLINE.code}
              </b>
              <span className="tfa-mail-tag">{LEDGERLINE.site}</span>
              <span className="tfa-mail-age">{second ? "2 min ago" : "just now"}</span>
            </span>
          </li>

          <li
            className="tfa-mail-row"
            data-landed={arrived}
            data-state={pickedHeld ? "held" : "new"}
            style={{ "--slot": 0 } as CSSProperties}
          >
            <span className="tfa-avatar" data-who="relay" aria-hidden="true">
              {ACCOUNT_TEAM.initial}
            </span>
            <span className="tfa-mail-copy">
              <span className="tfa-mail-from">
                <b>{ACCOUNT_TEAM.from}</b>
                <small>{ACCOUNT_TEAM.address}</small>
              </span>
              <p className="tfa-mail-subject">{ACCOUNT_TEAM.subject}</p>
              <p className="tfa-mail-snippet">{ACCOUNT_TEAM.snippet}</p>
            </span>
            <span className="tfa-mail-side">
              <b className="tfa-mail-code" data-fly-from="2">
                {ACCOUNT_TEAM.code}
              </b>
              <span className="tfa-mail-tag">{ACCOUNT_TEAM.site}</span>
              <span className="tfa-mail-age">just now</span>
            </span>
          </li>

          <li
            className="tfa-mail-row"
            data-landed={arrived}
            data-late="true"
            data-state={pickedHeld ? "aside" : "new"}
            style={{ "--slot": 1 } as CSSProperties}
          >
            <span className="tfa-avatar" data-who="relay" aria-hidden="true">
              {NORTHWIND.initial}
            </span>
            <span className="tfa-mail-copy">
              <span className="tfa-mail-from">
                <b>{NORTHWIND.from}</b>
                <small>{NORTHWIND.address}</small>
              </span>
              <p className="tfa-mail-subject">{NORTHWIND.subject}</p>
              <p className="tfa-mail-snippet">{NORTHWIND.snippet}</p>
            </span>
            <span className="tfa-mail-side">
              <b className="tfa-mail-code">{NORTHWIND.code}</b>
              <span className="tfa-mail-tag">{NORTHWIND.site}</span>
              <span className="tfa-mail-age">just now</span>
            </span>
          </li>
        </ul>
      </div>

      {!still && (
        <PhantomCursor
          stage={stageRef}
          target={CURSOR[beat] ?? null}
          pressing={OPENS.has(beat)}
          onPress={onPress}
          token={`${run}-${beat}`}
        />
      )}

      {/* No caption. Everything a line under this would have said is printed inside
          the frame already — the code is in the boxes, the sender is on the row, the
          verdict is on the card — and the five claims that are not printed anywhere
          are pinned to the things that prove them. */}
      <SpecTags
        beats={BEATS}
        beat={beat}
        tags={SPECS}
        origin={SPEC_ORIGIN}
        className="tfa-specs"
      />
    </div>
  );
}
