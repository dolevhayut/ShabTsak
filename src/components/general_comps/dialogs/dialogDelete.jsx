import PropTypes from 'prop-types';
import { useQueryClient } from 'react-query';
import { useMemo } from "react";
import { toast } from "@/services/notificationService";
import { Dialog, DialogTitle, DialogActions, Button } from "@mui/material";
import { supabase } from "@/services/supabaseClient";
import { getDayOfWeekHebrew } from "@/utils/dateUtils"

DialogDelete.propTypes = {
    openDialog: PropTypes.bool.isRequired,
    setOpenDialog: PropTypes.func.isRequired,
    subject: PropTypes.oneOf(['camp', 'outpost', 'shift', 'guard']).isRequired,
    item: PropTypes.object
}

const tableMap = {
    camp: "camps",
    outpost: "outposts",
    shift: "shifts",
    guard: "guards",
};

function DialogDelete({ openDialog, setOpenDialog, subject, item }) {
    const queryClient = useQueryClient();

    const subjectHebrew = useMemo(() => {
        if (subject === "camp") return "בסיס";
        else if (subject === "outpost") return "עמדה";
        else if (subject === "shift") return "משמרת";
        else if (subject === "guard") return "חייל";
        else return subject; 
    }, [subject]);


    const doApiDelete = async () => {
        try {
            const { error } = await supabase
                .from(tableMap[subject])
                .delete()
                .eq("id", item.id);
            if (error) throw error;
            toast.success(`${subjectHebrew}  ${subject === 'shift' ? `יום ${getDayOfWeekHebrew(item.dayId)}` : item.name} נמחקה בהצלחה`);
            setOpenDialog(false);
            queryClient.invalidateQueries(`${subject}s`)
        }
        catch (err) {
            console.log(err);
            toast.error("יש בעיה בבקשה נסה מאוחר יותר");
        }
    }

    return (
        <>
            <Dialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle
                    sx={{ mb: 2 }}
                    id="alert-dialog-title">
                    {`אתה בטוח רוצה למחוק ${subjectHebrew} ${subject === 'shift' ? getDayOfWeekHebrew(item.dayId) : item.name}?`}
                </DialogTitle>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>ביטול</Button>
                    <Button onClick={doApiDelete} autoFocus>אישור</Button>
                </DialogActions>
            </Dialog>
        </>
    )
}

export default DialogDelete
