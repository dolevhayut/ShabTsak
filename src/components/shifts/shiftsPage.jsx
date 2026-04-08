import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "react-query";
import {
    Box,
    Button,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from "@mui/material";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import DialogShift from "./shiftDialog";
import AutoGenerateShiftsDialog from "./autoGenerateShiftsDialog";
import ShiftList from "./shiftList/shiftList";
import BackLink from "../general_comps/BackLink.jsx";
import LoadingComp from "../general_comps/LoadingComp.jsx";
import {
    deleteAllShiftsForOutpost,
    getShiftsByOutpostId,
} from "@/services/shiftService.js";
import { toast } from "@/services/notificationService";
import { useIsCommander } from "@/hooks/useIsCommander";

export default function ShiftsPage() {
    const params = useParams();
    const queryClient = useQueryClient();
    const isCommander = useIsCommander();
    const [openDialog, setOpenDialog] = useState(false);
    const [openAutoDialog, setOpenAutoDialog] = useState(false);
    const [deleteAllOpen, setDeleteAllOpen] = useState(false);
    const [deletingAll, setDeletingAll] = useState(false);
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

    async function handleDeleteAllShifts() {
        const idNum = Number(outpostId);
        if (!Number.isFinite(idNum)) {
            toast.error("מזהה עמדה לא תקין");
            return;
        }
        setDeletingAll(true);
        try {
            const n = await deleteAllShiftsForOutpost(idNum);
            if (n === 0) {
                toast.info("אין משמרות למחוק");
            } else {
                toast.success(`נמחקו ${n} משמרות`);
            }
            await queryClient.invalidateQueries(["shifts", outpostId]);
            setDeleteAllOpen(false);
        } catch (e) {
            console.error(e);
            toast.error("שגיאה במחיקת המשמרות");
        } finally {
            setDeletingAll(false);
        }
    }

    return (
        <div className="shifts-page">
            <Container maxWidth={false} disableGutters>
                {isCommander && (
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                            gap: 2,
                            marginTop: "20px",
                            flexWrap: "wrap",
                        }}
                    >
                        <Button
                            type="button"
                            variant="outlined"
                            color="primary"
                            onClick={() => setOpenAutoDialog(true)}
                        >
                            יצירה אוטומטית
                        </Button>
                        <Button
                            type="button"
                            variant="contained"
                            color="primary"
                            onClick={() => setOpenDialog(true)}
                        >
                            הוסף משמרת
                        </Button>
                        <Button
                            type="button"
                            variant="outlined"
                            color="error"
                            disabled={isLoading || !shifts?.length}
                            onClick={() => setDeleteAllOpen(true)}
                        >
                            מחק הכל
                        </Button>
                    </Box>
                )}

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

                {isCommander && openAutoDialog && (
                    <AutoGenerateShiftsDialog
                        onClose={() => setOpenAutoDialog(false)}
                        outpostId={outpostId}
                    />
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
                {isCommander && (
                    <Dialog
                        open={deleteAllOpen}
                        onClose={() => !deletingAll && setDeleteAllOpen(false)}
                    >
                        <DialogTitle>מחיקת כל המשמרות</DialogTitle>
                        <DialogContent>
                            <Typography variant="body1">
                                למחוק את כל המשמרות של העמדה &quot;{params["name"]}
                                &quot;? פעולה זו אינה ניתנת לביטול.
                            </Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button
                                onClick={() => setDeleteAllOpen(false)}
                                disabled={deletingAll}
                            >
                                ביטול
                            </Button>
                            <Button
                                color="error"
                                variant="contained"
                                disabled={deletingAll}
                                onClick={handleDeleteAllShifts}
                            >
                                {deletingAll ? "מוחק…" : "מחק הכל"}
                            </Button>
                        </DialogActions>
                    </Dialog>
                )}
                <BackLink place="end" icon={<ArrowBackIosIcon/>}>
                    חזרה לרשימת העמדות
                </BackLink>
            </Container>
        </div>
    );
}
