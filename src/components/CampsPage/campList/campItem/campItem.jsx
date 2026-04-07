import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { Button, TableCell, TableRow } from "@mui/material";
import ROUTES from "../../../../constants/routeConstants";
import CampItemActions from "./campItemActions/campItemActions";

CampItem.propTypes = {
  index: PropTypes.number.isRequired,
  item: PropTypes.object.isRequired,
  showRegistrationCode: PropTypes.bool,
};

function CampItem({ item, index, showRegistrationCode = false }) {
  const nav = useNavigate();
  return (
    <TableRow
      sx={{
        "&:hover": { backgroundColor: "action.hover" },
        transition: "background-color 0.15s ease",
      }}
    >
      <TableCell
        align="center"
        sx={{ color: "text.disabled", fontSize: "0.8125rem", fontWeight: 400 }}
      >
        {index + 1}
      </TableCell>

      <TableCell
        align="center"
        sx={{ fontWeight: 500, fontSize: "0.9375rem", color: "text.primary" }}
      >
        {item.name}
      </TableCell>

      {showRegistrationCode && (
        <TableCell
          align="center"
          sx={{
            fontFamily: "ui-monospace, monospace",
            fontWeight: 600,
            letterSpacing: "0.06em",
            fontSize: "0.875rem",
          }}
        >
          {item.registration_code ?? "—"}
        </TableCell>
      )}

      <TableCell align="center">
        <Button
          variant="outlined"
          size="small"
          color="primary"
          onClick={() => {
            nav(`${ROUTES.OUTPOSTS}/camp/${item.id}/${item.name}`);
          }}
          sx={{
            borderRadius: "8px",
            fontWeight: 500,
            fontSize: "0.8125rem",
            px: 2,
          }}
        >
          עמדות
        </Button>
      </TableCell>

      <TableCell align="center">
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            nav(ROUTES.GUARDS, { state: { campId: item.id } });
          }}
          sx={{
            borderRadius: "8px",
            borderColor: "divider",
            color: "text.secondary",
            fontWeight: 500,
            fontSize: "0.8125rem",
            px: 2,
            "&:hover": {
              borderColor: "text.secondary",
              backgroundColor: "action.hover",
            },
          }}
        >
          חיילים
        </Button>
      </TableCell>

      <TableCell
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CampItemActions item={item} />
      </TableCell>
    </TableRow>
  );
}

export default CampItem;
