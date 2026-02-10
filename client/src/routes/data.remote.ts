import { command, getRequestEvent } from '$app/server'
import * as auth from '$lib/server/auth'

export const logout = command(async () => {
  const event = getRequestEvent()
  const session = event.locals.session

  if (session) {
    await auth.invalidateSession(session.id)
  }

  auth.deleteSessionTokenCookie(event)
})
