import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_TIMEZONE = "Europe/Rome";

export const formatDate = (
  datetime: Date,
  format: string,
  timezone = DEFAULT_TIMEZONE,
) =>
  dayjs(datetime)
    .tz(timezone ?? DEFAULT_TIMEZONE)
    .format(format);
