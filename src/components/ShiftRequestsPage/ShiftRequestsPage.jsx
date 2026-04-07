import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
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
import { getShiftRequestsByCamp, updateShiftRequestStatus } from "@/services/shiftRequestService";
import { logCommanderAction } from "@/services/commanderActionService";
import {
  deleteShibuts,
  getShibutsById,
  moveShibutsToDate,
  updateShibutsGuard,
} from "@/services/shibutsService";
import { getGuardsByCampId } from "@/services/guardService";
import { getOutpostsAndShiftsForCampId } from "@/services/outpostService";
import { toast } from "@/services/notificationService";

const shiftRequestStatusLabels = {
  pending: "ממתין לאישור",
  approved: "אושר",
  rejected: "נדחה",
  cancelled: "בוטל",
};

function formatShiftRequestStatus(status) {
  if (status == null || status === "") return "—";
  return shiftRequestStatusLabels[status] ?? status;
}

function formatHour(h) {
  return String(h).padStart(2, "0") + ":00";
}

function formatTs(ts) {
  if (!ts) return "—";
  try {
    return format(new Date(Number(ts)), "dd/MM/yyyy");
  } catch {
    return "—";
  }
}

const ShiftRequestsPage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthContext();
  const [campId, setCampId] = useState(null);

  // ── rejection dialog (simple) ─────────────────────────────────────────────
  const [rejectDialog, setRejectDialog] = useState({ open: false, item: null });
  const [rejectNote, setRejectNote] = useState("");

  // ── approval dialog state ─────────────────────────────────────────────────
  const [approvalDialog, setApprovalDialog] = useState({ open: false, item: null });
  const [approvalAction, setApprovalAction] = useState("remove");
  const [approvalDate, setApprovalDate] = useState("");
  const [approvalGuardId, setApprovalGuardId] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [targetShibuts, setTargetShibuts] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── remote data ───────────────────────────────────────────────────────────
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["shiftRequestsByCamp", campId],
    queryFn: () => getShiftRequestsByCamp(campId),
    enabled: !!campId,
  });

  const { data: guards = [] } = useQuery({
    queryKey: ["guardsByCamp", campId],
    queryFn: () => getGuardsByCampId(campId),
    enabled: !!campId,
  });

  const { data: outpostsAndShifts = [] } = useQuery({
    queryKey: ["outpostsAndShifts", campId],
    queryFn: () => getOutpostsAndShiftsForCampId(campId),
    enabled: !!campId,
  });

  // ── derived lookups ───────────────────────────────────────────────────────
  const guardMap = useMemo(() => {
    const m = new Map();
    guards.forEach((g) => m.set(g.id, g));
    return m;
  }, [guards]);

  const shiftMap = useMemo(() => {
    const m = new Map();
    outpostsAndShifts.forEach((outpost) => {
      (outpost.shifts || []).forEach((shift) => m.set(shift.id, { ...shift, outpostName: outpost.name }));
    });
    return m;
  }, [outpostsAndShifts]);

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === "pending"),
    [requests]
  );

  // ── rejection dialog ──────────────────────────────────────────────────────
  const onOpenRejectDialog = (item) => {
    setRejectDialog({ open: true, item });
    setRejectNote("");
  };

  const onCloseRejectDialog = () => {
    setRejectDialog({ open: false, item: null });
    setRejectNote("");
  };

  const onSubmitReject = async () => {
    if (!rejectDialog.item) return;
    const item = rejectDialog.item;
    setSubmitting(true);
    try {
      const updated = await updateShiftRequestStatus(item.id, "rejected", user?.id, rejectNote);
      await logCommanderAction({
        commanderUserId: user?.id,
        campId,
        actionType: "review_shift_request",
        targetType: "shift_request",
        targetId: item.id,
        payload: { previousStatus: item.status, nextStatus: updated.status, reviewNote: rejectNote },
        createdAt: new Date().toISOString(),
      });
      queryClient.invalidateQueries(["shiftRequestsByCamp", campId]);
      onCloseRejectDialog();
    } catch {
      // error toasted inside service
    } finally {
      setSubmitting(false);
    }
  };

  // ── approval dialog ───────────────────────────────────────────────────────
  const onOpenApprovalDialog = async (item) => {
    setApprovalDialog({ open: true, item });
    setApprovalAction("remove");
    setApprovalDate(item.requestedPayload?.requestedDate || "");
    setApprovalGuardId("");
    setApprovalNote("");
    setTargetShibuts(null);

    if (item.targetShibutsId) {
      setContextLoading(true);
      try {
        const shibuts = await getShibutsById(item.targetShibutsId);
        setTargetShibuts(shibuts);
      } catch {
        // error toasted inside service
      } finally {
        setContextLoading(false);
      }
    }
  };

  const onCloseApprovalDialog = () => {
    setApprovalDialog({ open: false, item: null });
    setTargetShibuts(null);
  };

  const isApprovalConfirmDisabled = () => {
    if (submitting) return true;
    if (approvalAction === "move" && !approvalDate) return true;
    if (approvalAction === "swap" && !approvalGuardId) return true;
    return false;
  };

  const onSubmitApproval = async () => {
    const item = approvalDialog.item;
    if (!item) return;
    setSubmitting(true);

    try {
      if (item.targetShibutsId) {
        if (approvalAction === "remove") {
          await deleteShibuts(item.targetShibutsId);
        } else if (approvalAction === "move") {
          await moveShibutsToDate(item.targetShibutsId, approvalDate);
        } else if (approvalAction === "swap") {
          await updateShibutsGuard(item.targetShibutsId, Number(approvalGuardId));
        }
      }

      const updated = await updateShiftRequestStatus(item.id, "approved", user?.id, approvalNote);

      await logCommanderAction({
        commanderUserId: user?.id,
        campId,
        actionType: "review_shift_request",
        targetType: "shift_request",
        targetId: item.id,
        payload: {
          previousStatus: item.status,
          nextStatus: updated.status,
          reviewNote: approvalNote,
          approvalAction,
          targetShibutsId: item.targetShibutsId || null,
          ...(approvalAction === "move" && { requestedDate: approvalDate }),
          ...(approvalAction === "swap" && { newGuardId: approvalGuardId }),
        },
        createdAt: new Date().toISOString(),
      });

      queryClient.invalidateQueries(["shiftRequestsByCamp", campId]);
      onCloseApprovalDialog();
    } catch {
      // errors toasted inside each service call
    } finally {
      setSubmitting(false);
    }
  };

  // ── context helpers ───────────────────────────────────────────────────────
  const shiftInfo = useMemo(() => {
    if (!targetShibuts) return null;
    const guard = guardMap.get(targetShibuts.guardId);
    const shift = shiftMap.get(targetShibuts.shiftId);
    return {
      guardName: guard?.name || `שומר #${targetShibuts.guardId}`,
      outpostName: shift?.outpostName || `עמדה #${targetShibuts.outpostId}`,
      hours: shift ? `${formatHour(shift.fromHour)}–${formatHour(shift.toHour)}` : "—",
      date: formatTs(targetShibuts.theDate),
    };
  }, [targetShibuts, guardMap, shiftMap]);

  // guards available for swap (everyone except current shibuts guard)
  const swapGuards = useMemo(() => {
    if (!targetShibuts) return guards;
    return guards.filter((g) => g.id !== targetShibuts.guardId);
  }, [guards, targetShibuts]);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <Box>
      <SelectCamp
        setSelectedCampId={setCampId}
        selectedCampId={campId}
        onCampChange={() => {}}
        title="ניהול בקשות משמרת"
        title2="בבסיס:"
      />

      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6">בקשות ממתינות: {pendingRequests.length}</Typography>
      </Paper>

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>מזהה</TableCell>
              <TableCell>סוג בקשה</TableCell>
              <TableCell>תאריך מבוקש</TableCell>
              <TableCell>סיבה</TableCell>
              <TableCell>סטטוס</TableCell>
              <TableCell>פעולות</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!isLoading && requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>אין בקשות בטווח הנוכחי</TableCell>
              </TableRow>
            )}
            {requests.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.id}</TableCell>
                <TableCell>{item.requestType === "swap" ? "החלפה" : "אילוץ"}</TableCell>
                <TableCell>{item.requestedPayload?.requestedDate || "—"}</TableCell>
                <TableCell>{item.reason}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={formatShiftRequestStatus(item.status)}
                    color={
                      item.status === "approved"
                        ? "success"
                        : item.status === "rejected"
                        ? "error"
                        : item.status === "cancelled"
                        ? "default"
                        : "warning"
                    }
                    variant={item.status === "pending" ? "outlined" : "filled"}
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      disabled={item.status !== "pending"}
                      onClick={() => onOpenApprovalDialog(item)}
                    >
                      אישור
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      disabled={item.status !== "pending"}
                      onClick={() => onOpenRejectDialog(item)}
                    >
                      דחייה
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Approval Dialog ── */}
      <Dialog open={approvalDialog.open} onClose={onCloseApprovalDialog} maxWidth="sm" fullWidth>
        <DialogTitle>אישור בקשה</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2}>
            {/* context banner */}
            {approvalDialog.item?.targetShibutsId ? (
              contextLoading ? (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2">טוען פרטי שיבוץ...</Typography>
                </Stack>
              ) : shiftInfo ? (
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "action.hover" }}>
                  <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                    <Box>
                      <Typography variant="caption" color="text.secondary">שומר</Typography>
                      <Typography variant="body2" fontWeight={600}>{shiftInfo.guardName}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">עמדה</Typography>
                      <Typography variant="body2" fontWeight={600}>{shiftInfo.outpostName}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">משמרת</Typography>
                      <Typography variant="body2" fontWeight={600}>{shiftInfo.hours}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">תאריך</Typography>
                      <Typography variant="body2" fontWeight={600}>{shiftInfo.date}</Typography>
                    </Box>
                  </Stack>
                </Paper>
              ) : null
            ) : (
              <Alert severity="info">לבקשה זו אין שיבוץ מקושר — האישור יעדכן רק את סטטוס הבקשה.</Alert>
            )}

            {/* reason */}
            {approvalDialog.item?.reason && (
              <Box>
                <Typography variant="caption" color="text.secondary">סיבת הבקשה</Typography>
                <Typography variant="body2" sx={{ mt: 0.25 }}>
                  {approvalDialog.item.reason}
                </Typography>
              </Box>
            )}

            {/* action selector — only when there is a shibuts to act on */}
            {approvalDialog.item?.targetShibutsId && !contextLoading && (
              <>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" gutterBottom>מה לעשות עם השיבוץ?</Typography>
                  <RadioGroup
                    value={approvalAction}
                    onChange={(e) => {
                      setApprovalAction(e.target.value);
                      if (e.target.value !== "move") setApprovalDate(approvalDialog.item?.requestedPayload?.requestedDate || "");
                      if (e.target.value !== "swap") setApprovalGuardId("");
                    }}
                  >
                    <FormControlLabel
                      value="remove"
                      control={<Radio size="small" />}
                      label="הורד ממשמרת (מחק שיבוץ)"
                    />
                    <FormControlLabel
                      value="move"
                      control={<Radio size="small" />}
                      label="הזז לתאריך אחר"
                    />
                    {approvalAction === "move" && (
                      <TextField
                        type="date"
                        size="small"
                        label="תאריך חדש"
                        InputLabelProps={{ shrink: true }}
                        value={approvalDate}
                        onChange={(e) => setApprovalDate(e.target.value)}
                        sx={{ ml: 3.5, mt: 0.5, width: 200 }}
                      />
                    )}
                    <FormControlLabel
                      value="swap"
                      control={<Radio size="small" />}
                      label="העבר לשומר אחר"
                    />
                    {approvalAction === "swap" && (
                      <FormControl size="small" sx={{ ml: 3.5, mt: 0.5, minWidth: 220 }}>
                        <InputLabel>בחר שומר</InputLabel>
                        <Select
                          value={approvalGuardId}
                          label="בחר שומר"
                          onChange={(e) => setApprovalGuardId(e.target.value)}
                        >
                          {swapGuards.map((g) => (
                            <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </RadioGroup>
                </Box>
              </>
            )}

            <Divider />

            {/* commander note */}
            <TextField
              fullWidth
              multiline
              minRows={2}
              size="small"
              label="הערת מפקד (אופציונלי)"
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseApprovalDialog} disabled={submitting}>ביטול</Button>
          <Button
            variant="contained"
            color="success"
            disabled={isApprovalConfirmDisabled()}
            onClick={onSubmitApproval}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            אשר בקשה
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Rejection Dialog ── */}
      <Dialog open={rejectDialog.open} onClose={onCloseRejectDialog} maxWidth="sm" fullWidth>
        <DialogTitle>דחיית בקשה</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {rejectDialog.item?.reason && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">סיבת הבקשה</Typography>
              <Typography variant="body2" sx={{ mt: 0.25 }}>{rejectDialog.item.reason}</Typography>
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="הסבר לדחייה (אופציונלי)"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseRejectDialog} disabled={submitting}>ביטול</Button>
          <Button
            variant="contained"
            color="error"
            disabled={submitting}
            onClick={onSubmitReject}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            דחה בקשה
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ShiftRequestsPage;
