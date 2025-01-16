import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

export const DEFAULT_TIMEZONE = "Europe/Rome";

export const formatDate = (datetime: Date, format: string, timezone: string) =>
  dayjs(datetime).tz(timezone).format(format);
