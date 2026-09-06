# Decaf Privacy Policy

Effective: September 4, 2026

Decaf calms feed-driven sites: no reward counts, no notification badges, no endless feeds. It does all of that inside your browser. It has no server, no account, no analytics, and it makes no network requests of its own.

## What is stored, and where

Everything Decaf keeps lives in `chrome.storage.local` on the device you are using. **Nothing syncs.** That is a deliberate choice rather than an oversight: the list of sites you have asked Decaf to calm says something about your habits, and syncing it through an account would put that list somewhere other than your own machine for no benefit to you.

What is in there:

- your four switches — pause feeds, hide comments and replies, turn media upside down, hide notification counts
- which of the twelve supported sites Decaf is switched on for, and any site you added yourself: its address and the name you gave it
- a site you have set aside for half an hour or two hours, and when that ends
- a schedule, if you set one: the hours and days Decaf is on, and an override from the popup, which is a single time — when the schedule next switches itself on
- an active Lock, if you set one, and when it ends
- while a Lock is running, a snapshot of the settings that Lock is holding, so that a stale settings tab cannot quietly weaken it. It is removed when the Lock ends.
- **how many five-minute passes you have taken, and how many minutes the feed was open, counted per site per day, for the last fourteen days.** These two numbers are the only thing Decaf records about what you did. They exist for two reasons: so the hold time can escalate from 3 seconds to 7 to 11 to 15, and so the popup and the settings page can show a week of readings that is true. The oldest day falls off on its own. They are counts, not a history — they do not record what you looked at or when. The minutes are the minutes a pass was granted for, less any handed back by pausing the feed early; Decaf does not watch whether you were looking.

Colour granted to a page is **not** in that list and is not written down anywhere. It lives in the tab, for as long as you are on that page, and is gone when you leave it. Neither is the receipt the popup shows — the count of numbers, badges and pictures Decaf changed on the page in front of you. The page works it out when the popup asks, and it is kept nowhere.

There is no browsing history, no page content, and no list of what you looked at.

## What Decaf reads

Decaf's content scripts run on the twelve hosts listed in its manifest, plus any site you have added yourself and granted permission for, and nowhere else. It does not hold a `tabs` permission and cannot see the pages you visit on any other site.

On those twelve, it reads the page in order to change it: the address, so it can tell a feed apart from a page you opened on purpose; the text and accessible labels of elements, so it can find the reward numbers; and the size, position and background colour of elements, so it can tell a notification badge from an ordinary part of the page and find the picture on a page you opened. Sites write those numbers in every shape there is — the word inside the number, beside it, in front of it, on the icon next to it, or nowhere at all — which is why the matching has to look at labels rather than just at text, and why some of it has to look at what an element actually renders as.

None of what it reads is stored, and none of it is transmitted. It is examined, the element is rewritten, and that is the end of it.

## No network activity

Decaf declares no host permissions for network access, loads no remote code, has no remote configuration, and contacts no analytics service. You can check this rather than take it on trust: the whole extension is in this repository, and searching it for `fetch`, `XMLHttpRequest`, `sendBeacon` or `WebSocket` turns up nothing.

There is nothing to pay for, so there is no payment processor and no billing email.

## Permissions, and why each one

- **`storage`** — the settings, the schedule and the two counts above.
- **`activeTab`** — so the popup can tell which of the twelve sites you are currently on, show the right switch, and ask that tab what it changed. It grants no access to any other tab.
- **`alarms`** — to notice when a Lock ends, and when a schedule turns Decaf on or off. Both have to happen on time even if the browser was closed in between, and an alarm is how a service worker finds out.
- **`scripting`** — for two things, both of them Decaf's own files. Tabs that were already open when Decaf was installed or updated have no copy of it running in them, and this is what puts one there instead of leaving those tabs dead until you happen to reload them. It is also how a site you add yourself gets a content script registered for it. No code is fetched from anywhere; the only files it ever runs are the ones in this repository.
- **Optional access to a site you add yourself** — asked for one origin at a time, at the moment you add that site, and never in advance. Removing the site gives the permission back.
- **Content scripts on twelve hosts** — the only way to change a page is to be on it. Messaging apps are deliberately excluded: a conversation is not a feed.

## Retention and deletion

Settings stay until you change them or uninstall. Each day's pass count and minutes fall off after fourteen days. Uninstalling the extension removes everything; there is nothing held anywhere else to delete.

One exception worth stating plainly: while a **Lock** is running, Decaf will not let you turn its switches off, because that is the entire point of a Lock. It does not stop you removing the extension, and removing it removes the Lock with it.

## Limited Use

Decaf's use of information received from Chrome APIs complies with the Chrome Web Store User Data Policy, including the Limited Use requirements. Page content and the address of the current page are used only to provide the calming behaviour described above, are not stored, are not transferred off the device, are not sold, and are not used for advertising or credit assessment.

## Changes

Material changes to this policy will be disclosed before they take effect, and the effective date above will be updated.

## Contact

Questions or privacy concerns: **xiangli3625@gmail.com**.
