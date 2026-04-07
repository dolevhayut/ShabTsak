import { useState, useMemo, useCallback, useEffect } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { format, parse, startOfWeek, getDay } from "date-fns";
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
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { useAuthContext } from "@/context/AuthContext";
import { useIsCommander } from "@/hooks/useIsCommander";

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
  const [isLoading, withLoading] = useLoading();
  const [shibutsim, setShibutsim] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedOutpostIds, setSelectedOutpostIds] = useState(null);

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
        const start = getDateAndTime(s.theDate, shift?.start);
        const end = getDateAndTime(s.theDate, shift?.end, true);
        if (end <= start) {
          end.setDate(end.getDate() + 1);
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
      const clickedHour = new Date(start).getHours();
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
    const shibutsStart = shibuts.start.getHours();
    const shibutsEnd = shibuts.end.getHours();
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
        toast.error(`כבר קיים שיבוץ ל ${existShibuts[0].guardName} בעמדה ${outpostName} בשעה ${getTimeStr(existShibuts[0].end.getHours())}`);
        return true;
      }
      return false;
    },
    [shibutsim, outposts]
  );

  const onClose = useCallback(() => {
    setPopupOpen(false);
  }, []);

  const onShibutsClick = useCallback(
    (event) => {
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
      setTempShibuts({ ...shibuts });
      setPopupOpen(true);
    },
    [outposts]
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
      const isExistingShibuts = checkExistinShibuts(shibutsToSave);
      if (shibutsToSave.guardId != 0 && !isExistingShibuts) {
        saveShibuts(shibutsToSave);
      }
    },
    [checkExistinShibuts, saveShibuts]
  );

  const handleSelectSlot = useCallback(
    (slotInfo) => {
      if (!outposts || !shifts) return;
      // slotInfo has start, end, resourceId
      const resourceId = slotInfo.resourceId;
      const shift = findClosestShift(resourceId, slotInfo.start);
      if (shift != undefined) {
        const start = new Date(slotInfo.start);
        start.setHours(getHourNumber(shift.start), 0, 0);
        const end = new Date(slotInfo.start);
        end.setHours(getHourNumber(shift.end, true), 0, 0);
        if (end <= start) {
          end.setDate(end.getDate() + 1);
        }
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
      setTempShibuts({
        ...tempShibuts,
        start,
        end,
      });
    },
    [tempShibuts]
  );

  const onAutoShibutsClick = useCallback(async () => {
    if (autoShibutsStartDate && autoShibutsEndDate) {
      const dates = [autoShibutsStartDate.toDate(), autoShibutsEndDate.toDate()];
      let newShibutsim = await withLoading(() => getAutoShibutsimByCampIdAndDates(campId, dates));
      setShibutsim(shibutsim?.concat(mapShibutsim(newShibutsim)));
    } else {
      toast.error("נא לבחור תאריכים לשיבוץ אוטומטי");
    }
  }, [autoShibutsStartDate, autoShibutsEndDate, campId, shibutsim, mapShibutsim]);

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
        const isLastSegmentOfDay = originalEnd >= nextMidnight;
        const segmentEnd = originalEnd < nextMidnight ? new Date(originalEnd) : nextMidnight;
        const isFromPreviousDay = segmentStart.getTime() > originalStart.getTime();

        const displayEnd = new Date(segmentEnd);
        if (isLastSegmentOfDay) {
          displayEnd.setTime(nextMidnight.getTime() - 1000);
        }

        splitEvents.push({
          ...baseEvent,
          id: `${s.shibutsId || idx}-${segmentIndex}`,
          start: new Date(segmentStart),
          end: displayEnd,
          isFromPreviousDay,
        });

        segmentStart = new Date(segmentEnd);
        segmentIndex += 1;
      }
    });

    return splitEvents;
  }, [shibutsim, visibleOutpostIds]);

  const handleOutpostFilterChange = useCallback((event) => {
    const value = event.target.value;
    setSelectedOutpostIds(Array.isArray(value) ? value : []);
  }, []);

  const eventPropGetter = useCallback((event) => {
    const baseColor = event.color || "#3174ad";
    const style = {
      backgroundColor: baseColor,
      borderRadius: "4px",
      opacity: 0.9,
      color: "white",
      border: "0px",
      display: "block",
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
  }, []);

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
              views={["day", "week"]}
              step={15}
              timeslots={4}
              date={currentDate}
              onNavigate={setCurrentDate}
              selectable={isCommander}
              onSelectSlot={isCommander ? handleSelectSlot : undefined}
              onSelectEvent={onShibutsClick}
              eventPropGetter={eventPropGetter}
              messages={messages}
              formats={rtlFormats}
              rtl={true}
              style={{ minHeight: 500 }}
            />
          </div>

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
        </>
      )}
    </div>
  );
}

export default ShiftSchedule;
