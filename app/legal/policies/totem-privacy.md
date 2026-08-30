# Privacy policy — Totem

Effective: 30 August 2026

## The lock screen, first

Totem can hide your task names behind symbols. An app that does that and then
prints "Email Dana about the lease" on a locked phone has given away the exact
thing it was holding back, so this is the first thing worth being exact about.

With **Hide task names** switched on, a reminder's headline is the totem phrase
— "Wobbling violet octopus" — and never the task's title. The line under it is
either the due time (`Due 5:00 PM`) or the words `Tap to open`. Nothing else
about the task is in the notification except its internal id, which is what the
tap opens and which is a random string with no meaning outside this install.
That is `hiddenTitle()` in `src/lib/notify.ts`, and it is the only branch that
runs while hiding is on.

With hiding off — which is the default, because hiding your own to-do list is
something you choose rather than something you are handed — the reminder shows
the title, like any other to-do app.

The optional daily summary is titled `Today` and its body is one of two fixed
sentences. It names no task in either mode, and it cannot: its text is written
once when the repeating trigger is created, days before it fires.

## The network

Totem makes no network requests. There is no account, no sync, no server, no
analytics, no crash reporter and no advertising SDK.

This is checkable rather than a promise: the whole source is in this repository,
and searching `src/` for `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon` or
any `http://` or `https://` address returns nothing at all. Everything the app
draws, sounds and remembers comes from the device it is running on. There is no
`.env`, no API key and nothing to sign in to.

`expo-updates` is not installed, so the app does not check for over-the-air
updates at launch — the code that runs is the code that was reviewed and
shipped. The tone samples, icon font, images and splash art are compiled into
the binary as static `require()`s, so nothing is fetched to draw a screen.

Two honest qualifications, because a policy that overstates this is worse than
one that does not make the claim:

- **One dependency contains a network path this app never opens.**
  `expo-notifications` registers a side-effect module at import that will POST a
  device push token, an installation id and the app id to `exp.host` — but only
  after the app has called `getExpoPushTokenAsync()` or
  `setAutoServerRegistrationEnabledAsync(true)`, which is what writes the stored
  registration record the module checks first. Totem calls neither, and requests
  no push token of any kind; on a Totem install that record does not exist and
  the check returns before anything is sent. Every notification this app
  schedules is a local one, delivered by the operating system from an alarm set
  on the device.
- **The operating system is not covered by this.** Apple and Google learn that
  you installed the app because you installed it from their stores, and both
  platforms report crashes and usage according to *your* device settings, not
  this app's. Totem adds nothing to that and reads none of it.

Running the project from source in development is a different situation and not
what this policy is about: `npm start` serves the JavaScript bundle and its
assets to the device over your local network, and Expo Go is Expo's own app with
its own behaviour.

## The microphone

Totem asks for the microphone for one feature: the **spoken hint**, an optional
recording in your own voice attached to a single task.

- **When.** Only on the Add-task screen or on a task's own screen, and only
  after you press *Record a hint in your own voice*. Permission is requested at
  that moment — not at launch, not on first run. Decline it and the app says one
  sentence and carries on; no feature other than that recording is affected.
- **How long.** Recording stops itself at 30 seconds. It also stops if you leave
  the screen mid-recording.
- **Where it goes.** The recorder writes to the operating system's cache
  directory. If you save the task, the file is moved into Totem's own documents
  directory, under `memos/`, named after the task's internal id. Both locations
  are inside the app's private sandbox: no other app can read them, and neither
  is a shared or media-library folder, so the recording does not appear in your
  photo roll, your files app or any other app's picker.
- **Where it does not go.** Nowhere. It is never uploaded, never transcribed,
  never analysed, and never sent to a speech service — there is nothing in this
  app that could send it. What is stored alongside the task is a local file path
  and a duration in milliseconds.
- **On the web build**, a recording is a `blob:` URL held by the browser tab. It
  works for that session and does not survive a reload. Nothing is written to
  disk and nothing is uploaded.

**Deleting a recording — read this part carefully, because it is the part of the
app that decides how long your voice stays on the device.**

- Before the task is saved, the recorder has a delete button, and it removes the
  file. Backing out of the Add-task screen without saving removes it too.
- **A saved task's recording can be deleted on its own**, without deleting the
  task. Open the task and use the delete button beside *Voice hint*. Recording a
  new hint there replaces the old file rather than adding to it.
- Deleting a recording — or deleting the task it belongs to — is offered back
  for a few seconds, and the file is what makes that offer real, so it survives
  until the offer closes. When the offer times out, the file is deleted. Take
  the offer instead and the hint plays exactly as before.
- The offer is not saved across launches, so closing the app in those few
  seconds leaves the file in `memos/` with nothing pointing at it. **Totem
  reconciles `memos/` against your tasks the next time it starts** and deletes
  anything nothing refers to, so a recording outlives the deletion by one
  launch at the most.
- **Erase everything** empties `memos/` outright — every recording in it,
  whether or not a task still refers to it, including one left behind by a
  deletion the app was closed on. **Uninstalling Totem removes the whole
  sandbox**, which is the same result by a longer route.

## Notifications

Every notification Totem schedules is local. It asks the operating system to
raise an alert at a moment on the device's own clock; no push token is
requested, no notification service is contacted, and nothing about a reminder
travels anywhere.

Permission is requested lazily — the first time there is actually something to
deliver, not at launch. Decline it and the app works unchanged; the in-app lists
are still correct, which is the part that matters.

Two kinds exist: the per-task reminder you set on a task, and the one optional
daily summary. The whole pending schedule is rebuilt from your task list
whenever it changes, which is why a deleted task never rings. At most 48 are
pending at a time, because iOS silently drops anything past its own limit. On
Android they are delivered through a notification channel named "Reminders".

What a notification puts on the screen is covered above, and it is the whole of
what one contains.

## What is stored on the device

One JSON record in AsyncStorage, under the key `todo-v1`, holding:

- **Your tasks**: title, notes, subtasks, the assigned symbol (a colour, an
  object and a movement), the file path and duration of the spoken hint if there
  is one, list, tags, priority, due date, reminder time, repeat rule, whether it
  is starred, and the created/updated/completed timestamps.
- **Your lists and tags**: names and colours.
- **Your practice history, per task**: a recall strength, an ease factor, an
  interval, when the symbol is next due for practice, when it was last
  reviewed, and counts of how often you named it unaided or needed a hint.
- **The days you got at least one symbol right unaided** — a list of dates, kept
  so the app can show a streak.
- **Your settings**: appearance, sort order, whether completed tasks are shown,
  whether names are hidden, sound, reduced motion, which day the week starts on,
  haptics, and the daily summary and its hour.

Separately, on iOS and Android, the **spoken hints** are ordinary audio files in
Totem's documents directory, as described above. On the web build, everything
above lives in the browser's local storage for that site, and there are no audio
files.

That is the complete list. There is no identifier, no device fingerprint, no
advertising id, no contact list, no calendar access, no location and no camera.
The app requests exactly two permissions — the microphone and notifications —
and asks for each only at the moment the feature is used.

Task ids, tag ids and list ids are generated on the device from a timestamp and
a random suffix. They identify a row in your own store and nothing else.

## Backups

Totem does not opt out of the backup its platform performs for every app, and
you should assume your tasks and your recordings are included in one if you have
device backup switched on. `app.json` does not set `android.allowBackup`, so it
takes Android's default of `true`; nothing marks the iOS documents directory as
excluded from backup either. That backup is Apple's or Google's, governed by
their terms and by settings that live in your device's own settings app, not in
this one. Totem never sees it and cannot read it.

If that matters to you, turning off backup for Totem in the device settings is
the switch — there is nothing to change in the app.

## Retention and deletion

Everything is kept until you delete it. There is no expiry, because there is
nowhere for anything to expire to. The one piece of housekeeping runs at
startup, and it only ever deletes: it compares the recordings in `memos/`
against the tasks that exist and removes any the app can no longer reach.

- **Clear completed tasks** and deleting a task remove the task from the store.
- **Erase everything**, in Settings, empties the tasks, lists, tags, practice
  history and settings, and empties `memos/` — every recording on the device,
  including any that no task still refers to.
- **Uninstalling the app** removes the entire sandbox: the store, every
  recording, and every pending notification. Nothing survives it, because
  nothing was ever anywhere else.

There is no export. If you want your tasks somewhere other than this device, at
present you have to retype them.

## Children

Totem is not directed at children, collects no personal information from anyone,
and has no social, messaging, purchase or user-generated-content feature of any
kind.

## Changes

Material changes will be published with a new version of the app and a new date
at the top of this file.

## Contact

Questions or privacy concerns: **xiangli3625@gmail.com**
