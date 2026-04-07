import { useState } from "react";
import { useQuery } from "react-query";
import { Container, Typography } from "@mui/material";
import CampDialog from "./campDialog";
import CampList from "./campList/campList";
import AddCampBtn from "./addCampBtn/addCampBtn";
import LoadingComp from "../general_comps/LoadingComp.jsx";
import { getCamps } from "@/services/campService.js";
import { useIsCommander } from "@/hooks/useIsCommander";

const CampsPage = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const isCommander = useIsCommander();

  const { isLoading, data: camps } = useQuery({
    queryFn: getCamps,
    queryKey: ["camps"],
  });

  return (
    <div className="camps-page">
      <Container maxWidth={false} disableGutters>
        {isCommander && <AddCampBtn setOpenDialog={setOpenDialog} />}

        <Typography variant="h2" component="h1" mb={3}>
          רשימת בסיסים
        </Typography>

        {isLoading ? (
          <LoadingComp />
        ) : camps?.length === 0 ? (
          <Typography variant="h5" component="h2" my={2}>
            אין בסיסים עדיין
          </Typography>
        ) : (
          <CampList camps={(camps || []) as never[]} />
        )}

        {isCommander && <CampDialog openDialog={openDialog} setOpenDialog={setOpenDialog} method="POST" />}
      </Container>
    </div>
  );
};

export default CampsPage;
