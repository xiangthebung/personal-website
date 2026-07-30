# 2FA Paster

A Chrome extension. Scene sketch only — this one stays off the live site.

## What it is

Almost every sign-in now ends with a six-digit number sent to your email, and
getting to that number is the tedious part: leave the page, find the newest
message, read the digits, come back, type them in before they expire. 2FA Paster
takes the round trip away — one keypress and the number is already in the box on
the page you were looking at, with the form sent. The hard part is that inboxes
are messy: several services mail codes within the same minute, and a code email
is otherwise full of order numbers, phone numbers, timestamps and a year in the
small print that all look exactly like a code. It gets the right number, from the
right sender, into the right box, and tells you on the page which one it used.

## Suggested copy

**headline**
The code is in the box before you switch tabs.

**why**
Every sign-in ends with a six-digit number that lives in another tab and expires
while you are looking for it.

**notes**
- One keystroke: filled, submitted, confirmed
- Order numbers, years, phone numbers all lose
- Five codes waiting, only one is yours

**invitation**
Watch it refuse to guess.

## Ten ways to demo it

1. The whole page is seized by a full-bleed sign-in screen demanding a six-digit code, and the visitor's own cursor is the only thing on screen that still belongs to them.
2. Five code emails avalanche in over the top edge and pile up across the page; three are physically flung off the right edge for being the wrong company, and the survivors slide up into the gap they left.
3. Every number in the winning email sprouts a floating verdict chip — `order number`, `part of a time`, `part of a phone number`, `a year` — then the losers grey out, tear off the line and drop clean out of the bottom of the browser window.
4. The six winning digits peel off the email one at a time and arc diagonally across the viewport, each snapping into its own character box behind a 2px purple outline flash.
5. The digits land, then flicker and vanish as a framework throws the write away — and get retyped through the native setter while the discarded ghosts are still fading in place.
6. The visitor's real tab title flickers to `(1) Verify your login` and back, as though the code mail landed in the tab they are actually reading right now.
7. The confirmation card breaks out of the demo frame entirely and pins itself to the bottom-right corner of the visitor's own viewport, in the exact spot the extension puts it on a real page.
8. A checkout panel slides over the top offering a field labelled `Security code`, the filler stops dead in front of it, and the field gets rubber-stamped `CVV — never a one-time code`.
9. `Resend code` and `Try another way` rise up as the obvious buttons to press, get struck through in red, and `Continue` presses itself instead with a visible click ring.
10. The page scrollbar becomes the two-minute inbox watch, draining in real time while everything else holds perfectly still, and the code drops in the instant it runs out.

## Recommended scene

Ideas 2, 3, 4 and 5, with the escaped toast from 7 as the closing frame. That
order is the actual argument the project makes, in the order it makes it: *which
of these codes is yours* (sender), then *which number in it is a code* (wording),
then *getting it into a box that does not want it* (the write), then *saying so
where you are already looking*.

Shot list. Total 12,830 ms, then it loops.

| # | beat | ms | shot |
| --- | --- | --- | --- |
| 1 | `idle` | 900 | Full-bleed browser. Sign-in card, six empty character boxes, caret blinking in the first. Tab reads `Verify your login`. |
| 2 | `flood` | 1500 | Five code emails drop in from above the frame and stack down the right side, each carrying its own six digits. Tab title gains `(1)`. |
| 3 | `reach` | 620 | Phantom cursor glides to the toolbar mark; the `Ctrl+Shift+2` keycap fades up beside it. |
| 4 | `press` | 260 | Mark depresses, ring pings out. Nothing else on the page moves. |
| 5 | `cull` | 1500 | Acme, Dropbox and Stripe are flung off the right edge — named companies, wrong company. The `sendgrid.net` relay greys but stays, tagged `relay · kept, penalised`. The stack collapses upward and the GitHub mail is left holding `sent by github.com`. |
| 6 | `audit` | 1900 | The winner opens. Verdict chips pop on every number; at 900 ms in, `order number`, `part of a time`, `part of a phone number` and `a year` desaturate, detach and fall out of the bottom of the window. `333333` keeps a green `+40` chip. |
| 7 | `launch` | 450 | The six digits lift off the mail and space out into flight order; the original line dims behind them. |
| 8 | `land` | 850 | Digits arc up-left across the frame, 60 ms apart, one per box, each box flashing a 2px purple outline as it takes its character. |
| 9 | `reject` | 600 | Boxes shake, characters go red and ghost upward: `.value = ` was discarded by the page. The single most under-appreciated problem in the project. |
| 10 | `stick` | 650 | Characters snap back solid, boxes flash again, note reads `written through the native setter · read back`. |
| 11 | `submit` | 700 | `Resend code` and `Try another way` are struck through and tagged `never pressed`; `Continue` presses itself. |
| 12 | `escape` | 1600 | The confirmation card leaves the frame and lands in the visitor's real bottom-right corner: `Code filled in and submitted · from GitHub`. The browser behind it dims. |
| 13 | `rest` | 1300 | Everything holds. Caption states the claim, then the scene loops. |

The frame that carries the whole argument is `audit`: it is the only one where
both questions — which sender, which number — are visible at the same time.
Prototype: [`2fa-paster/prototype.html`](./2fa-paster/prototype.html).
