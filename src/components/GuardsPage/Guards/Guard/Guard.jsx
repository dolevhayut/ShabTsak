import { useState } from "react";
import PropTypes from "prop-types";
import { TableCell, TableRow, IconButton, Button, Avatar, Stack, Box, Typography, Tooltip, Chip } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import { useNavigate } from "react-router-dom";
import ShiftHistoryDialog from "./ShiftHistoryDialog";
import { getTeamAccentColor } from "./teamColor";

const Guard = ({ campId, guard, onEdit, onDelete, index }) => {
  const navigate = useNavigate();
  const [historyOpen, setHistoryOpen] = useState(false);
  const emailValue = guard.mail?.trim() ? guard.mail : "—";
  const phoneValue = guard.phone?.trim() ? guard.phone : "—";
  const hasTeam = Boolean(guard.team?.trim());

  const handleLimitButtonClick = () => {
    navigate(`/guards/${guard.id}`, { state: { campId: campId } });
  };

  const emailIsEmpty = emailValue === "—";

  return (
    <TableRow>
      <TableCell sx={{ py: 1.25 }}>{index + 1}</TableCell>
      <TableCell sx={{ py: 1.25 }}>
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Avatar alt={guard.name} sx={{ width: 36, height: 36 }}>
            <PersonRoundedIcon />
          </Avatar>
        </Box>
      </TableCell>
      <TableCell sx={{ py: 1.25, maxWidth: 0 }}>
        <Stack direction="column" alignItems="flex-end" spacing={0.5}>
          <Typography
            sx={{
              fontWeight: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={guard.name}
          >
            {guard.name}
          </Typography>
          {hasTeam && (
            <Chip
              size="small"
              label={`צוות: ${guard.team}`}
              variant="outlined"
              sx={{
                height: 20,
                borderColor: getTeamAccentColor(guard.team),
                fontSize: "0.7rem",
              }}
            />
          )}
        </Stack>
      </TableCell>
      <TableCell align="center" sx={{ py: 1.25 }}>
        <Box
          component="span"
          sx={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: "1px solid",
            borderColor: "divider",
            display: "inline-block",
            verticalAlign: "middle",
            backgroundColor: guard.color || "#4B6B2A",
          }}
        />
      </TableCell>
      <TableCell sx={{ py: 1.25, maxWidth: 0 }}>
        <Tooltip title={!emailIsEmpty ? emailValue : ""} disableHoverListener={emailIsEmpty}>
          <Typography
            variant="body2"
            color={emailIsEmpty ? "text.disabled" : "text.primary"}
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {emailValue}
          </Typography>
        </Tooltip>
      </TableCell>
      <TableCell sx={{ py: 1.25, maxWidth: 0 }} dir="ltr">
        <Typography
          variant="body2"
          color={phoneValue === "—" ? "text.disabled" : "text.primary"}
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textAlign: "right",
          }}
        >
          {phoneValue}
        </Typography>
      </TableCell>
      <TableCell align="center" sx={{ py: 1.25 }}>
        {guard.shouldBeAllocated ? (
          <CheckCircleIcon sx={{ color: "success.main", fontSize: 22 }} />
        ) : (
          <RadioButtonUncheckedIcon sx={{ color: "text.disabled", fontSize: 22 }} />
        )}
      </TableCell>
      <TableCell align="center" sx={{ py: 1.25 }}>
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} sx={{ flexWrap: "nowrap" }}>
          <Button onClick={handleLimitButtonClick} variant="outlined" color="primary" size="small" sx={{ flexShrink: 0 }}>
            הגבלות
          </Button>
          <Tooltip title="היסטוריית משמרות">
            <IconButton size="small" onClick={() => setHistoryOpen(true)} sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}>
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onEdit} size="small" color="primary">
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton onClick={onDelete} size="small" color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      </TableCell>

      <ShiftHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        guard={guard}
        campId={campId}
      />
    </TableRow>
  );
};
Guard.propTypes = {
  index: PropTypes.number.isRequired,
  guard: PropTypes.object.isRequired,
  campId: PropTypes.number,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default Guard;
