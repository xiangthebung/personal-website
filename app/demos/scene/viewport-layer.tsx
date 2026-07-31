"use client";

/**
 * Puts a scene's overflow on the visitor's actual screen, not inside its own box.
 *
 * Some of what these scenes are about does not happen inside a browser mockup. A
 * transit extension's whole point is that the alert reaches you when you are not
 * looking at it, and a feed's whole point is that it will not leave you alone —
 * neither of which can be staged inside a 900px panel, because a notification drawn
 * inside the thing it is describing is a picture of a notification.
 *
 * So the parts that are supposed to arrive uninvited are portalled to `document.body`
 * and positioned against the viewport. The visitor gets a real notification in the
 * real corner of their real window.
 *
 * WHY A PORTAL AND NOT `position: fixed`
 *
 * Because `position: fixed` does not mean "against the viewport" — it means "against
 * the nearest ancestor with a transform, filter, backdrop-filter, contain or
 * will-change". This page is full of them: `.project-ambience` translates sideways
 * with the scroll, `#decaf.project` runs `filter: grayscale(1)` across the whole
 * section when Decaf switches on, and every `.project-window` carries an entry
 * transform. A fixed layer inside any of those is silently captured by it, and the
 * failure mode is not an error — it is an element that looks almost right and is
 * anchored to the wrong thing. Portalling out of the tree removes the question.
 *
 * SAFETY
 *
 * `mounted` is set in an effect, so nothing is portalled during the server render —
 * `document` does not exist there, and rendering a portal on the server and not on
 * the client is a hydration mismatch either way.
 *
 * Callers are expected to gate their children on the scene being on screen as well as
 * on the beat. A storyboard stops advancing when it goes off screen, which means its
 * beat *freezes* rather than moving on — so a caller that only checked the beat could
 * leave a notification pinned to the corner of a visitor's window while they read
 * three sections further down. That is the one way this can genuinely misbehave, and
 * it is the caller's job because only the caller knows which beats are transient.
 */

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function ViewportLayer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className={`vlayer ${className ?? ""}`} aria-hidden="true">
      {children}
    </div>,
    document.body,
  );
}
