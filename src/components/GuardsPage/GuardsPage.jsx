import { useState } from "react";
import { Container, Button, Box } from "@mui/material";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import SelectCamp from "@/components/general_comps/SelectCamp";
import GuardDialogAddOrEdit from "@/components/GuardsPage/Guards/Guard/GuardDialogAddOrEdit/GuardDialogAddOrEdit";
import Guards from "@/components/GuardsPage/Guards/Guards";
import { GuardDialogDelete } from "@/components/GuardsPage/Guards/Guard/GuardDialogDelete/GuardDialogDelete";
import BackLink from "@/components/general_comps/BackLink";
import { useLocation } from "react-router-dom";
import ROUTES from "@/constants/routeConstants";
import { useIsCommander } from "@/hooks/useIsCommander";

const GuardsPage = () => {
  const { state } = useLocation();
  const isCommander = useIsCommander();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMethod, setDialogMethod] = useState("POST");
  const [selectedGuardId, setSelectedGuardId] = useState(null);
  const [guardDetails, setGuardDetails] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [guardToDelete, setGuardToDelete] = useState(null);
  const [selectedCampId, setSelectedCampId] = useState(state?.campId);

  const handleOpenAddDialog = () => {
    setSelectedGuardId(null);
    setDialogMethod("POST");
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (guard) => {
    setSelectedGuardId(guard.id);
    setDialogMethod("PUT");
    setGuardDetails(guard);
    setDialogOpen(true);
  };

  const handleOpenDeleteDialog = (guard) => {
    setGuardToDelete(guard);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setGuardToDelete(null);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  return (
    <Container maxWidth={false} disableGutters sx={{ py: 1 }}>
      <SelectCamp selectedCampId={selectedCampId} setSelectedCampId={setSelectedCampId} title="חיילים" title2={"בבסיס:"} />

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          marginTop: 2,
        }}
      >
        {selectedCampId && isCommander && (
          <Button variant="contained" onClick={handleOpenAddDialog}>
            הוסף חייל
          </Button>
        )}
      </Box>
      {selectedCampId && <Guards campId={+selectedCampId} handleEdit={isCommander ? handleOpenEditDialog : undefined} handleDelete={isCommander ? handleOpenDeleteDialog : undefined} />}
      {dialogOpen && <GuardDialogAddOrEdit open={dialogOpen} close={handleCloseDialog} guardId={selectedGuardId} campId={selectedCampId} method={dialogMethod} guardDetails={guardDetails} />}
      {deleteDialogOpen && guardToDelete && <GuardDialogDelete guard={guardToDelete} closeDialog={handleCloseDeleteDialog} open={deleteDialogOpen} />}
      <BackLink to={ROUTES.HOME} place="end" icon={<ArrowBackIosIcon />}>
        חזרה לרשימת הבסיסים
      </BackLink>
    </Container>
  );
};

export default GuardsPage;
