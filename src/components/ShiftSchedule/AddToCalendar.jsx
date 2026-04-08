import { toast } from "@/services/notificationService";
import { Button } from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

const formatToISOString = (date) => date.toISOString().replace(/[-:.]/g, "");

const buildEventLink = (event) => {
  const startDate = new Date(event.start);
  const endDate = new Date(event.end);
  const startTime = formatToISOString(startDate);
  const endTime = formatToISOString(endDate);
  const guardName = event.guardName || "חייל";
  const outpostName = event.outpostName || "עמדה";
  const guardMail = event.guardMail || "";
  const guardPhone = event.guardPhone || "";

  return `https://www.google.com/calendar/event?action=TEMPLATE&text=משמרת+לחייל+${guardName}&dates=${startTime}/${endTime}&details=חייל:+${guardName}%0Aעמדה:+${outpostName}%0Aאימייל:+${guardMail}%0Aטלפון:+${guardPhone}&add=${guardMail}`;
};

const AddToCalendar = ({
  shibuts = {},
  guards = [],
  outposts = [],
  mode = "single",
  events = [],
  compact = false,
}) => {
  const resolveSingleEvent = () => {
    if (!shibuts || Object.keys(shibuts).length === 0) {
      return null;
    }

    if (shibuts.outpostName) {
      return shibuts;
    }

    const guard = guards.find((g) => g.value === shibuts.guardId);
    const outpost = outposts.find((o) => o.id === shibuts.outpostId);

    return {
      ...shibuts,
      guardName: shibuts.guardName,
      outpostName: outpost?.name,
      guardMail: guard?.guardMail,
      guardPhone: guard?.guardPhone,
    };
  };

  const addToGoogleCalendar = () => {
    if (mode === "bulk") {
      if (!events.length) {
        toast.error("אין משמרות זמינות להוספה");
        return;
      }
      events.forEach((event) => {
        const eventLink = buildEventLink(event);
        window.open(eventLink, "_blank");
      });
      toast.success("המשמרות נפתחו ביומן של גוגל");
      return;
    }

    const event = resolveSingleEvent();
    if (!event) {
      toast.error("אין נתוני שיבוץ זמינים להוספה ליומן");
      return;
    }

    const eventLink = buildEventLink(event);
    window.open(eventLink, "_blank");
    toast.success("קישור לאירוע ביומן של גוגל נוצר בהצלחה");
  };

  return (
    <Button
      fullWidth={!compact}
      size={compact ? "small" : "medium"}
      variant="outlined"
      onClick={addToGoogleCalendar}
      startIcon={<CalendarMonthIcon fontSize={compact ? "small" : "medium"} />}
      sx={compact ? { flexShrink: 0, whiteSpace: "nowrap" } : undefined}
    >
      הוספה ליומן
    </Button>
  );
};

export default AddToCalendar;
