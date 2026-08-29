"use client";

/**
 * 2FA Paster, as the two decisions it makes.
 *
 * The convenience is easy to state and boring to watch: a code arrives, a keypress
 * puts it in the box. Every password manager has a version of that. What this
 * extension actually has, and what a film of it should therefore be about, is the
 * pair of judgements underneath:
 *
 *   WHICH CODE. With one code in the inbox the question never comes up. With two —
 *   which, on an ordinary afternoon, is the normal state of an inbox — the
 *   best-written mail is not necessarily the one for the page in front of you. So
 *   the sender decides, not the wording, and the popup shows the signals it scored
 *   under a "Why this one" disclosure. An extension that shows its reasoning is
 *   unusual enough to be the thing worth staging.
 *
 *   WHERE IT MAY NOT GO. A field that looks like a card security code is
 *   disqualified outright rather than outscored, and a button whose wording is
 *   destructive is skipped before anything else is considered. Both are cheap to
 *   get wrong and expensive to get wrong: "Security code" is the CVV label on most
 *   checkout pages, and "Confirm account deletion" reads exactly like a button that
 *   finishes a code step.
 *
 * So the page in the frame is one that exercises all of it at once — a payment
 * confirmation carrying a saved card, its security-code box, a "Remove this card"
 * control and a six-box one-time-code field. That is not a composite invented to
 * flatter the extension; it is `tests/browser/fixtures/checkout.html` and
 * `destructive.html` in the same document, and every rule below fires on it exactly
 * as the fixtures assert.
 *
 * WHAT IS REAL HERE
 *
 * The two messages in the strip were run through the extension's own
 * `code-finder.js`. `findBestCode` returns 482917 at 100% with the four reasons the
 * popup prints, sets 306184 aside as another company's, and reports `siteMatch`,
 * which is what makes the popup say "Sent by ledgerline.com — the site you are on".
 * The reasons, the percentage and the wording are transcribed from that run rather
 * than composed to look plausible. See the note on `CODE` for the exact call.
 *
 * The badge glyphs and their colours are `background.js`'s: `…` on #5b45e0 while it
 * looks, `✓` on #1b8a3a once a code is in the page. The filled boxes wear
 * #6d5bff, which is the outline `content.js` puts on every field it writes to. The
 * corner card's two lines are `showToast`'s. The popup is `popup.html` in its own
 * order, at the 34px monospace the code is set in there — the one loud thing in an
 * otherwise very quiet interface, and the reason this scene has a hero object at all.
 *
 * WHAT IS STAGED
 *
 * The keyboard chord in the middle of the frame: a keypress has no picture, and the
 * shortcut is the fastest way to use this, so it gets drawn for the beat it happens
 * on. The mail strip is a reconstruction of the unread inbox the default reader sees
 * — `inbox-feed.js` reads Gmail's Atom feed and gets a sender, a subject, a snippet
 * and a timestamp, which is exactly what a row here shows. And the six digits fly
 * out of the mail into the boxes, which nothing does; that is the sentence the
 * project's own README opens with, drawn.
 *
 * Two deliberate infidelities, both so that the last frame can be a diagram:
 * `content.js` lifts the violet outline off a filled field after 1200ms and this
 * leaves it up, and the corner card sits under the payment column rather than at the
 * page's bottom-right corner, which in this pod belongs to the popup.
 */

import { useRef, type CSSProperties } from "react";
import { PhantomCursor } from "../scene/cursor";
import { usePressGate } from "../scene/press-gate";
import { SpecTags, type SpecTag } from "../scene/spec";
import { useStoryboard, type Beat } from "../scene/storyboard";
import { useOnScreen } from "../use-on-screen";
import { useSceneRun } from "../scene/use-scene-run";
import { useSectionFocused } from "../use-section-focus";
import "./demo.css";

type BeatName = "form" | "mail" | "press" | "pick" | "fill" | "submit" | "why";

/**
 * Seven beats over 17.3 seconds.
 *
 * The shape is: establish, complicate, act, and then account for the act. `form`
 * and `mail` are long because they are the setup — a visitor who has not read the
 * page has to work out that the boxes are empty, that there are two mails, and that
 * both of them contain a six-digit number, before anything happens. `press` is
 * short because a keypress is short.
 *
 * `pick` is the longest of the middle beats and it is the one carrying the argument
 * of the whole project: one row lights and the other is set aside. `fill` has to be
 * long enough for six digits to cross the frame on a stagger and settle.
 *
 * `why` is the last and the largest, because it is two things at once — the popup
 * arriving, and the reader being given long enough to read four reasons and a
 * percentage inside it. It is also the still.
 */
const BEATS: readonly Beat<BeatName>[] = [
  { name: "form", ms: 2400 },
  { name: "mail", ms: 2600 },
  { name: "press", ms: 1500 },
  { name: "pick", ms: 2800 },
  { name: "fill", ms: 2600 },
  { name: "submit", ms: 2400 },
  { name: "why", ms: 3000 },
];

/**
 * The one click in the scene, and the only beat with a pointer in it.
 *
 * Everything before this happens without anybody touching the browser, which is the
 * point of the keyboard path. The popup is opened afterwards for the reason a person
 * opens it: to see what it decided. `usePressGate` holds the popup back until the
 * ring lands, so the panel is not already open when the pointer arrives.
 */
const CURSOR: Partial<Record<BeatName, string>> = { why: "toolbar" };
const OPENS: ReadonlySet<BeatName> = new Set<BeatName>(["why"]);

/** The site in the address bar, and therefore the site the sender is matched against. */
const SITE = "ledgerline.com";

/**
 * The two messages, and what the extension's own scorer makes of them.
 *
 * Run against `code-finder.js` from the extension, with `site: "ledgerline.com"`:
 *
 *   findBestCode([ledgerline, northwind], { site: "ledgerline.com" })
 *     → code 482917, confidence 100, siteMatch true, ambiguous false,
 *       reasons ["6 digits", 'near "verification code"', "in the subject",
 *                "sent by ledgerline.com"]
 *       alternatives [{ code: "306184", confidence: 50, siteMatch: false }]
 *
 * Both mails are well-written code mails and the second one scores perfectly
 * respectably on its own — 50%, on wording alone. It loses because of who sent it,
 * which is the distinction the project makes and the reason this scene has two rows
 * in it rather than one. Once any message is tied to the site in front of you,
 * messages identifiably from other companies are removed from consideration
 * entirely rather than merely outscored.
 *
 * The senders are invented. The scoring is not.
 */
const CHOSEN = {
  from: "Ledgerline",
  sender: "no-reply@ledgerline.com",
  subject: "482917 is your Ledgerline verification code",
  snippet: "Enter this code to confirm your payment. It expires in 10 minutes.",
  code: "482917",
  age: "just now",
  tag: SITE,
};

const RIVAL = {
  from: "Northwind Market",
  sender: "no-reply@northwind-market.com",
  subject: "Your Northwind sign-in code",
  snippet: "Your verification code is 306184. Order number 5590142.",
  code: "306184",
  age: "1 min",
  tag: "another service",
};

/** What the popup prints under "Why this one", in the order the scorer produced them. */
const REASONS: readonly string[] = [
  "6 digits",
  'near "verification code"',
  "in the subject",
  `sent by ${SITE}`,
];

/** `confidenceOf` rescales the winning score against 140, which a textbook case clears. */
const CONFIDENCE = "100% sure";

/** The suggested key in `manifest.json`, under `commands.paste-code`. */
const CHORD: readonly string[] = ["Ctrl", "Shift", "2"];

/**
 * The three things this scene can point at, and the two it can only assert.
 *
 * Five labels, and each one had to earn a piece of evidence that is still on screen
 * in the last frame — which is the constraint that decided the staging rather than
 * the other way round. A claim whose subject leaves has to leave with it, and a
 * scene that ends with three of its five claims pointing at nothing is not a
 * diagram of itself.
 *
 * So: the mail row that turned up without anybody connecting an account; the row
 * that was set aside as another company's; the boxes the code landed in; the
 * security-code box it did not; and the button it would not press. All five are
 * there at `why`, and the popup arrives to the right of all of them.
 *
 * Every one is anchored rather than pinned to a percentage. The payment column and
 * the mail strip are both left-aligned in a pod whose width is capped, so a
 * coordinate would very nearly work — but "very nearly" is how the labels on this
 * page have gone wrong before, and the anchors cost nothing.
 */
const SPECS: readonly SpecTag<BeatName>[] = [
  /* On the first row to arrive, reading right into the empty half of the strip.
     The claim is about setup and setup is the absence of something, so what the
     frame can actually show is mail simply being there: no sign-in, no connect
     step, no key pasted anywhere. `inbox-feed.js` reads the Atom feed Gmail already
     serves to the session cookie in the browser. */
  {
    at: "mail",
    text: "Reads Gmail with no setup",
    x: 44,
    y: 88,
    anchor: "inbox",
    grip: "right",
    side: "right",
  },
  /* On the tag that appears when the second row is set aside. This is the label the
     scene exists for, and it is deliberately pinned to the *rejected* row: a lit row
     on its own shows a choice being made only if you already know there was one.
     The row that says "another service" is the evidence. */
  {
    at: "pick",
    text: "Matches the code to your site",
    x: 44,
    y: 95,
    anchor: "rival",
    grip: "right",
    side: "right",
  },
  /* On the boxes, reading right into the corridor between the payment column and
     the popup. The keypress itself is drawn on `press` and gone by the time this
     arrives; what is left of it, and what the label is about, is six digits in a
     form that nobody typed into. */
  {
    at: "fill",
    text: "One keypress from email to form",
    x: 40,
    y: 48,
    anchor: "boxes",
    grip: "right",
    side: "right",
  },
  /* On the security-code box, which stays empty. "Security code" is the CVV label on
     most checkout pages, so the rule has to beat the strongest positive signal the
     field could carry rather than merely compete with it — see `PAYMENT_HINT` in
     `content.js`, and `fixtures/checkout.html`, where nothing on the page is written
     to at all. */
  {
    at: "fill",
    text: "Never fills a CVV field",
    x: 40,
    y: 30,
    anchor: "cvv",
    grip: "right",
    side: "right",
  },
  /* On the control it will not press. `AVOID_TEXT` is checked first and against every
     candidate, including the form's own declared submit button, and its destructive
     verbs are stems: `remov\w*` catches "Remove this card" the way `delet\w*` catches
     "Confirm account deletion". It held the bare words `delete` and `remove` until
     recently, which matched neither of those while `confirm\w*` in the submit list
     matched both. */
  {
    at: "submit",
    text: "Refuses to click destructive buttons",
    x: 40,
    y: 22,
    anchor: "remove",
    grip: "right",
    side: "right",
    /* Three pixels clear of the last letter. The grip is the element's own right
       edge, which is correct — but the dot is 7px across and centred on it, so half
       of it lands on the "d" of "card" and the word it is pointing at is the one
       thing it must not sit on. */
    nudge: { x: 3 },
  },
];

/**
 * Where the labels come from: the extension's own toolbar button.
 *
 * The same theatre as the other scenes on this page — several claims bursting out of
 * one control reads as *this thing did all of this*, which is true here in a
 * literal way. Nothing else in the frame was touched.
 */
const SPEC_ORIGIN = { x: 96.5, y: 3 };

/**
 * The order the payment page is confirming.
 *
 * Set dressing, and it is doing a job beyond looking busy: a checkout's right-hand
 * rail runs the height of its form, and without one the window was two thirds empty
 * for six of the seven beats — which reads as a layout fault rather than as a page.
 * Quiet on purpose. Everything in here is 11 to 12.5px in the muted greys, because
 * the subject of the frame is the column to its left.
 */
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

export function TwoFactorPasterDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  const focused = useSectionFocused(stageRef);
  const running = useSceneRun(focused, onScreen);
  const state = useStoryboard(BEATS, {
    running,
    stage: stageRef,
    /* The frame that carries the argument: the form filled, the security box empty,
       the destructive control passed over, and the popup open beside all three with
       its reasoning showing. Every label is up by then and every one of them is
       pointing at something. */
    stillBeat: "why",
  });
  const { beat, index, run, still } = state;
  const { reached, onPress } = usePressGate(BEATS, state, OPENS);

  const at = (name: BeatName) => BEATS.findIndex((entry) => entry.name === name);

  const landed = index >= at("mail");
  const looking = index >= at("press");
  const picked = index >= at("pick");
  const filled = index >= at("fill");
  const submitted = index >= at("submit");
  /* Held back until the ring lands on the toolbar button. Without the gate the panel
     is open five frames before anything says it was clicked. */
  const open = reached >= at("why");

  const digits = [...CHOSEN.code];

  /* `…` while it looks, `✓` once a code is in the page — `background.js`, which sets
     the first at the start of the fetch and flashes the second afterwards. Nothing
     before that: the badge is the only status there is when the popup is closed, and
     it says nothing when there is nothing to say. */
  const badge = filled ? "✓" : looking ? "…" : "";

  return (
    <div
      className="tfa"
      ref={stageRef}
      data-beat={beat}
      data-lap={run}
      data-landed={landed}
      data-picked={picked}
      data-filled={filled}
      data-submitted={submitted}
      data-open={open}
      role="img"
      aria-label={
        "A payment confirmation page with the 2FA Paster extension pinned to the " +
        "browser toolbar. The page carries a saved card, a Remove this card control, " +
        "an empty box labelled Security code, and six empty boxes for a code sent by " +
        "email. Two unread messages arrive in Gmail below, each containing a " +
        "six-digit code: one from Ledgerline, the site being paid, and one from " +
        "Northwind Market. A keyboard shortcut is pressed. The Ledgerline message is " +
        "chosen and the Northwind one is set aside as another service. Its six " +
        "digits land one per box, the security-code box is left empty, the Remove " +
        "this card control is passed over, and the page's own Confirm payment button " +
        "is pressed, after which a card in the corner reads Code filled in and " +
        "submitted. The extension's popup is then opened and shows the code at " +
        "reading size, that it was sent by ledgerline.com, and the four signals that " +
        "picked it."
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
              <i className="tfa-favicon tfa-favicon--pay" />
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
                {/* Inside the form, which is where the never-press list has to work:
                    everything considered is inside the form holding the field that was
                    filled, so a destructive control in there is exactly the case. */}
                <span className="tfa-danger" data-spec-anchor="remove" data-skipped={submitted}>
                  Remove this card
                </span>
              </div>

              <div className="tfa-field">
                <span className="tfa-field-label">Security code</span>
                <span className="tfa-cvv" data-spec-anchor="cvv" data-skipped={filled}>
                  <i />
                  <i />
                  <i />
                </span>
              </div>

              <div className="tfa-rule" aria-hidden="true" />

              <p className="tfa-otp-head">Enter the 6-digit code we emailed you</p>
              <div className="tfa-boxes" data-spec-anchor="boxes">
                {digits.map((digit, position) => (
                  <span className="tfa-box" key={`${position}-${digit}`}>
                    {/* Rendered from the first frame and flown in on `fill`, because the
                        journey is the claim. Each starts at the same point — the code in
                        the mail row below — which means its offset is that point less its
                        own box, and the arithmetic for that is one multiplication of the
                        box pitch. See `--tfa-fly-x` in the stylesheet.

                        Keyed on the lap as well as the position so a loop rebuilds them
                        at the start of the flight rather than transitioning backwards
                        out of the boxes while the next scene's first beat plays. */}
                    <b
                      className="tfa-digit"
                      key={`${run}-${position}`}
                      style={{ "--tfa-i": position } as CSSProperties}
                    >
                      {digit}
                    </b>
                  </span>
                ))}
              </div>

              <span className="tfa-submit" data-pressed={submitted}>
                Confirm payment
              </span>
            </div>

            {/* `showToast` draws this in a closed shadow root at the bottom-right of the
                page, and it says what happened rather than what was intended — the
                wording below is the branch for a fill that was submitted by pressing the
                form's own button. It sits under the payment column here because the
                page's own bottom-right corner is where the popup opens. */}
            <div className="tfa-toast">
              <span className="tfa-toast-mark" aria-hidden="true">
                ✓
              </span>
              <span className="tfa-toast-copy">
                <b>Code filled in and submitted</b>
                <small>2FA Paster · from {CHOSEN.from}</small>
              </span>
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
            {/* The page's own account of where it has got to. The third row is the
                only thing in this rail that moves, and it moves because the form was
                submitted — which is the page reacting to the extension rather than
                the extension reporting on itself. */}
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

          {/* The chord, for the beat it happens on. A keypress has no picture and this
              one does the whole job, so it gets drawn once and taken away again — the
              corridor it stands in is where the labels about the fill arrive two beats
              later. */}
          <div className="tfa-keys" aria-hidden="true">
            {CHORD.map((key) => (
              <kbd className="tfa-key" key={key}>
                {key}
              </kbd>
            ))}
          </div>

          {/* --- the popup, at the 380px Chrome gives it ------------------------- */}
          <div className="tfa-pop" data-spec-anchor="popup" data-open={open}>
            <div className="tfa-pop-head">
              <span className="tfa-pop-brand">
                <Mark />
              </span>
              <span className="tfa-pop-name">
                <b>2FA Paster</b>
                <small>Reading your inbox</small>
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
                  <svg viewBox="0 0 24 24">
                    <path d="M4.5 6.5h15v11h-15zM4.5 8l7.5 5 7.5-5" />
                  </svg>
                </span>
                <span className="tfa-target-copy">
                  <b>{SITE}</b>
                  <small className="is-found">Code box found — ready to fill</small>
                </span>
              </div>

              {/* The shortcut sits on the button that does the same job, the way a menu
                  shows its accelerator. */}
              <span className="tfa-primary">
                <span>Get my code</span>
                <kbd className="tfa-shortcut">{CHORD.join("+")}</kbd>
              </span>

              <div className="tfa-code-card">
                {/* The hero object. 34px, monospace, tabular numerals, centred: the one
                    loud element in an interface that is otherwise all 12 and 13px. */}
                <b className="tfa-code">{CHOSEN.code}</b>
                <p className="tfa-code-source">
                  From {CHOSEN.from} · {CHOSEN.age}
                </p>
                {/* Said out loud only when it is worth saying, which is when the mail
                    demonstrably came from the site you are on. Silent in between. */}
                <p className="tfa-origin">Sent by {SITE} — the site you are on</p>
                <div className="tfa-code-actions">
                  <span>Copy</span>
                  <span>Fill this page</span>
                </div>
                <div className="tfa-why">
                  <p className="tfa-why-head">
                    <span>Why this one</span>
                    <span className="tfa-why-value">{CONFIDENCE}</span>
                    <i className="tfa-chevron" aria-hidden="true" />
                  </p>
                  <ul className="tfa-why-list">
                    {REASONS.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Collapsed, which is its resting state. The code on display is left out
                  of it, so what is in there is the one the scene set aside. */}
              <div className="tfa-history">
                <span>Recent codes</span>
                <span className="tfa-history-count">1</span>
                <i className="tfa-chevron" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- the inbox the codes actually arrive in -------------------------- */}
      <div className="tfa-inbox">
        <p className="tfa-inbox-head">
          <span className="tfa-inbox-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4.5 6.5h15v11h-15zM4.5 8l7.5 5 7.5-5" />
            </svg>
          </span>
          Gmail — unread inbox
        </p>
        <ul className="tfa-mail">
          <li className="tfa-mail-row" data-spec-anchor="inbox" data-state="chosen">
            <span className="tfa-avatar" data-who="chosen" aria-hidden="true">
              L
            </span>
            <span className="tfa-mail-copy">
              <span className="tfa-mail-from">
                <b>{CHOSEN.from}</b>
                <small>{CHOSEN.sender}</small>
              </span>
              <p className="tfa-mail-subject">{CHOSEN.subject}</p>
              <p className="tfa-mail-snippet">{CHOSEN.snippet}</p>
            </span>
            <span className="tfa-mail-side">
              <b className="tfa-mail-code">{CHOSEN.code}</b>
              <span className="tfa-mail-tag">{CHOSEN.tag}</span>
              <span className="tfa-mail-age">{CHOSEN.age}</span>
            </span>
          </li>
          <li className="tfa-mail-row" data-state="rival">
            <span className="tfa-avatar" data-who="rival" aria-hidden="true">
              N
            </span>
            <span className="tfa-mail-copy">
              <span className="tfa-mail-from">
                <b>{RIVAL.from}</b>
                <small>{RIVAL.sender}</small>
              </span>
              <p className="tfa-mail-subject">{RIVAL.subject}</p>
              <p className="tfa-mail-snippet">{RIVAL.snippet}</p>
            </span>
            <span className="tfa-mail-side">
              <b className="tfa-mail-code">{RIVAL.code}</b>
              <span className="tfa-mail-tag" data-spec-anchor="rival">
                {RIVAL.tag}
              </span>
              <span className="tfa-mail-age">{RIVAL.age}</span>
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
          reasons are in the popup — and the five claims that are not printed anywhere
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
