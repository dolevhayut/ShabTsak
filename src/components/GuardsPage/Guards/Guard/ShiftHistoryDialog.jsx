import { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import TextField from "@mui/material/TextField";
import dayjs from "dayjs";
import { getShibutsimByGuardAndCamp } from "@/services/shibutsService";
import { getOutpostsByCampId } from "@/services/outpostService";
import { getGravatarUrl } from "../../../GuardProfile/GuardProfileLimits/utils.js";

const DAY_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function formatTs(ts) {
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" }),
    dayName: DAY_HE[d.getDay()],
    weekday: d.getDay(),
  };
}

function groupByDate(records) {
  const map = new Map();
  for (const r of records) {
    const { date } = formatTs(r.theDate);
    if (!map.has(date)) map.set(date, []);
    map.get(date).push(r);
  }
  return Array.from(map.entries()).map(([date, items]) => ({
    date,
    dayName: formatTs(items[0].theDate).dayName,
    weekday: formatTs(items[0].theDate).weekday,
    items,
  }));
}

const DAY_COLORS = [
  "#EFF6FF", // ראשון – כחול עדין
  "#F0FDF4", // שני
  "#FEFCE8", // שלישי
  "#FFF7ED", // רביעי
  "#F5F3FF", // חמישי
  "#FDF4FF", // שישי
  "#F9FAFB", // שבת
];

const ShiftHistoryDialog = ({ open, onClose, guard, campId }) => {
  const [from, setFrom] = useState(dayjs().startOf("month"));
  const [to, setTo] = useState(dayjs().endOf("month"));
  const [records, setRecords] = useState([]);
  const [outpostMap, setOutpostMap] = useState({});
  const [shiftMap, setShiftMap] = useState({});
  const [loading, setLoading] = useState(false);

  /* ── טעינת עמדות ו-shifts פעם אחת בפתיחה ── */
  useEffect(() => {
    if (!open || !campId) return;

    getOutpostsByCampId(campId).then((outposts) => {
      if (!outposts) return;
      const om = {};
      outposts.forEach((o) => { om[o.id] = o.name; });
      setOutpostMap(om);

      // בנה map של shifts מתוך outposts שמכילים shifts[]
      import("@/services/outpostService").then(({ getOutpostsAndShiftsForCampId }) => {
        getOutpostsAndShiftsForCampId(campId).then((data) => {
          if (!data) return;
          const sm = {};
          data.forEach((o) => {
            (o.shifts || []).forEach((s) => {
              sm[s.id] = { fromHour: s.fromHour, toHour: s.toHour };
            });
          });
          setShiftMap(sm);
        });
      });
    });
  }, [open, campId]);

  /* ── שליפת היסטוריה לפי טווח ── */
  const fetchHistory = useCallback(async () => {
    if (!guard?.id || !campId) return;
    setLoading(true);
    try {
      const data = await getShibutsimByGuardAndCamp(guard.id, campId, [
        from.toDate(),
        to.endOf("day").toDate(),
      ]);
      setRecords(data || []);
    } finally {
      setLoading(false);
    }
  }, [guard?.id, campId, from, to]);

  useEffect(() => {
    if (open) fetchHistory();
  }, [open, fetchHistory]);

  const groups = groupByDate(records);

  const pad = (n) => String(n).padStart(2, "0");
  const formatHour = (h) => `${pad(h === 24 ? 0 : h)}:00`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: "12px",
          overflow: "hidden",
          maxHeight: "90vh",
        },
      }}
    >
      {/* ── כותרת ── */}
      <DialogTitle sx={{ p: 0 }}>
        <Box
          sx={{
            px: 2.5,
            py: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Avatar
              src={getGravatarUrl(guard?.mail)}
              alt={guard?.name}
              sx={{ width: 38, height: 38 }}
            />
            <Box>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                {guard?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                היסטוריית משמרות
              </Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* ── סלקטור תאריכים ── */}
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Box
            sx={{
              px: 2.5,
              py: 1.75,
              bgcolor: "rgba(0,0,0,0.015)",
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
              <DatePicker
                label="מתאריך"
                value={from}
                onChange={(v) => v && setFrom(v)}
                maxDate={to}
                renderInput={(params) => (
                  <TextField {...params} size="small" sx={{ minWidth: 140 }} />
                )}
              />
              <DatePicker
                label="עד תאריך"
                value={to}
                onChange={(v) => v && setTo(v)}
                minDate={from}
                renderInput={(params) => (
                  <TextField {...params} size="small" sx={{ minWidth: 140 }} />
                )}
              />
              <Button
                variant="contained"
                size="small"
                onClick={fetchHistory}
                disabled={loading}
                sx={{ height: 36, px: 2, flexShrink: 0 }}
              >
                {loading ? <CircularProgress size={14} color="inherit" /> : "חפש"}
              </Button>
            </Stack>
          </Box>
        </LocalizationProvider>

        {/* ── סיכום ── */}
        {!loading && (
          <Box sx={{ px: 2.5, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <EventNoteOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary">
                {records.length === 0
                  ? "לא נמצאו משמרות בטווח זה"
                  : `נמצאו ${records.length} משמרות ב-${groups.length} ימים`}
              </Typography>
            </Stack>
          </Box>
        )}

        {/* ── רשימת היסטוריה ── */}
        <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 1.5 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={32} />
            </Box>
          ) : records.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <CalendarTodayOutlinedIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
              <Typography color="text.secondary" variant="body2">
                אין משמרות לתצוגה
              </Typography>
              <Typography color="text.disabled" variant="caption">
                נסה לשנות את טווח התאריכים
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {groups.map((group) => (
                <Box key={group.date}>
                  {/* כותרת יום */}
                  <Stack
                    direction="row"
                    alignItems="center"
                    gap={1}
                    sx={{ mb: 1 }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "primary.main",
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: "0.04em" }}>
                      {`יום ${group.dayName} — ${group.date}`}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${group.items.length} משמרות`}
                      sx={{ height: 18, fontSize: "0.65rem", "& .MuiChip-label": { px: 0.75 } }}
                    />
                  </Stack>

                  {/* כרטיסי משמרת */}
                  <Stack spacing={0.75} sx={{ pr: 2 }}>
                    {group.items.map((shibuts) => {
                      const shift = shiftMap[shibuts.shiftId];
                      const outpostName = outpostMap[shibuts.outpostId] || `עמדה ${shibuts.outpostId}`;
                      const fromH = shift?.fromHour ?? "—";
                      const toH = shift?.toHour ?? "—";
                      const timeStr = (shift)
                        ? `${formatHour(fromH)} – ${formatHour(toH)}`
                        : "שעות לא ידועות";

                      return (
                        <Box
                          key={shibuts.id}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            px: 1.5,
                            py: 1,
                            borderRadius: "8px",
                            bgcolor: DAY_COLORS[group.weekday] ?? "#F9FAFB",
                            border: "1px solid",
                            borderColor: "divider",
                            gap: 1,
                          }}
                        >
                          {/* שמאל: שעות */}
                          <Stack direction="row" alignItems="center" gap={0.75} sx={{ flexShrink: 0 }}>
                            <AccessTimeOutlinedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                            <Typography variant="caption" fontWeight={600} sx={{ letterSpacing: "0.02em" }}>
                              {timeStr}
                            </Typography>
                          </Stack>

                          <Divider orientation="vertical" flexItem />

                          {/* ימין: עמדה */}
                          <Stack direction="row" alignItems="center" gap={0.75} sx={{ flex: 1, minWidth: 0 }}>
                            <LocationOnOutlinedIcon sx={{ fontSize: 14, color: "primary.main", flexShrink: 0 }} />
                            <Typography
                              variant="body2"
                              fontWeight={500}
                              sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                            >
                              {outpostName}
                            </Typography>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

ShiftHistoryDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  guard: PropTypes.object,
  campId: PropTypes.number,
};

export default ShiftHistoryDialog;
