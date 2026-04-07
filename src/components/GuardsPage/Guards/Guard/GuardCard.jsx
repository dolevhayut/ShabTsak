import { useState } from "react";
import PropTypes from "prop-types";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import { getGravatarUrl } from "../../../GuardProfile/GuardProfileLimits/utils.js";
import { useNavigate } from "react-router-dom";
import ShiftHistoryDialog from "./ShiftHistoryDialog";
import { useIsCommander } from "@/hooks/useIsCommander";

const GuardCard = ({ campId, guard, onEdit, onDelete, index }) => {
  const navigate = useNavigate();
  const isCommander = useIsCommander();
  const [historyOpen, setHistoryOpen] = useState(false);
  const emailValue = guard.mail?.trim() ? guard.mail : "—";
  const phoneValue = guard.phone?.trim() ? guard.phone : "—";

  return (
    <Paper
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "10px",
        overflow: "hidden",
        transition: "box-shadow 0.18s ease, border-color 0.18s ease",
        "&:hover": {
          boxShadow: "0 4px 16px rgba(0,0,0,0.09)",
          borderColor: "primary.light",
        },
      }}
    >
      {/* ───── Header ───── */}
      <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
        {/* שורה: avatar + שם + מספר */}
        {/* בגלל stylis-plugin-rtl, אין להוסיף direction:rtl ב-sx –
            הכיוון מועבר אוטומטית מה-body. בשורת RTL, פריט ראשון בDOM = ימין */}
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1.5}>

          {/* צד ימין: אווטר + פרטי שם */}
          <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0, flex: 1 }}>
            <Avatar
              src={getGravatarUrl(guard.mail)}
              alt={guard.name}
              sx={{ width: 46, height: 46, flexShrink: 0 }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" alignItems="center" gap={0.75} flexWrap="nowrap">
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {guard.name}
                </Typography>
                {/* נקודת צבע */}
                <Box
                  component="span"
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    border: "1.5px solid",
                    borderColor: "divider",
                    bgcolor: guard.color || "#4B6B2A",
                    flexShrink: 0,
                    display: "inline-block",
                  }}
                />
              </Stack>

              <Chip
                size="small"
                icon={
                  guard.shouldBeAllocated
                    ? <CheckCircleOutlineIcon sx={{ fontSize: "13px !important" }} />
                    : <RemoveCircleOutlineIcon sx={{ fontSize: "13px !important" }} />
                }
                label={guard.shouldBeAllocated ? "משובץ אוטומטית" : "לא משובץ"}
                color={guard.shouldBeAllocated ? "success" : "default"}
                variant="outlined"
                sx={{
                  mt: 0.5,
                  height: 20,
                  fontSize: "0.68rem",
                  fontWeight: 500,
                  "& .MuiChip-label": { px: 0.75 },
                  "& .MuiChip-icon": { ml: "4px", mr: "-2px" },
                }}
              />
            </Box>
          </Stack>

          {/* צד שמאל: מספר */}
          <Typography
            variant="caption"
            sx={{
              color: "text.disabled",
              fontWeight: 700,
              fontSize: "0.7rem",
              lineHeight: 1,
              pt: 0.25,
              flexShrink: 0,
              userSelect: "none",
            }}
          >
            #{index + 1}
          </Typography>
        </Stack>
      </Box>

      <Divider />

      {/* ───── פרטי קשר ───── */}
      <Box sx={{ px: 2, py: 1.25 }}>
        <Stack spacing={0.6}>
          <Stack direction="row" alignItems="center" gap={1}>
            {/* בשורת RTL: האייקון (ראשון) → ימין, הטקסט (אחרון) → שמאל */}
            <EmailOutlinedIcon sx={{ fontSize: 15, color: "text.disabled", flexShrink: 0 }} />
            <Typography
              variant="body2"
              color={guard.mail?.trim() ? "text.primary" : "text.disabled"}
              sx={{ overflowWrap: "anywhere", lineHeight: 1.4 }}
            >
              {emailValue}
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" gap={1}>
            <PhoneOutlinedIcon sx={{ fontSize: 15, color: "text.disabled", flexShrink: 0 }} />
            <Typography
              variant="body2"
              color={guard.phone?.trim() ? "text.primary" : "text.disabled"}
              sx={{ lineHeight: 1.4 }}
            >
              {phoneValue}
            </Typography>
          </Stack>
        </Stack>
      </Box>

      <Divider />

      {/* ───── פעולות ───── */}
      {/* בשורת RTL: ראשון בDOM = ימין = כפתור הגבלות (פעולה ראשית)
                      אחרון בDOM = שמאל = אייקוני עריכה/מחיקה */}
      <Box sx={{ px: 1.5, py: 1, bgcolor: "rgba(0,0,0,0.015)" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          {/* ימין – כפתור ראשי */}
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate(`/guards/${guard.id}`, { state: { campId } })}
            sx={{ borderRadius: "7px", fontSize: "0.8rem", height: 32, px: 1.5 }}
          >
            הגבלות
          </Button>

          {/* שמאל – פעולות משניות */}
          <Stack direction="row" alignItems="center" gap={0.25}>
            <Tooltip title="היסטוריית משמרות">
              <IconButton
                size="small"
                onClick={() => setHistoryOpen(true)}
                aria-label="היסטוריית משמרות"
                sx={{ p: 0.75, color: "text.secondary", "&:hover": { color: "primary.main" } }}
              >
                <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            {isCommander && onEdit && (
              <IconButton
                size="small"
                color="primary"
                onClick={onEdit}
                aria-label="ערוך שומר"
                sx={{ p: 0.75 }}
              >
                <EditIcon sx={{ fontSize: 18 }} />
              </IconButton>
            )}
            {isCommander && onDelete && (
              <IconButton
                size="small"
                color="error"
                onClick={onDelete}
                aria-label="מחק שומר"
                sx={{ p: 0.75 }}
              >
                <DeleteIcon sx={{ fontSize: 18 }} />
              </IconButton>
            )}
          </Stack>
        </Stack>
      </Box>

      <ShiftHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        guard={guard}
        campId={campId}
      />
    </Paper>
  );
};

GuardCard.propTypes = {
  index: PropTypes.number.isRequired,
  guard: PropTypes.object.isRequired,
  campId: PropTypes.number,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default GuardCard;
