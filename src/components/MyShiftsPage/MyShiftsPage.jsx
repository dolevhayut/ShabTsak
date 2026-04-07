import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery, useQueryClient } from "react-query";
import { format } from "date-fns";
import SelectCamp from "components/general_comps/SelectCamp";
import { useAuthContext } from "@/context/AuthContext";
import { getOutpostsAndShiftsForCampId } from "@/services/outpostService";
import { getShibutsimByGuardAndCamp } from "@/services/shibutsService";
import { getGuardLinkByUserId } from "@/services/userGuardLinkService";
import AddToCalendar from "components/ShiftSchedule/AddToCalendar";
import { createShiftRequest, getShiftRequestsByUser } from "@/services/shiftRequestService";
import { toast } from "@/services/notificationService";

const requestTypeLabels = {
  constraint: "בקשת אילוץ",
  swap: "בקשת החלפה",
};

function MyShiftsPage() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [campId, setCampId] = useState(null);
  const [requestDialog, setRequestDialog] = useState({ open: false, shibuts: null });
  const [requestPayload, setRequestPayload] = useState({
    requestType: "constraint",
    reason: "",
    requestedDate: "",
  });

  const { data: outpostsAndShifts = [] } = useQuery({
    queryKey: ["outpostsAndShifts", campId],
    queryFn: () => getOutpostsAndShiftsForCampId(campId),
    enabled: !!campId,
  });

  const { data: guardLink } = useQuery({
    queryKey: ["userGuardLink", user?.id, campId],
    queryFn: () => getGuardLinkByUserId(user?.id, campId),
    enabled: !!user?.id && !!campId,
  });

  const guardId = guardLink?.guardId;

  const { data: myRequests = [] } = useQuery({
    queryKey: ["shiftRequestsByUser", user?.id],
    queryFn: () => getShiftRequestsByUser(user?.id),
    enabled: !!user?.id,
  });

  const { data: myShibuts = [], isLoading } = useQuery({
    queryKey: ["myShibuts", guardId, campId],
    queryFn: () => getShibutsimByGuardAndCamp(guardId, campId),
    enabled: !!guardId && !!campId,
  });

  const shiftById = useMemo(() => {
    const mapping = new Map();
    outpostsAndShifts.forEach((outpost) => {
      (outpost.shifts || []).forEach((shift) => {
        mapping.set(shift.id, shift);
      });
    });
    return mapping;
  }, [outpostsAndShifts]);

  const outpostById = useMemo(() => {
    const mapping = new Map();
    outpostsAndShifts.forEach((outpost) => {
      mapping.set(outpost.id, outpost);
    });
    return mapping;
  }, [outpostsAndShifts]);

  const mappedShibuts = useMemo(() => {
    return myShibuts.map((item) => {
      const shift = shiftById.get(item.shiftId);
      const outpost = outpostById.get(item.outpostId);
      const date = new Date(item.theDate);
      const start = new Date(item.theDate);
      const end = new Date(item.theDate);
      start.setHours(shift?.fromHour || 0, 0, 0, 0);
      end.setHours(shift?.toHour || 0, 0, 0, 0);
      if ((shift?.toHour || 0) <= (shift?.fromHour || 0)) {
        end.setDate(end.getDate() + 1);
      }
      return {
        ...item,
        date,
        start,
        end,
        outpostName: outpost?.name || "עמדה לא ידועה",
        shiftLabel: `${String(shift?.fromHour ?? 0).padStart(2, "0")}:00-${String(shift?.toHour ?? 0).padStart(2, "0")}:00`,
      };
    });
  }, [myShibuts, shiftById, outpostById]);

  const onOpenRequestDialog = (shibuts) => {
    setRequestDialog({ open: true, shibuts });
    setRequestPayload({
      requestType: "constraint",
      reason: "",
      requestedDate: format(shibuts.date, "yyyy-MM-dd"),
    });
  };

  const onCloseRequestDialog = () => {
    setRequestDialog({ open: false, shibuts: null });
  };

  const onSubmitShiftRequest = async () => {
    if (!requestPayload.reason.trim()) {
      toast.error("נא למלא סיבה לבקשה");
      return;
    }
    const currentShibuts = requestDialog.shibuts;
    if (!currentShibuts) return;

    await createShiftRequest({
      campId,
      requesterUserId: user.id,
      requesterGuardId: guardId,
      targetShibutsId: currentShibuts.id,
      requestType: requestPayload.requestType,
      reason: requestPayload.reason.trim(),
      requestedPayload: {
        currentDate: currentShibuts.date.toISOString(),
        requestedDate: requestPayload.requestedDate,
      },
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    queryClient.invalidateQueries(["shiftRequestsByUser", user?.id]);
    onCloseRequestDialog();
  };

  const pendingRequests = myRequests.filter((request) => request.status === "pending").length;

  return (
    <Box>
      <SelectCamp
        setSelectedCampId={setCampId}
        selectedCampId={campId}
        onCampChange={() => {}}
        title="המשמרות שלי"
        title2="בבסיס:"
      />

      {!!campId && !guardId && (
        <Paper sx={{ p: 3, mt: 2 }}>
          <Typography variant="h6">לא נמצא שיוך חייל בבסיס זה</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            כדי לצפות במשמרות שלך צריך להוסיף רשומת קישור בטבלת user_guard_links.
          </Typography>
        </Paper>
      )}

      {!!guardId && (
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <Chip color="info" label={`בקשות פתוחות: ${pendingRequests}`} />
            {mappedShibuts.length > 0 && (
              <AddToCalendar
                mode="bulk"
                events={mappedShibuts.map((item) => ({
                  guardName: user?.name,
                  outpostName: item.outpostName,
                  start: item.start,
                  end: item.end,
                }))}
              />
            )}
          </Box>

          {!isLoading && mappedShibuts.length === 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6">אין משמרות כרגע</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                כרגע אין לך שיבוצים בטווח הפעיל. אפשר לפנות למפקד או ליצור בקשת אילוץ/החלפה כשיש שיבוץ.
              </Typography>
            </Paper>
          )}

          {mappedShibuts.length > 0 && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>תאריך</TableCell>
                    <TableCell>עמדה</TableCell>
                    <TableCell>משמרת</TableCell>
                    <TableCell>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mappedShibuts.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{format(item.date, "dd/MM/yyyy")}</TableCell>
                      <TableCell>{item.outpostName}</TableCell>
                      <TableCell>{item.shiftLabel}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <AddToCalendar
                            mode="single"
                            shibuts={{
                              guardName: user?.name,
                              outpostName: item.outpostName,
                              start: item.start,
                              end: item.end,
                            }}
                          />
                          <Button variant="outlined" color="warning" onClick={() => onOpenRequestDialog(item)}>
                            בקשת אילוץ/החלפה
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      )}

      <Dialog open={requestDialog.open} onClose={onCloseRequestDialog} maxWidth="sm" fullWidth>
        <DialogTitle>בקשת אילוץ/החלפת משמרת</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="סוג בקשה"
              value={requestPayload.requestType}
              onChange={(event) => setRequestPayload((prev) => ({ ...prev, requestType: event.target.value }))}
            >
              <MenuItem value="constraint">{requestTypeLabels.constraint}</MenuItem>
              <MenuItem value="swap">{requestTypeLabels.swap}</MenuItem>
            </TextField>
            <TextField
              label="תאריך מבוקש"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={requestPayload.requestedDate}
              onChange={(event) => setRequestPayload((prev) => ({ ...prev, requestedDate: event.target.value }))}
            />
            <TextField
              label="סיבה לבקשה"
              multiline
              minRows={3}
              value={requestPayload.reason}
              onChange={(event) => setRequestPayload((prev) => ({ ...prev, reason: event.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseRequestDialog}>ביטול</Button>
          <Button variant="contained" onClick={onSubmitShiftRequest}>
            שלח בקשה
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MyShiftsPage;
