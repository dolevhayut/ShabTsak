import { useCallback, useEffect, useState } from "react";
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
  FormLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import ApartmentIcon from "@mui/icons-material/Apartment";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { format } from "date-fns";
import SelectCamp from "components/general_comps/SelectCamp";
import { useAuthContext } from "@/context/AuthContext";
import {
  getSystemMessages,
  createSystemMessage,
  updateSystemMessage,
  deleteSystemMessage,
} from "@/services/systemMessageService";
import { getOutpostsByCampId } from "@/services/outpostService";

// ── constants ─────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  info: {
    label: "מידע",
    color: "info",
    Icon: InfoOutlinedIcon,
    borderColor: "#0288d1",
    bgColor: "rgba(2,136,209,0.06)",
  },
  warning: {
    label: "אזהרה",
    color: "warning",
    Icon: WarningAmberOutlinedIcon,
    borderColor: "#ed6c02",
    bgColor: "rgba(237,108,2,0.06)",
  },
  urgent: {
    label: "דחוף",
    color: "error",
    Icon: ErrorOutlineIcon,
    borderColor: "#d32f2f",
    bgColor: "rgba(211,47,47,0.06)",
  },
};

const EMPTY_FORM = {
  title: "",
  content: "",
  scope: "camp", // "camp" | "outpost"
  outpostId: "",
  priority: "info",
  expiresAt: "",
};

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(ts) {
  if (!ts) return null;
  try {
    const d = new Date(typeof ts === "string" ? ts : Number(ts));
    return format(d, "dd/MM/yyyy");
  } catch {
    return null;
  }
}

// ── main component ────────────────────────────────────────────────────────────

export default function SystemMessagesPage() {
  const { user } = useAuthContext();
  const [campId, setCampId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [outposts, setOutposts] = useState([]);
  const [loading, setLoading] = useState(false);

  // dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = new
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // ── data fetching ──────────────────────────────────────────────────────────

  const fetchMessages = useCallback(async () => {
    if (!campId) return;
    setLoading(true);
    const [msgs, ops] = await Promise.all([
      getSystemMessages(campId, { includeInactive: true }),
      getOutpostsByCampId(campId),
    ]);
    setMessages(msgs);
    setOutposts(ops || []);
    setLoading(false);
  }, [campId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // ── dialog helpers ─────────────────────────────────────────────────────────

  const openNew = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (msg) => {
    setEditTarget(msg);
    setForm({
      title: msg.title,
      content: msg.content || "",
      scope: msg.outpostId ? "outpost" : "camp",
      outpostId: msg.outpostId ? String(msg.outpostId) : "",
      priority: msg.priority || "info",
      expiresAt: msg.expiresAt
        ? new Date(Number(msg.expiresAt)).toISOString().slice(0, 10)
        : "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditTarget(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        campId,
        outpostId: form.scope === "outpost" && form.outpostId ? Number(form.outpostId) : null,
        authorUserId: user?.id,
        title: form.title.trim(),
        content: form.content.trim() || null,
        priority: form.priority,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : null,
      };

      if (editTarget) {
        const updated = await updateSystemMessage(editTarget.id, payload);
        setMessages((prev) => prev.map((m) => (m.id === editTarget.id ? updated : m)));
      } else {
        const created = await createSystemMessage(payload);
        setMessages((prev) => [created, ...prev]);
      }
      closeDialog();
    } catch {
      // toasted inside service
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (msg) => {
    try {
      const updated = await updateSystemMessage(msg.id, { isActive: !msg.isActive });
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? updated : m)));
    } catch {
      // toasted
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("למחוק את ההודעה לצמיתות?")) return;
    try {
      await deleteSystemMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch {
      // toasted
    }
  };

  // ── grouped lists ──────────────────────────────────────────────────────────

  const active = messages.filter((m) => m.isActive);
  const inactive = messages.filter((m) => !m.isActive);

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      {/* ── page header ── */}
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2.5 }}>
        <CampaignOutlinedIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>
          הודעות מערכת
        </Typography>
      </Stack>

      {/* ── camp selector ── */}
      <SelectCamp campId={campId} setCampId={setCampId} />

      {campId && (
        <>
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2, mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddCircleOutlineIcon />}
              onClick={openNew}
            >
              הודעה חדשה
            </Button>
          </Stack>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", pt: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* ── active messages ── */}
              <SectionLabel
                label="פעילות"
                count={active.length}
                color="success.main"
              />
              {active.length === 0 ? (
                <EmptyState text="אין הודעות פעילות" />
              ) : (
                <Stack spacing={1.5} sx={{ mb: 3 }}>
                  {active.map((msg) => (
                    <MessageCard
                      key={msg.id}
                      msg={msg}
                      outposts={outposts}
                      onEdit={openEdit}
                      onToggle={handleToggleActive}
                      onDelete={handleDelete}
                    />
                  ))}
                </Stack>
              )}

              {/* ── inactive messages ── */}
              {inactive.length > 0 && (
                <>
                  <SectionLabel
                    label="מושבתות"
                    count={inactive.length}
                    color="text.disabled"
                  />
                  <Stack spacing={1.5}>
                    {inactive.map((msg) => (
                      <MessageCard
                        key={msg.id}
                        msg={msg}
                        outposts={outposts}
                        onEdit={openEdit}
                        onToggle={handleToggleActive}
                        onDelete={handleDelete}
                      />
                    ))}
                  </Stack>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* ── compose / edit dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: "14px" } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editTarget ? "עריכת הודעה" : "הודעה חדשה"}
        </DialogTitle>

        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "12px !important" }}>
          {/* Title */}
          <TextField
            label="כותרת"
            fullWidth
            size="small"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />

          {/* Content */}
          <TextField
            label="תוכן הודעה (אופציונלי)"
            fullWidth
            multiline
            rows={3}
            size="small"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          />

          <Divider />

          {/* Scope */}
          <FormControl component="fieldset" size="small">
            <FormLabel component="legend" sx={{ fontSize: "0.82rem", mb: 0.5 }}>
              היקף ההודעה
            </FormLabel>
            <RadioGroup
              row
              value={form.scope}
              onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value, outpostId: "" }))}
            >
              <FormControlLabel
                value="camp"
                control={<Radio size="small" />}
                label={
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <ApartmentIcon sx={{ fontSize: 16 }} />
                    <span>כל הבסיס</span>
                  </Stack>
                }
              />
              <FormControlLabel
                value="outpost"
                control={<Radio size="small" />}
                label={
                  <Stack direction="row" alignItems="center" gap={0.5}>
                    <LocationOnOutlinedIcon sx={{ fontSize: 16 }} />
                    <span>עמדה ספציפית</span>
                  </Stack>
                }
              />
            </RadioGroup>
          </FormControl>

          {form.scope === "outpost" && (
            <FormControl fullWidth size="small">
              <InputLabel>בחר עמדה</InputLabel>
              <Select
                value={form.outpostId}
                label="בחר עמדה"
                onChange={(e) => setForm((f) => ({ ...f, outpostId: e.target.value }))}
              >
                {outposts.map((op) => (
                  <MenuItem key={op.id} value={String(op.id)}>
                    {op.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Priority */}
          <FormControl component="fieldset" size="small">
            <FormLabel component="legend" sx={{ fontSize: "0.82rem", mb: 0.5 }}>
              עדיפות
            </FormLabel>
            <RadioGroup
              row
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            >
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <FormControlLabel
                  key={key}
                  value={key}
                  control={<Radio size="small" color={cfg.color} />}
                  label={
                    <Chip
                      icon={<cfg.Icon sx={{ fontSize: "14px !important" }} />}
                      label={cfg.label}
                      size="small"
                      color={cfg.color}
                      variant={form.priority === key ? "filled" : "outlined"}
                      sx={{ cursor: "pointer", fontSize: "0.72rem" }}
                    />
                  }
                />
              ))}
            </RadioGroup>
          </FormControl>

          {/* Expiry */}
          <TextField
            label="תאריך תפוגה (אופציונלי)"
            type="date"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={form.expiresAt}
            onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
            helperText="ריק = ללא תפוגה"
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} disabled={saving}>
            ביטול
          </Button>
          <Button
            variant="contained"
            disabled={!form.title.trim() || saving}
            onClick={handleSave}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {editTarget ? "שמור שינויים" : "פרסם הודעה"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ label, count, color }) {
  return (
    <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
      <Typography variant="caption" fontWeight={700} color={color} textTransform="uppercase">
        {label}
      </Typography>
      <Chip label={count} size="small" sx={{ height: 18, fontSize: "0.68rem" }} />
    </Stack>
  );
}

function EmptyState({ text }) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: "10px",
        py: 3,
        textAlign: "center",
        mb: 3,
      }}
    >
      <Typography variant="body2" color="text.disabled">
        {text}
      </Typography>
    </Paper>
  );
}

function MessageCard({ msg, outposts, onEdit, onToggle, onDelete }) {
  const cfg = PRIORITY_CONFIG[msg.priority] ?? PRIORITY_CONFIG.info;
  const PriorityIcon = cfg.Icon;
  const outpost = outposts.find((o) => o.id === msg.outpostId);
  const expiry = fmtDate(msg.expiresAt);

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "12px",
        border: "1.5px solid",
        borderColor: msg.isActive ? cfg.borderColor : "divider",
        bgcolor: msg.isActive ? cfg.bgColor : "action.disabledBackground",
        opacity: msg.isActive ? 1 : 0.6,
        p: 2,
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
        {/* ── left: content ── */}
        <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
            <PriorityIcon sx={{ fontSize: 18, color: cfg.borderColor }} />
            <Typography variant="subtitle2" fontWeight={700}>
              {msg.title}
            </Typography>
          </Stack>

          {msg.content && (
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
              {msg.content}
            </Typography>
          )}

          <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 0.5 }}>
            <Chip
              icon={<cfg.Icon sx={{ fontSize: "13px !important" }} />}
              label={cfg.label}
              size="small"
              color={cfg.color}
              variant="outlined"
              sx={{ fontSize: "0.68rem", height: 20 }}
            />
            {outpost ? (
              <Chip
                icon={<LocationOnOutlinedIcon sx={{ fontSize: "13px !important" }} />}
                label={outpost.name}
                size="small"
                variant="outlined"
                sx={{ fontSize: "0.68rem", height: 20 }}
              />
            ) : (
              <Chip
                icon={<ApartmentIcon sx={{ fontSize: "13px !important" }} />}
                label="כל הבסיס"
                size="small"
                variant="outlined"
                sx={{ fontSize: "0.68rem", height: 20 }}
              />
            )}
            {expiry && (
              <Typography variant="caption" color="text.disabled" alignSelf="center">
                תפוגה: {expiry}
              </Typography>
            )}
          </Stack>
        </Stack>

        {/* ── right: actions ── */}
        <Stack direction="row" alignItems="center" gap={0.5}>
          <Tooltip title={msg.isActive ? "השבת הודעה" : "הפעל הודעה"}>
            <Switch
              size="small"
              checked={msg.isActive}
              onChange={() => onToggle(msg)}
              color="success"
            />
          </Tooltip>
          <Tooltip title="ערוך">
            <IconButton size="small" onClick={() => onEdit(msg)}>
              <EditOutlinedIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="מחק">
            <IconButton
              size="small"
              onClick={() => onDelete(msg.id)}
              sx={{ "&:hover": { color: "error.main" } }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Paper>
  );
}
