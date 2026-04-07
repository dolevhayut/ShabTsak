import { useCallback, useMemo, useState } from "react";
import {
  Button,
  TextField,
  Dialog,
  DialogActions,
  Stack,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  Box,
} from "@mui/material";
import { toast } from "@/services/notificationService";
import { createTimeLimit } from "@/services/timeLimitService.js";
import { useQueryClient } from "react-query";
import { AddBox } from "@mui/icons-material";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { WeekdayTogglePicker } from "../../WeekdayTogglePicker.jsx";

const buildInitial = (guardId) => ({
  dayId: 0,
  fromHour: 9,
  toHour: 17,
  guardId: Number(guardId),
});

const GuardProfileTimeLimitForm = ({ id, timeLimits }) => {
  const [newTimeLimit, setNewTimeLimit] = useState(() => buildInitial(id));
  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();

  const handleOpen = useCallback(() => {
    setNewTimeLimit(buildInitial(id));
    setOpen(true);
  }, [id]);

  const handleClose = useCallback(() => {
    setNewTimeLimit(buildInitial(id));
    setOpen(false);
  }, [id]);

  const fromValue = useMemo(
    () => dayjs().hour(newTimeLimit.fromHour).minute(0).second(0).millisecond(0),
    [newTimeLimit.fromHour]
  );
  const toValue = useMemo(
    () => dayjs().hour(newTimeLimit.toHour).minute(0).second(0).millisecond(0),
    [newTimeLimit.toHour]
  );

  const handleFromChange = (v) => {
    if (!v) return;
    const h = v.hour();
    setNewTimeLimit((prev) => {
      let toH = prev.toHour;
      if (toH <= h) {
        toH = Math.min(h + 1, 23);
      }
      return { ...prev, fromHour: h, toHour: toH };
    });
  };

  const handleToChange = (v) => {
    if (!v) return;
    const h = v.hour();
    setNewTimeLimit((prev) => ({ ...prev, toHour: h }));
  };

  const handleSubmit = async () => {
    if (newTimeLimit.fromHour >= newTimeLimit.toHour) {
      toast.warn("שעת הסיום חייבת להיות אחרי שעת ההתחלה");
      return;
    }

    const isDuplicate = timeLimits?.some(
      (limit) =>
        limit.dayId === newTimeLimit.dayId &&
        limit.fromHour === newTimeLimit.fromHour &&
        limit.toHour === newTimeLimit.toHour
    );

    if (isDuplicate) {
      toast.warn("מגבלת הזמן הזו כבר קיימת!");
      return;
    }

    await createTimeLimit(newTimeLimit);
    queryClient.invalidateQueries(["guardTimeLimits"]);
    queryClient.invalidateQueries(["guardsAndLimits"]);
    setOpen(false);
  };

  return (
    <div>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <IconButton type="button" size="small" color="primary" onClick={handleOpen} aria-label="הוספת מגבלת שעות">
          <AddBox />
        </IconButton>
      </Stack>

      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: { borderRadius: 3, maxWidth: 480 },
        }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Typography variant="h6" component="span" fontWeight={700}>
            הוספת מגבלת זמן
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontWeight: 400 }}>
            בחרו יום, ואז טווח שעות — בדומה לבחירת זמן ביומן.
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Stack spacing={3}>
              <WeekdayTogglePicker
                label="יום בשבוע"
                value={newTimeLimit.dayId}
                onChange={(dayId) => setNewTimeLimit((prev) => ({ ...prev, dayId }))}
              />

              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                  טווח שעות (24 שעות)
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "flex-start" }}>
                  <TimePicker
                    label="מ־שעה"
                    value={fromValue}
                    onChange={handleFromChange}
                    ampm={false}
                    views={["hours"]}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                  <TimePicker
                    label="עד שעה"
                    value={toValue}
                    onChange={handleToChange}
                    ampm={false}
                    views={["hours"]}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                  &quot;עד שעה&quot; חייבת להיות אחרי &quot;מ־שעה&quot; באותו יום.
                </Typography>
              </Box>
            </Stack>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions sx={{ paddingInlineEnd: 3, paddingBlockEnd: 2, px: 3 }}>
          <Button onClick={handleClose}>ביטול</Button>
          <Button variant="contained" color="primary" onClick={handleSubmit}>
            הוספה
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default GuardProfileTimeLimitForm;
