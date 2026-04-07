import { useEffect, useState, useMemo } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import HourglassEmptyOutlinedIcon from "@mui/icons-material/HourglassEmptyOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import DoDisturbAltOutlinedIcon from "@mui/icons-material/DoDisturbAltOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import { useNavigate } from "react-router-dom";
import { format, isToday, isTomorrow, formatDistanceToNow } from "date-fns";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import { he } from "date-fns/locale";
import { useAuthContext } from "@/context/AuthContext";
import { getGuardLinkByUserId } from "@/services/userGuardLinkService";
import { getNextShibutsForGuard } from "@/services/shibutsService";
import { getShiftRequestsByGuardId } from "@/services/shiftRequestService";
import { getSystemMessages } from "@/services/systemMessageService";
import ROUTES from "@/constants/routeConstants";

// ── helpers ───────────────────────────────────────────────────────────────────

function pad(n) {
  return String(n).padStart(2, "0");
}

function shiftTimeLabel(shift) {
  if (!shift) return "";
  return `${pad(shift.startHour)}:00 – ${pad(shift.endHour)}:00`;
}

function nextShiftWhen(ts) {
  const date = new Date(ts);
  if (isToday(date)) {
    const diff = date - new Date();
    if (diff <= 0) return "כעת";
    const hrs = Math.floor(diff / 3_600_000);
    const mins = Math.floor((diff % 3_600_000) / 60_000);
    if (hrs === 0) return `בעוד ${mins} דק׳`;
    if (mins === 0) return `בעוד ${hrs} שע׳`;
    return `בעוד ${hrs} שע׳ ו‑${mins} דק׳`;
  }
  if (isTomorrow(date)) return "מחר";
  return formatDistanceToNow(date, { locale: he, addSuffix: true });
}

function dayLabel(ts) {
  const date = new Date(ts);
  if (isToday(date)) return "היום";
  if (isTomorrow(date)) return "מחר";
  return format(date, "EEEE", { locale: he });
}

const STATUS_CONFIG = {
  pending: {
    label: "ממתין לאישור",
    color: "warning",
    variant: "outlined",
    Icon: HourglassEmptyOutlinedIcon,
  },
  approved: {
    label: "אושר",
    color: "success",
    variant: "filled",
    Icon: CheckCircleOutlineIcon,
  },
  rejected: {
    label: "נדחה",
    color: "error",
    variant: "filled",
    Icon: DoDisturbAltOutlinedIcon,
  },
  cancelled: {
    label: "בוטל",
    color: "default",
    variant: "filled",
    Icon: CancelOutlinedIcon,
  },
};

const REQUEST_TYPE_LABELS = {
  constraint: "אילוץ",
  swap: "החלפה",
};

// ── greeting ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "לילה טוב";
  if (h < 12) return "בוקר טוב";
  if (h < 17) return "צהריים טובים";
  if (h < 21) return "ערב טוב";
  return "לילה טוב";
}

// ── component ─────────────────────────────────────────────────────────────────

export default function SoldierHomePage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [guardLink, setGuardLink] = useState(null);
  const [nextShift, setNextShift] = useState(undefined); // undefined = loading, null = none
  const [requests, setRequests] = useState([]);
  const [sysMessages, setSysMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    setLoading(true);
    getGuardLinkByUserId(user.id)
      .then(async (link) => {
        setGuardLink(link);
        if (!link?.guardId) return;
        const [shift, reqs, msgs] = await Promise.all([
          getNextShibutsForGuard(link.guardId),
          getShiftRequestsByGuardId(link.guardId),
          getSystemMessages(link.campId),
        ]);
        setNextShift(shift ?? null);
        setRequests(reqs || []);
        // sort: urgent first, then warning, then info
        const order = { urgent: 0, warning: 1, info: 2 };
        setSysMessages((msgs || []).sort((a, b) => (order[a.priority] ?? 2) - (order[b.priority] ?? 2)));
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const initials = useMemo(() => {
    const parts = (user?.name || "").trim().split(/\s+/);
    if (parts.length >= 2) return parts[0][0] + parts[1][0];
    return (user?.name || "?")[0];
  }, [user?.name]);

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", px: 2, pt: 3, pb: 6 }}>
      {/* ── ברוך הבא ────────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 3 }}>
        <Avatar sx={{ width: 48, height: 48, bgcolor: "primary.main", fontWeight: 700 }}>
          {initials}
        </Avatar>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {greeting()},
          </Typography>
          <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
            {user?.name || "חייל"}
          </Typography>
        </Box>
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* ── הודעות מערכת ──────────────────────────────────── */}
          {sysMessages.length > 0 && (
            <>
              <SectionTitle icon={<CampaignOutlinedIcon />} title="הודעות מערכת" sx={{ mb: 1 }} />
              <Stack spacing={1} sx={{ mb: 3 }}>
                {sysMessages.map((msg) => (
                  <SystemMessageBanner key={msg.id} msg={msg} />
                ))}
              </Stack>
            </>
          )}

          {/* ── המשמרת הבאה ──────────────────────────────────── */}
          <SectionTitle icon={<CalendarTodayOutlinedIcon />} title="המשמרת הבאה" />

          {nextShift ? (
            <NextShiftCard shift={nextShift} />
          ) : (
            <EmptyCard
              icon={<EventBusyOutlinedIcon sx={{ fontSize: 36, color: "text.disabled" }} />}
              text="אין משמרות מתוכננות בקרוב"
            />
          )}

          {/* ── הבקשות שלי ────────────────────────────────────── */}
          <SectionTitle
            icon={<AssignmentOutlinedIcon />}
            title="הבקשות שלי"
            action={
              <Button
                size="small"
                variant={requests.length > 0 ? "text" : "outlined"}
                sx={{ fontSize: "0.72rem", py: 0 }}
                onClick={() => navigate(ROUTES.MY_SHIFTS)}
              >
                {requests.length > 0 ? "הכל" : "+ בקשה חדשה"}
              </Button>
            }
            sx={{ mt: 3 }}
          />

          {requests.length === 0 ? (
            <EmptyCard
              text="לא שלחת בקשות עדיין"
              action={
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => navigate(ROUTES.MY_SHIFTS)}
                >
                  פתח בקשת אילוץ / החלפה
                </Button>
              }
            />
          ) : (
            <Stack spacing={1.25}>
              {requests.slice(0, 6).map((req) => (
                <RequestRow key={req.id} req={req} />
              ))}
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ icon, title, action, sx = {} }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, ...sx }}>
      <Stack direction="row" alignItems="center" gap={0.75}>
        <Box sx={{ color: "primary.main", display: "flex" }}>{icon}</Box>
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
      </Stack>
      {action}
    </Stack>
  );
}

function NextShiftCard({ shift }) {
  const rawDate = shift.theDate;
  const shiftDate = new Date(typeof rawDate === "string" ? rawDate : Number(rawDate));
  const whenLabel = nextShiftWhen(shiftDate.getTime());
  const day = dayLabel(shiftDate.getTime());
  const dateStr = format(shiftDate, "dd/MM/yyyy");
  const timeStr = shiftTimeLabel(shift.shifts);
  const outpostName = shift.outposts?.name ?? "—";

  const isUrgent = shiftDate - new Date() < 3 * 3_600_000; // < 3 hours

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "14px",
        border: "2px solid",
        borderColor: isUrgent ? "warning.main" : "primary.main",
        overflow: "hidden",
      }}
    >
      {/* Colored top strip */}
      <Box
        sx={{
          bgcolor: isUrgent ? "warning.main" : "primary.main",
          px: 2,
          py: 0.75,
        }}
      >
        <Typography
          variant="caption"
          fontWeight={800}
          sx={{ color: "#fff", letterSpacing: 0.5, textTransform: "uppercase" }}
        >
          {whenLabel}
        </Typography>
      </Box>

      <Box sx={{ p: 2 }}>
        {/* Shift name */}
        {shift.shifts?.name && (
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            {shift.shifts.name}
          </Typography>
        )}

        <Stack spacing={0.75}>
          <InfoRow icon={<AccessTimeOutlinedIcon sx={{ fontSize: 16 }} />} text={timeStr} />
          <InfoRow
            icon={<CalendarTodayOutlinedIcon sx={{ fontSize: 16 }} />}
            text={`${day} • ${dateStr}`}
          />
          <InfoRow
            icon={<LocationOnOutlinedIcon sx={{ fontSize: 16 }} />}
            text={outpostName}
          />
        </Stack>
      </Box>
    </Paper>
  );
}

function InfoRow({ icon, text }) {
  return (
    <Stack direction="row" alignItems="center" gap={0.75}>
      <Box sx={{ color: "text.secondary", display: "flex" }}>{icon}</Box>
      <Typography variant="body2">{text}</Typography>
    </Stack>
  );
}

function RequestRow({ req }) {
  const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
  const typLabel = REQUEST_TYPE_LABELS[req.requestType] ?? req.requestType;
  let date = "—";
  try {
    if (req.createdAt) {
      const ts = Number(req.createdAt);
      const d = Number.isNaN(ts) ? new Date(req.createdAt) : new Date(ts);
      date = format(d, "dd/MM/yyyy");
    }
  } catch {
    date = "—";
  }

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "10px",
        border: "1px solid",
        borderColor: "divider",
        px: 1.75,
        py: 1.25,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Stack spacing={0.4}>
          <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
            <Chip label={typLabel} size="small" variant="outlined" sx={{ fontSize: "0.7rem", height: 20 }} />
            <Chip
              icon={<cfg.Icon sx={{ fontSize: "14px !important" }} />}
              label={cfg.label}
              size="small"
              color={cfg.color}
              variant={cfg.variant}
              sx={{ fontSize: "0.7rem", height: 20 }}
            />
          </Stack>
          {req.reason && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {req.reason}
            </Typography>
          )}
        </Stack>
        <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0, ml: 1 }}>
          {date}
        </Typography>
      </Stack>
    </Paper>
  );
}

const MSG_STYLE = {
  info:    { borderColor: "#0288d1", bgcolor: "rgba(2,136,209,0.07)",   Icon: InfoOutlinedIcon,          color: "#0288d1" },
  warning: { borderColor: "#ed6c02", bgcolor: "rgba(237,108,2,0.07)",   Icon: WarningAmberOutlinedIcon,  color: "#ed6c02" },
  urgent:  { borderColor: "#d32f2f", bgcolor: "rgba(211,47,47,0.08)",   Icon: ErrorOutlineIcon,          color: "#d32f2f" },
};

function SystemMessageBanner({ msg }) {
  const s = MSG_STYLE[msg.priority] ?? MSG_STYLE.info;
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "10px",
        border: "1.5px solid",
        borderColor: s.borderColor,
        bgcolor: s.bgcolor,
        px: 1.75,
        py: 1.25,
      }}
    >
      <Stack direction="row" alignItems="flex-start" gap={1}>
        <s.Icon sx={{ fontSize: 18, color: s.color, mt: 0.2, flexShrink: 0 }} />
        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: s.color, lineHeight: 1.3 }}>
            {msg.title}
          </Typography>
          {msg.content && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, whiteSpace: "pre-wrap" }}>
              {msg.content}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

function EmptyCard({ icon, text, action }) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "12px",
        border: "1px dashed",
        borderColor: "divider",
        py: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
      }}
    >
      {icon}
      <Typography variant="body2" color="text.secondary" textAlign="center">
        {text}
      </Typography>
      {action}
    </Paper>
  );
}
