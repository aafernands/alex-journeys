/**
 * Server-side publish stamps for post JSON.
 * Clients must not set `updatedAt`; the GitHub write path applies this helper.
 */

export type PublishStampInput = {
  date: string;
};

export type PublishStampOptions = {
  /** True for CMS Update & publish of an existing published post. */
  update?: boolean;
  /** First-published `date` already stored on GitHub, if the file exists. */
  existingDate?: string | null;
};

export type PublishStamp = {
  date: string;
  updatedAt?: string;
};

function calendarDay(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * On update of an existing post, bump `updatedAt` to `nowIso` and keep the
 * original `date` when the editor did not change the calendar day.
 * First publish and draft saves do not get `updatedAt`.
 */
export function applyExistingPostPublish(
  input: PublishStampInput,
  options: PublishStampOptions,
  nowIso: string,
): PublishStamp {
  const existingDate = options.existingDate;
  if (options.update && existingDate) {
    const date =
      calendarDay(existingDate) === calendarDay(input.date)
        ? existingDate
        : input.date;
    return { date, updatedAt: nowIso };
  }
  return { date: input.date };
}
