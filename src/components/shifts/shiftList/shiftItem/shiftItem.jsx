import PropTypes from "prop-types";
import { TableCell, TableRow } from "@mui/material";
import ShiftItemActions from "./shiftItemActions/shiftItemActions";
import { getDayOfWeekHebrew } from "@/utils/dateUtils";
import { useMemo } from "react";

ShiftItem.propTypes = {
  item: PropTypes.object,
};

export default function ShiftItem({ item, onDuplicateShift }) {
  const dayNumber = item.dayId;
  const formatTime = (hourValue) => {
    const numericHour = Number(hourValue);
    if (!Number.isFinite(numericHour)) {
      return "";
    }
    if (numericHour === 24) {
      return "24:00";
    }
    const totalMinutes = Math.round(numericHour * 60);
    const hourPart = Math.floor(totalMinutes / 60);
    const minutePart = totalMinutes % 60;
    return `${String(hourPart).padStart(2, "0")}:${String(minutePart).padStart(2, "0")}`;
  };

  const dayHebrew = useMemo(() => {
    if (dayNumber) {
      return getDayOfWeekHebrew(dayNumber);
    }
    return "";
  }, [dayNumber]);

  return (
    <TableRow>
      <TableCell align="center">{dayHebrew}</TableCell>
      <TableCell align="center" direction="asc">
        {formatTime(item.fromHour)}
      </TableCell>
      <TableCell align="center">{formatTime(item.toHour)}</TableCell>

      <TableCell
        align="center"
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ShiftItemActions item={item} onDuplicateShift={onDuplicateShift} />
      </TableCell>
    </TableRow>
  );
}
