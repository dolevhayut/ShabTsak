import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Avatar,
  Box,
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
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import HourglassEmptyOutlinedIcon from "@mui/icons-material/HourglassEmptyOutlined";
import DoDisturbAltOutlinedIcon from "@mui/icons-material/DoDisturbAltOutlined";
import { format } from "date-fns";
import { getShiftRequestsByGuardId } from "@/services/shiftRequestService";
import { getGravatarUrl } from "../../../GuardProfile/GuardProfileLimits/utils.js";

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

function formatDate(ts) {
  if (!ts) return "—";
  try {
    return format(new Date(ts), "dd/MM/yyyy HH:mm");
  } catch {
    return "—";
  }
}

const RequestHistoryDialog = ({ open, onClose, guard }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !guard?.id) return;
    setLoading(true);
    getShiftRequestsByGuardId(guard.id)
      .then((data) => setRequests(data || []))
      .finally(() => setLoading(false));
  }, [open, guard?.id]);

  const statusCounts = requests.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {}
  );

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
                היסטוריית בקשות
              </Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* ── סיכום סטטוסים ── */}
        {!loading && requests.length > 0 && (
          <Box
            sx={{
              px: 2.5,
              py: 1.5,
              bgcolor: "rgba(0,0,0,0.015)",
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
              <AssignmentOutlinedIcon sx={{ fontSize: 15, color: "text.secondary" }} />
              <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                סה״כ {requests.length} בקשות:
              </Typography>
              {Object.entries(statusCounts).map(([status, count]) => {
                const cfg = STATUS_CONFIG[status] ?? { label: status, color: "default", variant: "outlined" };
                return (
                  <Chip
                    key={status}
                    size="small"
                    label={`${cfg.label} (${count})`}
                    color={cfg.color}
                    variant={cfg.variant}
                    sx={{ height: 20, fontSize: "0.68rem", "& .MuiChip-label": { px: 0.75 } }}
                  />
                );
              })}
            </Stack>
          </Box>
        )}

        {/* ── רשימה ── */}
        <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 1.5 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={32} />
            </Box>
          ) : requests.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <AssignmentOutlinedIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
              <Typography color="text.secondary" variant="body2">
                אין בקשות לחייל זה
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {requests.map((req) => {
                const cfg = STATUS_CONFIG[req.status] ?? { label: req.status, color: "default", variant: "outlined", Icon: AssignmentOutlinedIcon };
                const StatusIcon = cfg.Icon;
                return (
                  <Box
                    key={req.id}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}
                  >
                    {/* שורת כותרת */}
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{
                        px: 1.75,
                        py: 1,
                        bgcolor: "rgba(0,0,0,0.02)",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Stack direction="row" alignItems="center" gap={1}>
                        <Typography variant="caption" color="text.disabled" fontWeight={700}>
                          #{req.id}
                        </Typography>
                        <Chip
                          size="small"
                          label={REQUEST_TYPE_LABELS[req.requestType] ?? req.requestType}
                          variant="outlined"
                          sx={{ height: 18, fontSize: "0.65rem", "& .MuiChip-label": { px: 0.75 } }}
                        />
                      </Stack>
                      <Chip
                        size="small"
                        icon={<StatusIcon sx={{ fontSize: "13px !important" }} />}
                        label={cfg.label}
                        color={cfg.color}
                        variant={cfg.variant}
                        sx={{
                          height: 20,
                          fontSize: "0.68rem",
                          "& .MuiChip-label": { px: 0.75 },
                          "& .MuiChip-icon": { ml: "4px", mr: "-2px" },
                        }}
                      />
                    </Stack>

                    {/* גוף הבקשה */}
                    <Box sx={{ px: 1.75, py: 1.25 }}>
                      <Stack spacing={0.75}>
                        {req.reason && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              סיבה:
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.1 }}>
                              {req.reason}
                            </Typography>
                          </Box>
                        )}

                        {req.requestedPayload?.requestedDate && (
                          <Stack direction="row" gap={0.5} alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              תאריך מבוקש:
                            </Typography>
                            <Typography variant="caption" fontWeight={600}>
                              {req.requestedPayload.requestedDate}
                            </Typography>
                          </Stack>
                        )}

                        {req.reviewNote && (
                          <>
                            <Divider sx={{ my: 0.25 }} />
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                הערת מפקד:
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 0.1, fontStyle: "italic" }}>
                                {req.reviewNote}
                              </Typography>
                            </Box>
                          </>
                        )}

                        <Stack direction="row" gap={1.5} sx={{ pt: 0.25 }}>
                          <Typography variant="caption" color="text.disabled">
                            נשלח: {formatDate(req.createdAt)}
                          </Typography>
                          {req.reviewedAt && (
                            <Typography variant="caption" color="text.disabled">
                              טופל: {formatDate(req.reviewedAt)}
                            </Typography>
                          )}
                        </Stack>
                      </Stack>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

RequestHistoryDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  guard: PropTypes.object,
};

export default RequestHistoryDialog;
