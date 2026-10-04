const PREFIX = "[dnd-anywhere]";

export interface Logger {
  debug(message: string, details?: Record<string, unknown>): void;
}

/**
 * Console logger that stays silent unless debug logging is on in Options.
 * Callers must never pass file names or page content; diagnostics are meant to be
 * pasted into public bug reports.
 */
export function createLogger(
  isEnabled: () => boolean,
  sink: Pick<Console, "debug"> = console,
): Logger {
  return {
    debug(message, details) {
      if (!isEnabled()) return;
      if (details) sink.debug(PREFIX, message, details);
      else sink.debug(PREFIX, message);
    },
  };
}
