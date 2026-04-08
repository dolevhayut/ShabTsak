import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { format, parse, startOfWeek, getDay, addDays } from "date-fns";
import he from "date-fns/locale/he";
import { getOutpostsAndShiftsForCampId } from "@/services/outpostService.js";
import { createOrUpdateShibuts, getShibutsimOfCurrentMonthByCampId, deleteShibuts, getAutoShibutsimByCampIdAndDates, deleteAutoShibutsim } from "@/services/shibutsService.js";
import { useQuery } from "react-query";
import SelectCamp from "components/general_comps/SelectCamp.jsx";
import { getTimeStr, getDayStr, getDayNumber, getHourNumber, getDateAndTime } from "../../utils/dateUtils";
import { toast } from "@/services/notificationService";
import LoadingComp from "../general_comps/LoadingComp.jsx";
import { getGuardsAndLimitsForCampId } from "@/services/guardService.js";
import AddToCalendar from "./AddToCalendar";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Box,
  Typography,
  Checkbox,
  ListItemText,
  Tooltip,
  Stack,
  Divider,
  IconButton,
  CircularProgress,
  Avatar,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import SettingsIcon from "@mui/icons-material/Settings";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import CampSettingsDialog from "@/components/CampSettingsDialog/CampSettingsDialog";
import { getShibutsEvents, addShibutsEvent, deleteShibutsEvent } from "@/services/shibutsEventService";
import { getGuardLinkByUserId } from "@/services/userGuardLinkService";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { useAuthContext } from "@/context/AuthContext";
import { useIsCommander } from "@/hooks/useIsCommander";

function getContrastTextColor(hexColor) {
  const hex = (hexColor || "#3174ad").replace("#", "");
  if (hex.length !== 6) return "#ffffff";
  const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const r = toLinear(parseInt(hex.slice(0, 2), 16) / 255);
  const g = toLinear(parseInt(hex.slice(2, 4), 16) / 255);
  const b = toLinear(parseInt(hex.slice(4, 6), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.179 ? "#000000" : "#ffffff";
}

const locales = { he: he };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});
const lrm = "\u200E";
const rtlFormats = {
  eventTimeRangeFormat: ({ start, end }, culture, currentLocalizer) => {
    const startStr = currentLocalizer.format(start, "HH:mm", culture);
    const endStr = currentLocalizer.format(end, "HH:mm", culture);
    return `${lrm}${startStr}${lrm} - ${lrm}${endStr}${lrm}`;
  },
};

function useLoading() {
  const [isLoading, setLoading] = useState(false);

  const withLoading = async (apiCall) => {
    setLoading(true);
    try {
      const response = await apiCall();
      return response;
    } finally {
      setLoading(false);
    }
  };

  return [isLoading, withLoading];
}

const MINUTES_IN_DAY = 24 * 60;
const DURATION_STEP_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 6, 8];

function toMinuteOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function setDateFromDecimalHour(date, decimalHour) {
  const safeHour = Number(decimalHour);
  const hours = Math.floor(safeHour);
  const minutes = Math.round((safeHour - hours) * 60);
  date.setHours(hours, minutes, 0, 0);
}

function buildDatesFromOffsets(baseDate, startMinute, endMinute) {
  const dayStart = new Date(baseDate);
  dayStart.setHours(0, 0, 0, 0);
  const start = new Date(dayStart.getTime() + startMinute * 60 * 1000);
  const end = new Date(dayStart.getTime() + endMinute * 60 * 1000);
  return { start, end };
}

function computeMinuteOffsets(startDate, endDate) {
  const startMinute = toMinuteOfDay(startDate);
  const dayStart = new Date(startDate);
  dayStart.setHours(0, 0, 0, 0);
  let endMinute = Math.round((endDate.getTime() - dayStart.getTime()) / (60 * 1000));
  while (endMinute <= startMinute) {
    endMinute += MINUTES_IN_DAY;
  }
  return { startMinute, endMinute };
}

function ShiftSchedule() {
  const { user } = useAuthContext();
  const isCommander = useIsCommander();
  const [dialogDetails, setDialogDetails] = useState({
    shiftName: "",
    guardName: "",
    dateText: "",
  });
  const [isEdit, setEdit] = useState(false);
  const [tempShibuts, setTempShibuts] = useState(null);
  const [isPopupOpen, setPopupOpen] = useState(false);
  const [campId, setCampId] = useState(null);
  const [autoShibutsStartDate, setAutoShibutsStartDate] = useState(null);
  const [autoShibutsEndDate, setAutoShibutsEndDate] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isLoading, withLoading] = useLoading();
  const [shibutsim, setShibutsim] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedOutpostIds, setSelectedOutpostIds] = useState(null);
  const [currentView, setCurrentView] = useState("day");
  const [durationAdjustHours, setDurationAdjustHours] = useState(0.5);
  const [extraDays, setExtraDays] = useState(0);
  const [swapSource, setSwapSource] = useState(null);
  const sentinelRef = useRef(null);

  // ── אירועים / דיווחים ─────────────────────────────────────────────────────
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [newEventContent, setNewEventContent] = useState("");
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [currentUserGuardId, setCurrentUserGuardId] = useState(null);

  useEffect(() => {
    if (currentView !== "day") return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setExtraDays((prev) => prev + 2); },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [currentView, extraDays]);

  const handleNavigate = useCallback((newDate) => {
    setCurrentDate(newDate);
    setExtraDays(0);
  }, []);

  const renderedDays = useMemo(() => {
    if (currentView !== "day") return [currentDate];
    const days = [];
    for (let i = 0; i <= extraDays; i++) {
      days.push(addDays(currentDate, i));
    }
    return days;
  }, [currentDate, extraDays, currentView]);

  const fallbackColors = useMemo(() => {
    return ["#4B6B2A", "#16A34A", "#DC2626", "#D97706", "#7C3AED", "#0891B2", "#BE185D", "#4F46E5"];
  }, []);

  const { isLoading: guardsLoading, data: guards } = useQuery({
    queryKey: ["guardsAndLimits", campId],
    queryFn: () => getGuardsAndLimitsForCampId(campId),
    enabled: !!campId,
    select: (data) => {
      let mappedGuards = data;
      if (data.length > 0) {
        mappedGuards = data.map((g) => ({
          value: g.guard.id,
          text: g.guard.name,
          guardPhone: g.guard.phone,
          guardMail: g.guard.mail,
          color: g.guard.color || fallbackColors[g.guard.id % fallbackColors.length],
          outpostLimits: g.outpostLimits,
          timeLimits: g.timeLimits,
          dayLimits: g.dayLimits || [],
          peerExclusions: g.peerExclusions || [],
          excludedByPeerIds: g.excludedByPeerIds || [],
        }));
      }
      return mappedGuards;
    },
  });

  const { isLoading: outpostsLoading, data: outpostsAndShifts = [] } = useQuery({
    queryKey: ["outpostsAndShifts", campId],
    queryFn: () => getOutpostsAndShiftsForCampId(campId),
    enabled: !!campId,
  });

  const shiftsLoading = false;

  const outposts = useMemo(() => {
    return outpostsAndShifts.map(({ shifts: _shifts, ...outpost }) => outpost);
  }, [outpostsAndShifts]);

  const shifts = useMemo(() => {
    const allMappendShifts = [];
    if (outpostsAndShifts.length > 0) {
      outpostsAndShifts.forEach((outpost) => {
        if (outpost.shifts?.length > 0) {
          const mappedShifts = outpost.shifts.map((s) => ({
            id: s.id,
            start: getTimeStr(s.fromHour),
            end: getTimeStr(s.toHour),
            resource: s.outpostId,
            dayStr: getDayStr(s.dayId),
          }));
          allMappendShifts.push(...mappedShifts);
        }
      });
    }
    return allMappendShifts;
  }, [outpostsAndShifts]);

  useEffect(() => {
    if (selectedOutpostIds !== null) return;
    if (!outposts.length) return;
    setSelectedOutpostIds(outposts.map((o) => o.id));
  }, [outposts, selectedOutpostIds]);

  useEffect(() => {
    // Wait for shifts + guards before mapping shibuts, otherwise events
    // fall back to 00:00 and render in the all-day lane.
    if (campId && shifts?.length > 0 && guards?.length > 0) {
      fetchShibutsim();
    }
  }, [campId, shifts, guards]);

  // שליפת guardId של המשתמש הנוכחי
  useEffect(() => {
    if (!user?.id || !campId) return;
    getGuardLinkByUserId(user.id, campId).then((link) => {
      setCurrentUserGuardId(link?.guardId ?? null);
    });
  }, [user?.id, campId]);

  // שליפת דיווחים כשהפופאפ נפתח לשיבוץ קיים
  useEffect(() => {
    if (isPopupOpen && isEdit && tempShibuts?.shibutsId) {
      setEventsLoading(true);
      getShibutsEvents(tempShibuts.shibutsId)
        .then((data) => setEvents(data || []))
        .finally(() => setEventsLoading(false));
    } else {
      setEvents([]);
      setNewEventContent("");
    }
  }, [isPopupOpen, isEdit, tempShibuts?.shibutsId]);

  async function fetchShibutsim() {
    let shibutsimData = await getShibutsimOfCurrentMonthByCampId(campId, null);
    if (shibutsimData) {
      setShibutsim(mapShibutsim(shibutsimData));
    }
  }

  const mapShibutsim = useCallback(
    (shibutsim) => {
      return shibutsim.map((s) => {
        const { id, ...copiedShibuts } = s;
        const shift = shifts?.find((sh) => sh.id == s.shiftId);
        const guard = guards?.find((g) => g.value == s.guardId);
        let start;
        let end;
        if (Number.isFinite(s.startMinute) && Number.isFinite(s.endMinute)) {
          const customRange = buildDatesFromOffsets(new Date(s.theDate), s.startMinute, s.endMinute);
          start = customRange.start;
          end = customRange.end;
        } else {
          start = getDateAndTime(s.theDate, shift?.start);
          end = getDateAndTime(s.theDate, shift?.end, true);
          if (end <= start) {
            end.setDate(end.getDate() + 1);
          }
        }
        const updatedShibuts = {
          ...copiedShibuts,
          shibutsId: id,
          start,
          end,
          guardName: guard?.text,
          resource: s.outpostId,
          resourceId: s.outpostId,
          color: guard?.color,
          title: guard?.text || "",
        };
        return updatedShibuts;
      });
    },
    [shifts, guards]
  );

  const findClosestShift = useCallback(
    (outpost, start) => {
      const clickedHour = new Date(start).getHours() + new Date(start).getMinutes() / 60;
      let shift = shifts.filter((s) => {
        if (s.resource != outpost) return false;
        if (getDayNumber(s.dayStr) != start.getDay()) return false;
        const shiftStart = getHourNumber(s.start);
        const shiftEnd = getHourNumber(s.end, true);
        if (shiftEnd > shiftStart) {
          return shiftStart <= clickedHour && shiftEnd >= clickedHour;
        }
        return clickedHour >= shiftStart || clickedHour < shiftEnd;
      });
      if (shift.length > 1) {
        return shift.reduce((prev, current) =>
          prev && getHourNumber(prev.start) > getHourNumber(current.start) ? prev : current
        );
      }
      return shift[0];
    },
    [shifts]
  );

  const checkDayLimit = useCallback((guard, shibuts) => {
    if (!guard.dayLimits?.length) return false;
    const day = shibuts.start.getDay();
    return guard.dayLimits.some((d) => d.dayId === day);
  }, []);

  const checkTimeLimit = useCallback((guard, shibuts) => {
    let hasTimeLimit = false;
    const shibutsStart = shibuts.start.getHours() + shibuts.start.getMinutes() / 60;
    const shibutsEnd = shibuts.end.getHours() + shibuts.end.getMinutes() / 60;
    if (guard.timeLimits.length > 0) {
      const limits = guard.timeLimits.filter(
        (t) =>
          t.dayId == shibuts.start.getDay() &&
          !((t.fromHour <= shibutsStart && t.toHour <= shibutsStart) || (t.fromHour >= shibutsEnd && t.toHour >= shibutsEnd))
      );
      if (limits.length > 0) {
        hasTimeLimit = true;
      }
    }
    return hasTimeLimit;
  }, []);

  const checkPeerConflict = useCallback(
    (guard, shibuts) => {
      const excl = guard.peerExclusions || [];
      const excludedBy = guard.excludedByPeerIds || [];
      if (excl.length === 0 && excludedBy.length === 0) return false;
      const slotDate =
        shibuts.theDate !== undefined && shibuts.theDate !== null ? shibuts.theDate : shibuts.start?.getTime?.();
      if (slotDate == null || shibuts.shiftId == null) return false;

      const others = shibutsim.filter(
        (s) =>
          s.shiftId === shibuts.shiftId &&
          s.outpostId === shibuts.outpostId &&
          Number(s.theDate) === Number(slotDate) &&
          s.guardId &&
          s.shibutsId !== shibuts.shibutsId
      );

      for (const o of others) {
        const oid = o.guardId;
        if (excl.some((e) => e.excludedGuardId === oid)) return true;
        if (excludedBy.includes(oid)) return true;
      }
      return false;
    },
    [shibutsim]
  );

  const checkOutpostLimit = useCallback((guard, shibuts) => {
    let hasOutpostLimit = false;
    if (guard.outpostLimits.length > 0) {
      const limits = guard.outpostLimits.filter((o) => o.outpostId == shibuts.resource);
      if (limits.length > 0) {
        hasOutpostLimit = true;
      }
    }
    return hasOutpostLimit;
  }, []);

  const checkGuardHasLimits = useCallback(
    (guard, shibuts) => {
      let hasLimits = false;
      if (checkDayLimit(guard, shibuts)) {
        toast.error("חייל " + guard.text + " אינו יכול לבצע משמרת ביום זה (מגבלת יום מלא)");
        hasLimits = true;
      }
      const hasTimeLimit = checkTimeLimit(guard, shibuts);
      const hasOutpostLimit = checkOutpostLimit(guard, shibuts);
      if (hasTimeLimit) {
        toast.error("חייל " + guard.text + " אינו יכול לבצע משמרת בשעות אלו");
        hasLimits = true;
      }
      if (hasOutpostLimit) {
        const outpost = outposts.find((o) => o.id === shibuts.outpostId);
        toast.error("חייל " + guard.text + " אינו יכול לבצע משמרת בעמדה " + outpost.name);
        hasLimits = true;
      }
      if (checkPeerConflict(guard, shibuts)) {
        toast.error(
          "חייל " + guard.text + " לא ניתן לשבץ באותה משמרת עם שומר אחר שסומנתה מולו הגבלה (סיכסוך / לא לשמור יחד)"
        );
        hasLimits = true;
      }
      return hasLimits;
    },
    [checkDayLimit, checkOutpostLimit, checkPeerConflict, checkTimeLimit, outposts]
  );

  const checkExistinShibuts = useCallback(
    (shibuts) => {
      const existShibuts = shibutsim.filter(
        (s) =>
          s.guardId == shibuts.guardId &&
          s.shiftId == shibuts.shiftId &&
          s.outpostId == shibuts.outpostId &&
          s.start.getTime() == shibuts.start.getTime()
      );
      if (existShibuts.length > 0) {
        if (shibuts.shibutsId != undefined && shibuts.shibutsId == existShibuts[0].shibutsId) {
          return true;
        }
        const outpostName = outposts.find((o) => o.id == shibuts.outpostId).name;
        const endHour = existShibuts[0].end.getHours() + existShibuts[0].end.getMinutes() / 60;
        toast.error(`כבר קיים שיבוץ ל ${existShibuts[0].guardName} בעמדה ${outpostName} בשעה ${getTimeStr(endHour)}`);
        return true;
      }
      return false;
    },
    [shibutsim, outposts]
  );

  const submitEvent = useCallback(async () => {
    if (!newEventContent.trim() || !tempShibuts?.shibutsId) return;
    setEventSubmitting(true);
    try {
      const ev = await addShibutsEvent({
        shibutsId: tempShibuts.shibutsId,
        campId,
        authorUserId: user?.id,
        authorGuardId: currentUserGuardId,
        content: newEventContent.trim(),
      });
      setEvents((prev) => [...prev, ev]);
      setNewEventContent("");
    } catch {
      // toasted inside service
    } finally {
      setEventSubmitting(false);
    }
  }, [newEventContent, tempShibuts?.shibutsId, campId, user?.id, currentUserGuardId]);

  const deleteEvent = useCallback(async (eventId) => {
    try {
      await deleteShibutsEvent(eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch {
      // toasted inside service
    }
  }, []);

  const onClose = useCallback(() => {
    setPopupOpen(false);
  }, []);

  // ── Swap guards (click-based) ──────────────────────────────────────────────
  const executeSwap = useCallback(
    async (sourceEvent, targetEvent) => {
      const aGuard = { guardId: sourceEvent.guardId, guardName: sourceEvent.guardName, color: sourceEvent.color, title: sourceEvent.guardName };
      const bGuard = { guardId: targetEvent.guardId, guardName: targetEvent.guardName, color: targetEvent.color, title: targetEvent.guardName };

      const updatedA = {
        ...sourceEvent,
        ...bGuard,
        outpostId: sourceEvent.outpostId ?? sourceEvent.resource,
        campId,
        id: sourceEvent.shibutsId,
        theDate: (sourceEvent.originalStart || sourceEvent.start).getTime(),
        start: sourceEvent.originalStart || sourceEvent.start,
        end: sourceEvent.originalEnd || sourceEvent.end,
      };
      const updatedB = {
        ...targetEvent,
        ...aGuard,
        outpostId: targetEvent.outpostId ?? targetEvent.resource,
        campId,
        id: targetEvent.shibutsId,
        theDate: targetEvent.start.getTime(),
      };

      const outpostA = outposts.find((o) => o.id == updatedA.outpostId);
      const outpostB = outposts.find((o) => o.id == updatedB.outpostId);
      updatedA.outpostName = outpostA?.name || "";
      updatedB.outpostName = outpostB?.name || "";

      try {
        await withLoading(async () => {
          await createOrUpdateShibuts(updatedA);
          await createOrUpdateShibuts(updatedB);
        });
        const next = shibutsim.map((s) => {
          if (s.shibutsId === sourceEvent.shibutsId) return updatedA;
          if (s.shibutsId === targetEvent.shibutsId) return updatedB;
          return s;
        });
        setShibutsim(next);
        toast.success(`הוחלף: ${aGuard.guardName} ↔ ${bGuard.guardName}`);
      } catch { /* toasted inside service */ }
    },
    [outposts, shibutsim, campId]
  );

  const onShibutsClick = useCallback(
    (event) => {
      // אירוע פנטום – פתיחת דיאלוג שיבוץ חדש
      if (event.isPhantom) {
        setSwapSource(null);
        if (!isCommander) return;
        const outpost = outposts.find((o) => o.id === event.outpostId);
        const phantomStart = new Date(event.start);
        const phantomEnd = new Date(event.end);
        const phantomOffsets = computeMinuteOffsets(phantomStart, phantomEnd);
        setEdit(false);
        setTempShibuts({
          start: phantomStart,
          end: phantomEnd,
          theDate: event.start.getTime(),
          guardName: "",
          guardId: "",
          shiftId: event.shiftId,
          outpostId: event.outpostId,
          resource: event.outpostId,
          campId,
          color: "#ff0000",
          title: "",
          startMinute: phantomOffsets.startMinute,
          endMinute: phantomOffsets.endMinute,
        });
        setDialogDetails({
          shiftName: `${outpost?.name || ""} | ${format(new Date(event.start), "HH:mm")} - ${format(new Date(event.end), "HH:mm")}`,
          guardName: "לא נבחר עדיין",
          dateText: format(new Date(event.start), "dd/MM/yyyy"),
        });
        setPopupOpen(true);
        return;
      }

      const shibuts = {
        ...event,
        start: event.originalStart || event.start,
        end: event.originalEnd || event.end,
      };
      const outpost = outposts.find((o) => o.id === shibuts.resource);
      shibuts.outpostId = shibuts.resource;
      setDialogDetails({
        shiftName: `${outpost?.name || ""} | ${format(new Date(shibuts.start), "HH:mm")} - ${format(new Date(shibuts.end), "HH:mm")}`,
        guardName: shibuts.guardName || "לא נבחר",
        dateText: format(new Date(shibuts.start), "dd/MM/yyyy"),
      });
      setEdit(true);
      const existingOffsets = computeMinuteOffsets(new Date(shibuts.start), new Date(shibuts.end));
      setTempShibuts({
        ...shibuts,
        startMinute: Number.isFinite(shibuts.startMinute) ? shibuts.startMinute : existingOffsets.startMinute,
        endMinute: Number.isFinite(shibuts.endMinute) ? shibuts.endMinute : existingOffsets.endMinute,
      });
      setPopupOpen(true);
    },
    [outposts, isCommander, campId]
  );

  const onDeleteClick = useCallback(async () => {
    await withLoading(() => deleteShibuts(tempShibuts.shibutsId));
    setShibutsim(shibutsim.filter((shibuts) => shibuts.shibutsId !== tempShibuts.shibutsId));
    setPopupOpen(false);
  }, [tempShibuts, shibutsim]);

  const saveShibuts = useCallback(
    async (shibutsToSave) => {
      const outpostName = outposts.find((o) => o.id == shibutsToSave.outpostId).name;
      shibutsToSave.campId = campId;
      shibutsToSave.theDate = shibutsToSave.start.getTime();
      shibutsToSave.outpostName = outpostName;
      shibutsToSave.id = shibutsToSave.shibutsId;
      await withLoading(() => createOrUpdateShibuts(shibutsToSave));
      if (shibutsToSave.shibutsId != null) {
        const index = shibutsim.findIndex((s) => s.shibutsId === shibutsToSave.shibutsId);
        const newShibutsimList = [...shibutsim];
        newShibutsimList.splice(index, 1, shibutsToSave);
        setShibutsim(newShibutsimList);
      } else {
        setShibutsim([...shibutsim, shibutsToSave]);
      }
      setPopupOpen(false);
    },
    [outposts, shibutsim, tempShibuts, campId]
  );

  const checkAnsSaveShibuts = useCallback(
    (shibutsToSave) => {
      if (!shibutsToSave.guardId || shibutsToSave.guardId == 0) return;

      const duplicate = shibutsim.find(
        (s) =>
          s.guardId == shibutsToSave.guardId &&
          s.shiftId == shibutsToSave.shiftId &&
          s.outpostId == shibutsToSave.outpostId &&
          s.start.getTime() == shibutsToSave.start.getTime() &&
          s.shibutsId !== shibutsToSave.shibutsId
      );
      if (duplicate) {
        const outpostName = outposts.find((o) => o.id == shibutsToSave.outpostId)?.name || "";
        const duplicateEndHour = duplicate.end.getHours() + duplicate.end.getMinutes() / 60;
        toast.error(`כבר קיים שיבוץ ל ${duplicate.guardName} בעמדה ${outpostName} בשעה ${getTimeStr(duplicateEndHour)}`);
        return;
      }

      saveShibuts(shibutsToSave);
    },
    [shibutsim, outposts, saveShibuts]
  );

  const handleSelectSlot = useCallback(
    (slotInfo) => {
      if (!outposts || !shifts) return;
      // slotInfo has start, end, resourceId
      const resourceId = slotInfo.resourceId;
      const shift = findClosestShift(resourceId, slotInfo.start);
      if (shift != undefined) {
        const start = new Date(slotInfo.start);
        setDateFromDecimalHour(start, getHourNumber(shift.start));
        const end = new Date(slotInfo.start);
        setDateFromDecimalHour(end, getHourNumber(shift.end, true));
        if (end <= start) {
          end.setDate(end.getDate() + 1);
        }
        const slotOffsets = computeMinuteOffsets(start, end);
        const outpost = outposts.find((o) => o.id === resourceId);
        setEdit(false);
        const newShibuts = {
          start,
          end,
          theDate: start.getTime(),
          guardName: "",
          guardId: "",
          shiftId: shift.id,
          outpostId: resourceId,
          resource: resourceId,
          campId: campId,
          color: "#ff0000",
          title: "",
          startMinute: slotOffsets.startMinute,
          endMinute: slotOffsets.endMinute,
        };
        setDialogDetails({
          shiftName: `${outpost?.name || ""} | ${format(start, "HH:mm")} - ${format(end, "HH:mm")}`,
          guardName: "לא נבחר עדיין",
          dateText: format(start, "dd/MM/yyyy"),
        });
        setTempShibuts(newShibuts);
        setPopupOpen(true);
      } else {
        toast.error("אין משמרות בזמן זה");
      }
    },
    [outposts, shifts, findClosestShift, campId]
  );

  const onGuardChange = useCallback(
    (e) => {
      const selectedValue = e.target.value;
      const guard = guards.find((g) => g.value == selectedValue);
      if (guard && !checkGuardHasLimits(guard, tempShibuts)) {
        setTempShibuts({
          ...tempShibuts,
          guardName: guard.text,
          guardId: guard.value,
          color: guard.color,
          title: guard.text,
        });
      }
    },
    [tempShibuts, guards, checkGuardHasLimits]
  );

  const onCommanderMoveDate = useCallback(
    (value) => {
      if (!value || !tempShibuts) return;
      const nextDate = value.toDate();
      const start = new Date(tempShibuts.start);
      const end = new Date(tempShibuts.end);
      start.setFullYear(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
      end.setFullYear(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
      if (end <= start) {
        end.setDate(end.getDate() + 1);
      }
      const { startMinute, endMinute } = computeMinuteOffsets(start, end);
      setTempShibuts({
        ...tempShibuts,
        start,
        end,
        startMinute,
        endMinute,
      });
      setDialogDetails((prev) => ({
        ...prev,
        dateText: format(start, "dd/MM/yyyy"),
        shiftName: (() => {
          const outpost = outposts.find((o) => o.id === tempShibuts.outpostId || o.id === tempShibuts.resource);
          return `${outpost?.name || ""} | ${format(start, "HH:mm")} - ${format(end, "HH:mm")}`;
        })(),
      }));
    },
    [tempShibuts, outposts]
  );

  const adjustShibutsDuration = useCallback(
    (direction) => {
      if (!tempShibuts?.start || !tempShibuts?.end) return;
      const deltaMinutes = Math.round(Number(durationAdjustHours || 0) * 60);
      if (deltaMinutes <= 0) {
        toast.error("נא לבחור משך שינוי חוקי");
        return;
      }

      const start = new Date(tempShibuts.start);
      const end = new Date(tempShibuts.end);
      const nextEnd = new Date(end);
      if (direction === "shorten") {
        nextEnd.setMinutes(nextEnd.getMinutes() - deltaMinutes);
      } else {
        nextEnd.setMinutes(nextEnd.getMinutes() + deltaMinutes);
      }

      const nextDurationMinutes = Math.round((nextEnd.getTime() - start.getTime()) / (60 * 1000));
      if (nextDurationMinutes < 30) {
        toast.error("אורך משמרת מינימלי הוא 30 דקות");
        return;
      }
      if (nextDurationMinutes > 24 * 60) {
        toast.error("לא ניתן להאריך מעבר ל-24 שעות");
        return;
      }

      const { startMinute, endMinute } = computeMinuteOffsets(start, nextEnd);
      const updated = {
        ...tempShibuts,
        start,
        end: nextEnd,
        startMinute,
        endMinute,
      };
      setTempShibuts(updated);
      const outpost = outposts.find((o) => o.id === updated.outpostId || o.id === updated.resource);
      setDialogDetails((prev) => ({
        ...prev,
        shiftName: `${outpost?.name || ""} | ${format(updated.start, "HH:mm")} - ${format(updated.end, "HH:mm")}`,
      }));
    },
    [tempShibuts, durationAdjustHours, outposts]
  );

  const onAutoShibutsClick = useCallback(async () => {
    if (autoShibutsStartDate && autoShibutsEndDate) {
      const dates = [autoShibutsStartDate.toDate(), autoShibutsEndDate.toDate()];
      const outpostIds = Array.isArray(selectedOutpostIds) ? selectedOutpostIds : null;
      await withLoading(() => getAutoShibutsimByCampIdAndDates(campId, dates, outpostIds));
      const updated = await getShibutsimOfCurrentMonthByCampId(campId);
      setShibutsim(mapShibutsim(updated || []));
    } else {
      toast.error("נא לבחור תאריכים לשיבוץ אוטומטי");
    }
  }, [autoShibutsStartDate, autoShibutsEndDate, campId, mapShibutsim, selectedOutpostIds]);

  const onDeleteAutoShibutsClick = useCallback(async () => {
    if (autoShibutsStartDate && autoShibutsEndDate) {
      const dates = [autoShibutsStartDate.toDate(), autoShibutsEndDate.toDate()];
      await withLoading(() => deleteAutoShibutsim(campId, dates));
      const updated = await getShibutsimOfCurrentMonthByCampId(campId);
      setShibutsim(mapShibutsim(updated || []));
    } else {
      toast.error("נא לבחור תאריכים לשיבוץ אוטומטי למחיקה");
    }
  }, [autoShibutsStartDate, autoShibutsEndDate, campId, mapShibutsim]);

  const visibleOutpostIds = useMemo(() => {
    if (!Array.isArray(selectedOutpostIds)) return outposts.map((o) => o.id);
    return selectedOutpostIds;
  }, [outposts, selectedOutpostIds]);

  const resources = useMemo(() => {
    if (!outposts) return [];
    return outposts
      .filter((o) => visibleOutpostIds.includes(o.id))
      .map((o) => ({
      resourceId: o.id,
      resourceTitle: o.name,
    }));
  }, [outposts, visibleOutpostIds]);

  const visibleDates = useMemo(() => {
    if (currentView !== "day") {
      const weekStart = startOfWeek(new Date(currentDate), { weekStartsOn: 0 });
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        d.setHours(0, 0, 0, 0);
        dates.push(d);
      }
      return dates;
    }
    return renderedDays.map((d) => {
      const copy = new Date(d);
      copy.setHours(0, 0, 0, 0);
      return copy;
    });
  }, [currentDate, currentView, renderedDays]);

  // ── מינימום שומרים לפי עמדה ──────────────────────────────────────────────
  const outpostMinGuards = useMemo(() => {
    const m = new Map();
    outpostsAndShifts.forEach((o) => m.set(o.id, o.minGuards ?? 1));
    return m;
  }, [outpostsAndShifts]);

  const calendarEvents = useMemo(() => {
    const splitEvents = [];

    shibutsim.forEach((s, idx) => {
      if (!visibleOutpostIds.includes(s.resource)) {
        return;
      }
      const originalStart = new Date(s.start);
      const originalEnd = new Date(s.end);
      const baseEvent = {
        ...s,
        title: s.guardName || "",
        resourceId: s.resource,
        originalStart,
        originalEnd,
      };

      let segmentStart = new Date(originalStart);
      let segmentIndex = 0;
      while (segmentStart < originalEnd) {
        const nextMidnight = new Date(segmentStart);
        nextMidnight.setDate(nextMidnight.getDate() + 1);
        nextMidnight.setHours(0, 0, 0, 0);
        const crossesMidnight = originalEnd > nextMidnight;
        const segmentEnd = crossesMidnight ? nextMidnight : new Date(originalEnd);
        const isFromPreviousDay = segmentStart.getTime() > originalStart.getTime();

        const displayEnd = new Date(segmentEnd);
        if (crossesMidnight || segmentEnd.getTime() === nextMidnight.getTime()) {
          displayEnd.setHours(23, 59, 0, 0);
          displayEnd.setFullYear(segmentStart.getFullYear(), segmentStart.getMonth(), segmentStart.getDate());
        }

        if (displayEnd > segmentStart) {
          splitEvents.push({
            ...baseEvent,
            id: `${s.shibutsId || idx}-${segmentIndex}`,
            start: new Date(segmentStart),
            end: displayEnd,
            isFromPreviousDay,
          });
        }

        segmentStart = new Date(segmentEnd);
        segmentIndex += 1;
      }
    });

    // ── ספירת שיבוצים קיימים לכל (עמדה, משמרת, תאריך) ───────────────────────
    const slotCounts = new Map();
    shibutsim.forEach((s) => {
      const d = new Date(s.start);
      d.setHours(0, 0, 0, 0);
      const key = `${s.outpostId}-${s.shiftId}-${d.getTime()}`;
      slotCounts.set(key, (slotCounts.get(key) || 0) + 1);
    });

    // ── אירועי פנטום למשמרות עם חסר ─────────────────────────────────────────
    const phantoms = [];
    visibleDates.forEach((date) => {
      const dateKey = date.getTime();
      const jsDay = date.getDay();

      outpostsAndShifts.forEach((outpost) => {
        if (!visibleOutpostIds.includes(outpost.id)) return;
        const minGuards = outpost.minGuards ?? 1;

        (outpost.shifts || []).forEach((shift) => {
          if (getDayNumber(getDayStr(shift.dayId)) !== jsDay) return;

          const key = `${outpost.id}-${shift.id}-${dateKey}`;
          const count = slotCounts.get(key) || 0;
          const missing = minGuards - count;

          for (let i = 0; i < missing; i++) {
            const start = new Date(date);
            setDateFromDecimalHour(start, shift.fromHour);
            const end = new Date(date);
            if (shift.toHour >= 24) {
              end.setHours(23, 59, 0, 0);
            } else {
              setDateFromDecimalHour(end, shift.toHour);
              if (end <= start) end.setDate(end.getDate() + 1);
            }

            phantoms.push({
              id: `phantom-${outpost.id}-${shift.id}-${dateKey}-${i}`,
              isPhantom: true,
              start,
              end,
              resourceId: outpost.id,
              resource: outpost.id,
              outpostId: outpost.id,
              shiftId: shift.id,
              title: "",
            });
          }
        });
      });
    });

    return [...splitEvents, ...phantoms];
  }, [shibutsim, visibleOutpostIds, visibleDates, outpostsAndShifts, outpostMinGuards]);

  const handleOutpostFilterChange = useCallback((event) => {
    const value = event.target.value;
    setSelectedOutpostIds(Array.isArray(value) ? value : []);
  }, []);

  const eventPropGetter = useCallback((event) => {
    if (event.isPhantom) {
      return {
        style: {
          backgroundColor: "rgba(220,38,38,0.07)",
          border: "2px dashed #dc2626",
          borderRadius: "6px",
          color: "#dc2626",
          cursor: isCommander ? "pointer" : "default",
        },
      };
    }
    const baseColor = event.color || "#3174ad";
    const isSwapSelected = swapSource && event.shibutsId === swapSource.shibutsId;
    const style = {
      backgroundColor: baseColor,
      borderRadius: "4px",
      opacity: 0.9,
      color: getContrastTextColor(baseColor),
      border: isSwapSelected ? "3px solid #fff" : "0px",
      boxShadow: isSwapSelected ? "0 0 12px 3px rgba(255,255,255,0.7), 0 0 4px 1px rgba(0,0,0,0.4)" : undefined,
      display: "block",
      cursor: swapSource ? "pointer" : undefined,
      transform: isSwapSelected ? "scale(1.04)" : undefined,
      zIndex: isSwapSelected ? 10 : undefined,
      transition: "transform 0.15s, box-shadow 0.15s, border 0.15s",
    };
    if (event.isFromPreviousDay) {
      style.opacity = 0.45;
      style.backgroundImage = `repeating-linear-gradient(
        -45deg,
        transparent,
        transparent 4px,
        rgba(255,255,255,0.18) 4px,
        rgba(255,255,255,0.18) 8px
      )`;
    }
    return { style };
  }, [isCommander, swapSource]);

  const onSwapIconClick = useCallback(
    (e, event) => {
      e.stopPropagation();
      if (event.isFromPreviousDay) return;

      if (swapSource && swapSource.shibutsId === event.shibutsId) {
        setSwapSource(null);
        toast.info("החלפה בוטלה");
        return;
      }

      if (swapSource) {
        const src = shibutsim.find((s) => s.shibutsId === swapSource.shibutsId);
        if (src) {
          executeSwap(src, {
            ...event,
            start: event.originalStart || event.start,
            end: event.originalEnd || event.end,
            outpostId: event.resource,
          });
        }
        setSwapSource(null);
        return;
      }

      setSwapSource({
        shibutsId: event.shibutsId,
        guardId: event.guardId,
        guardName: event.guardName || event.title,
        color: event.color,
      });
      toast.info(`לחץ על אייקון ↔ בקוביה אחרת כדי להחליף עם ${event.guardName || event.title}`);
    },
    [swapSource, shibutsim, executeSwap]
  );

  const onDeleteIconClick = useCallback(
    async (e, event) => {
      e.stopPropagation();
      if (!event.shibutsId || event.isFromPreviousDay) return;
      const guardName = event.guardName || event.title || "";
      if (!window.confirm(`למחוק את השיבוץ של ${guardName}?`)) return;
      try {
        await withLoading(() => deleteShibuts(event.shibutsId));
        setShibutsim((prev) => prev.filter((s) => s.shibutsId !== event.shibutsId));
        toast.success(`שיבוץ של ${guardName} נמחק`);
      } catch { /* toasted inside service */ }
    },
    []
  );

  const EventComponent = useCallback(
    ({ event }) => {
      if (event.isPhantom) {
        const tooltipText = isCommander ? "לחץ לשיבוץ חייל" : "חסר שומר במשמרת זו";
        return (
          <Tooltip title={tooltipText} placement="top">
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: 0.25,
                py: 0.5,
              }}
            >
              <AddCircleOutlineIcon sx={{ fontSize: 18, color: "#dc2626" }} />
              <Box component="span" sx={{ fontSize: "0.65rem", fontWeight: 700, color: "#dc2626", lineHeight: 1 }}>
                חסר שיבוץ
              </Box>
            </Box>
          </Tooltip>
        );
      }

      const isSwapSelected = swapSource && event.shibutsId === swapSource.shibutsId;
      const showActions = isCommander && !event.isFromPreviousDay;

      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "space-between",
            height: "100%",
            px: 0.75,
            overflow: "visible",
            width: "100%",
          }}
        >
          <Box
            component="span"
            sx={{
              fontWeight: 700,
              fontSize: "0.95rem",
              lineHeight: 1.2,
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              minWidth: 0,
            }}
          >
            {event.title}
          </Box>

          {showActions && (
            <Box sx={{ display: "flex", flexShrink: 0, gap: 1 }}>
              <Tooltip title="מחק שיבוץ" placement="top">
                <Box
                  component="span"
                  onClick={(e) => onDeleteIconClick(e, event)}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    backgroundColor: "rgba(255,255,255,0.3)",
                    cursor: "pointer",
                    transition: "background-color 0.15s, transform 0.15s",
                    "&:hover": {
                      backgroundColor: "rgba(255,80,80,0.85)",
                      transform: "scale(1.15)",
                    },
                  }}
                >
                  <DeleteOutlineIcon
                    sx={{ fontSize: 18, color: "rgba(0,0,0,0.6)" }}
                  />
                </Box>
              </Tooltip>
              <Tooltip title="החלף שומר" placement="top">
                <Box
                  component="span"
                  onClick={(e) => onSwapIconClick(e, event)}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    backgroundColor: isSwapSelected
                      ? "rgba(255,255,255,0.95)"
                      : swapSource
                        ? "rgba(255,255,255,0.85)"
                        : "rgba(255,255,255,0.3)",
                    cursor: "pointer",
                    transition: "background-color 0.15s, transform 0.15s",
                    "&:hover": {
                      backgroundColor: "rgba(255,255,255,0.9)",
                      transform: "scale(1.15)",
                    },
                  }}
                >
                  <SwapHorizIcon
                    sx={{
                      fontSize: 18,
                      color: isSwapSelected ? "#1976d2" : swapSource ? "#1976d2" : "rgba(0,0,0,0.6)",
                    }}
                  />
                </Box>
              </Tooltip>
            </Box>
          )}
        </Box>
      );
    },
    [isCommander, swapSource, onSwapIconClick, onDeleteIconClick]
  );

  const messages = {
    today: "היום",
    previous: "הקודם",
    next: "הבא",
    month: "חודש",
    week: "שבוע",
    day: "יום",
    agenda: "סדר יום",
    date: "תאריך",
    time: "שעה",
    event: "אירוע",
    noEventsInRange: "אין אירועים בטווח זה",
  };

  return (
    <div>
      <SelectCamp setSelectedCampId={setCampId} selectedCampId={campId} title={"שיבוץ משמרות"} title2={"בבסיס:"} />
      {isCommander && (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2, flexWrap: "wrap" }}>
            <DatePicker
              label="מתאריך"
              value={autoShibutsStartDate}
              onChange={(val) => setAutoShibutsStartDate(val)}
              minDate={dayjs()}
              renderInput={(params) => <TextField {...params} size="small" />}
            />
            <DatePicker
              label="עד תאריך"
              value={autoShibutsEndDate}
              onChange={(val) => setAutoShibutsEndDate(val)}
              minDate={autoShibutsStartDate || dayjs()}
              renderInput={(params) => <TextField {...params} size="small" />}
            />
            <Button variant="contained" color="info" onClick={onAutoShibutsClick}>
              שיבוץ אוטומטי
            </Button>
            <Button variant="contained" color="error" onClick={onDeleteAutoShibutsClick}>
              מחיקת שיבוצים
            </Button>
            <Tooltip title="הגדרות שיבוץ אוטומטי">
              <IconButton color="default" onClick={() => setSettingsOpen(true)}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </LocalizationProvider>
      )}
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2, flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel id="outpost-filter-label">עמדות להצגה ביומן</InputLabel>
          <Select
            labelId="outpost-filter-label"
            multiple
            value={visibleOutpostIds}
            onChange={handleOutpostFilterChange}
            label="עמדות להצגה ביומן"
            renderValue={(selected) => {
              if (!selected.length) return "לא נבחרו עמדות";
              if (selected.length === outposts.length) return "כל העמדות";
              return `${selected.length} עמדות נבחרו`;
            }}
          >
            {outposts.map((outpost) => (
              <MenuItem key={outpost.id} value={outpost.id}>
                <Checkbox checked={visibleOutpostIds.includes(outpost.id)} />
                <ListItemText primary={outpost.name} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="outlined" onClick={() => setSelectedOutpostIds(outposts.map((o) => o.id))}>
          הצג הכל
        </Button>
        <Button variant="text" color="inherit" onClick={() => setSelectedOutpostIds([])}>
          נקה הכל
        </Button>
      </Box>

      {isLoading || guardsLoading || outpostsLoading || shiftsLoading ? (
        <LoadingComp />
      ) : (
        <>
          {swapSource && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                py: 1.5,
                px: 2,
                mb: 1,
                borderRadius: 2,
                backgroundColor: "info.main",
                color: "info.contrastText",
                fontWeight: 700,
                fontSize: "0.95rem",
              }}
            >
              <span>מצב החלפה: לחץ על קוביה אחרת כדי להחליף עם {swapSource.guardName}</span>
              <Button
                size="small"
                variant="contained"
                color="warning"
                onClick={() => { setSwapSource(null); toast.info("החלפה בוטלה"); }}
              >
                ביטול
              </Button>
            </Box>
          )}
          {currentView === "day" ? (
            <div className="infinite-day-scroll">
              {renderedDays.map((day, dayIdx) => {
                const dayStart = new Date(day);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(dayStart);
                dayEnd.setDate(dayEnd.getDate() + 1);
                const dayEvents = calendarEvents.filter((e) => {
                  const s = e.start.getTime();
                  return s >= dayStart.getTime() && s < dayEnd.getTime();
                });
                const isFollowUp = dayIdx > 0;
                return (
                  <div
                    key={dayStart.getTime()}
                    className={isFollowUp ? "rbc-day-continuation" : undefined}
                  >
                    {isFollowUp && (
                      <div className="day-divider-label">
                        {format(day, "EEEE dd/MM", { locale: he })}
                      </div>
                    )}
                    <Calendar
                      localizer={localizer}
                      culture="he"
                      events={dayEvents}
                      dayLayoutAlgorithm="no-overlap"
                      resources={resources}
                      resourceIdAccessor="resourceId"
                      resourceTitleAccessor="resourceTitle"
                      startAccessor="start"
                      endAccessor="end"
                      defaultView="day"
                      view="day"
                      onView={setCurrentView}
                      views={["day", "week"]}
                      step={60}
                      timeslots={1}
                      date={day}
                      onNavigate={handleNavigate}
                      toolbar={dayIdx === 0}
                      selectable={isCommander}
                      onSelectSlot={isCommander ? handleSelectSlot : undefined}
                      onSelectEvent={onShibutsClick}
                      eventPropGetter={eventPropGetter}
                      components={{ event: EventComponent }}
                      messages={messages}
                      formats={rtlFormats}
                      rtl={true}
                      style={{ height: "auto" }}
                    />
                  </div>
                );
              })}
              <div ref={sentinelRef} style={{ height: 1 }} />
            </div>
          ) : (
            <div style={{ height: "70vh" }}>
              <Calendar
                localizer={localizer}
                culture="he"
                events={calendarEvents}
                dayLayoutAlgorithm="no-overlap"
                resources={resources}
                resourceIdAccessor="resourceId"
                resourceTitleAccessor="resourceTitle"
                startAccessor="start"
                endAccessor="end"
                defaultView="day"
                view={currentView}
                onView={setCurrentView}
                views={["day", "week"]}
                step={60}
                timeslots={1}
                date={currentDate}
                onNavigate={handleNavigate}
                selectable={isCommander}
                onSelectSlot={isCommander ? handleSelectSlot : undefined}
                onSelectEvent={onShibutsClick}
                eventPropGetter={eventPropGetter}
                components={{ event: EventComponent }}
                messages={messages}
                formats={rtlFormats}
                rtl={true}
                style={{ minHeight: 500 }}
              />
            </div>
          )}

          <Dialog open={isPopupOpen} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  פרטי המשמרת
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "120px 1fr",
                    gap: 0.75,
                    backgroundColor: "action.hover",
                    borderRadius: 1.5,
                    px: 1.5,
                    py: 1.25,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">שם המשמרת</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{dialogDetails.shiftName}</Typography>
                  <Typography variant="body2" color="text.secondary">שם החייל</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{dialogDetails.guardName}</Typography>
                  <Typography variant="body2" color="text.secondary">תאריך</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{dialogDetails.dateText}</Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              {isCommander ? (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5, fontWeight: 700 }}>
                    מה תרצה לעשות במשמרת הזאת?
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    בחר חייל מהרשימה ולחץ שמירה כדי לעדכן את השיבוץ.
                  </Typography>
                  <FormControl fullWidth sx={{ mt: 1 }}>
                    <InputLabel>שם החייל</InputLabel>
                    <Select
                      value={tempShibuts?.guardId || ""}
                      onChange={onGuardChange}
                      label="שם החייל"
                    >
                      {guards?.map((g) => (
                        <MenuItem key={g.value} value={g.value}>
                          {g.text}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {isEdit && (
                    <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        פעולות נוספות
                      </Typography>
                      <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                          <InputLabel id="duration-adjust-label">כמה שעות</InputLabel>
                          <Select
                            labelId="duration-adjust-label"
                            value={durationAdjustHours}
                            onChange={(e) => setDurationAdjustHours(Number(e.target.value))}
                            label="כמה שעות"
                          >
                            {DURATION_STEP_OPTIONS.map((step) => (
                              <MenuItem key={step} value={step}>
                                {step} שעות
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Button
                          variant="outlined"
                          color="warning"
                          onClick={() => adjustShibutsDuration("shorten")}
                        >
                          קצר משמרת
                        </Button>
                        <Button
                          variant="outlined"
                          color="success"
                          onClick={() => adjustShibutsDuration("extend")}
                        >
                          הארך משמרת
                        </Button>
                      </Stack>
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                          label="הזזה ידנית לתאריך"
                          value={tempShibuts?.start ? dayjs(tempShibuts.start) : null}
                          onChange={onCommanderMoveDate}
                          renderInput={(params) => <TextField {...params} size="small" />}
                        />
                      </LocalizationProvider>
                      <AddToCalendar shibuts={tempShibuts} guards={guards} outposts={outposts} />
                      <Button fullWidth variant="outlined" color="error" onClick={onDeleteClick}>
                        מחיקת משמרת
                      </Button>
                    </Box>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  ניתן לצפות בפרטי המשמרת בלבד. לשינויים, פנה למפקד.
                </Typography>
              )}

              {/* ── דיווחי אירועים ── */}
              {isEdit && tempShibuts?.shibutsId && (
                <>
                  <Divider sx={{ mt: 2.5, mb: 1.5 }} />
                  <Stack direction="row" alignItems="center" gap={0.75} sx={{ mb: 1.25 }}>
                    <EventNoteOutlinedIcon sx={{ fontSize: 17, color: "text.secondary" }} />
                    <Typography variant="subtitle2" fontWeight={700}>
                      דיווחי אירועים
                    </Typography>
                    {events.length > 0 && (
                      <Typography variant="caption" color="text.disabled">
                        ({events.length})
                      </Typography>
                    )}
                  </Stack>

                  {/* רשימת דיווחים */}
                  {eventsLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                      <CircularProgress size={22} />
                    </Box>
                  ) : events.length === 0 ? (
                    <Typography variant="body2" color="text.disabled" sx={{ mb: 1.5, textAlign: "center", py: 1 }}>
                      אין דיווחים עדיין
                    </Typography>
                  ) : (
                    <Stack spacing={1} sx={{ maxHeight: 220, overflowY: "auto", mb: 1.5, pr: 0.5 }}>
                      {events.map((ev) => {
                        const guard = guards?.find((g) => g.value === ev.authorGuardId);
                        const authorName = guard?.text ?? (ev.authorGuardId ? `שומר #${ev.authorGuardId}` : "מפקד");
                        const initials = authorName.charAt(0);
                        const canDelete = isCommander || ev.authorUserId === user?.id;
                        return (
                          <Box
                            key={ev.id}
                            sx={{
                              bgcolor: "action.hover",
                              borderRadius: "8px",
                              px: 1.5,
                              py: 1,
                              border: "1px solid",
                              borderColor: "divider",
                            }}
                          >
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                              <Stack direction="row" alignItems="center" gap={0.75}>
                                <Avatar sx={{ width: 22, height: 22, fontSize: "0.65rem", bgcolor: "primary.main" }}>
                                  {initials}
                                </Avatar>
                                <Typography variant="caption" fontWeight={700}>
                                  {authorName}
                                </Typography>
                                <Typography variant="caption" color="text.disabled">
                                  {format(new Date(ev.createdAt), "dd/MM HH:mm")}
                                </Typography>
                              </Stack>
                              {canDelete && (
                                <IconButton
                                  size="small"
                                  onClick={() => deleteEvent(ev.id)}
                                  sx={{ p: 0.25, color: "text.disabled", "&:hover": { color: "error.main" } }}
                                >
                                  <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                                </IconButton>
                              )}
                            </Stack>
                            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                              {ev.content}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Stack>
                  )}

                  {/* שדה כתיבה */}
                  <Stack direction="row" gap={1} alignItems="flex-end">
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      maxRows={3}
                      placeholder="כתוב דיווח או הערה..."
                      value={newEventContent}
                      onChange={(e) => setNewEventContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          submitEvent();
                        }
                      }}
                    />
                    <IconButton
                      color="primary"
                      disabled={!newEventContent.trim() || eventSubmitting}
                      onClick={submitEvent}
                      sx={{ mb: 0.25 }}
                    >
                      {eventSubmitting ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <SendOutlinedIcon />
                      )}
                    </IconButton>
                  </Stack>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose}>{isCommander ? "ביטול" : "סגור"}</Button>
              {isCommander && (
                <Button
                  variant="contained"
                  onClick={() => checkAnsSaveShibuts(tempShibuts)}
                >
                  {isEdit ? "שמור שינוי" : "יצירת שיבוץ"}
                </Button>
              )}
            </DialogActions>
          </Dialog>
          <CampSettingsDialog
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            campId={campId}
          />
        </>
      )}
    </div>
  );
}

export default ShiftSchedule;
