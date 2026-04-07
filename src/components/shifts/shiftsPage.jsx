import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "react-query";
import { Container, Typography } from "@mui/material";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import AddShiftBtn from "./addShiftBtn/addShiftBtn";
import DialogShift from "./shiftDialog";
import ShiftList from "./shiftList/shiftList";
import BackLink from "../general_comps/BackLink.jsx";
import LoadingComp from "../general_comps/LoadingComp.jsx";
import { getShiftsByOutpostId } from "@/services/shiftService.js";
import { useIsCommander } from "@/hooks/useIsCommander";

export default function ShiftsPage() {
    const params = useParams();
    const isCommander = useIsCommander();
    const [openDialog, setOpenDialog] = useState(false);
    const [item, setItem] = useState(null);
    const outpostId = params["id"];

    const sortedArrayShifts = async () => {
        const shiftsData = await getShiftsByOutpostId(outpostId);
        return shiftsData?.slice().sort((a, b) => {
            // First, compare by dayId
            if (a.dayId !== b.dayId) {
                return a.dayId - b.dayId;
            }
            // If dayId is the same, compare by fromHour
            else return a.fromHour - b.fromHour;
        });
    };

    const { isLoading, data: shifts } = useQuery({
        queryFn: () => sortedArrayShifts(),
        queryKey: ["shifts", outpostId],
    });
    function onDuplicateShift(shift) {
        const { dayId, id, ...dupedShift } = shift;
        setItem(dupedShift);
        setOpenDialog(true);
    }

    return (
        <div className="shifts-page">
            <Container maxWidth={false} disableGutters>
                {isCommander && <AddShiftBtn setOpenDialog={setOpenDialog}/>}

                <Typography variant="h2" component="h1" mb={3}>
                    רשימת משמרות {params["name"]}
                </Typography>

                {isLoading ? (
                    <LoadingComp/>
                ) : shifts?.length === 0 ? (
                    <Typography variant="h5" component="h2" my={2}>
                        אין משמרות עדיין
                    </Typography>
                ) : (
                    <ShiftList shifts={shifts} onDuplciateShift={onDuplicateShift}/>
                )}

                {isCommander && openDialog && (
                    <DialogShift
                        onCloseDialog={() => {
                            setOpenDialog(false);
                            setItem(null);
                        }}
                        method="POST"
                        item={item}
                    />
                )}
                <BackLink place="end" icon={<ArrowBackIosIcon/>}>
                    חזרה לרשימת העמדות
                </BackLink>
            </Container>
        </div>
    );
}
