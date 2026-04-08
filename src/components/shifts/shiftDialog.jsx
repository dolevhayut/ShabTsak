import PropTypes from "prop-types";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "react-query";
import { useParams } from "react-router-dom";
import {
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormHelperText,
    ThemeProvider,
    Select,
    MenuItem,
    Dialog,
    InputLabel,
    FormControl,
    Stack,
    TextField,
} from "@mui/material";
import { theme } from "@/theme/theme";
import { toast } from "@/services/notificationService";
import {
    createOrUpdateShift, deleteShift,
    getShiftsByOutpostId,
} from "@/services/shiftService.js";
import { daysOfWeekHebrew } from "@/utils/dateUtils";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useState } from "react";

const TIME_REGEX = /^(?:([01]\d|2[0-3]):([0-5]\d)|24:00)$/;

function toHourNumber(timeValue) {
    const [hours, minutes] = timeValue.split(":").map(Number);
    return hours + (minutes / 60);
}

function formatHourToTime(hourValue) {
    const num = Number(hourValue);
    if (!Number.isFinite(num)) return "08:00";
    if (num === 24) return "24:00";

    const totalMinutes = Math.round(num * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function ShiftDialog({ onCloseDialog, method, item }) {
    const queryClient = useQueryClient();
    const params = useParams();
    const outpostId = Number(params["id"]);
    const [shiftExistIndexes, setShiftExistIndexes] = useState([]);
    const actionHebrew = method === "POST" ? "הוסף" : "ערוך";
    const { data: shifts } = useQuery({
        queryFn: () => getShiftsByOutpostId(outpostId),
        queryKey: ["shifts", outpostId],
        select: (data) => {
            if (method === "POST") {
                return data;
            }
            return data?.filter(({ id }) => id !== item?.id);
        }
    });

    function isConflictingShift(shift, from, to) {
        // Checks if updated from hour is within the shift time range
        return (((from >= shift.fromHour && from < shift.toHour) ||
            // Checks if updated to hour is within the shift time range
            (to > shift.fromHour && to <= shift.toHour) ||
            // Checks if updated to and from are outside the shift time range
            (from <= shift.fromHour && to >= shift.toHour) ||
            // Checks if updated to and from are both within the shift time range
            (from >= shift.fromHour && to <= shift.toHour)));
    }

    const schema = yup.object().shape(
            {
                dayId:
                    yup.array()
                       .min(1, "חובה למלא יום בשבוע")
                       .max(7, "מקסימום 7 ימים")
                       .required()
                       .test("is-unique-shift", `משמרת כבר קיימת`, async function (value) {
                           const { fromHour, toHour } = this.parent;
                           const fromHourNumber = toHourNumber(fromHour);
                           const toHourNumberValue = toHourNumber(toHour);
                           const shiftExists = shifts?.filter((shift) => {
                               return value.includes(shift.dayId) && isConflictingShift(shift, fromHourNumber, toHourNumberValue);
                           });
                           setShiftExistIndexes([...new Set(shiftExists?.map(({ dayId }) => dayId - 1))] || []);
                           return shiftExists?.length === 0;
                       }),
                fromHour:
                    yup.string()
                       .required("חובה למלא שעה")
                       .matches(TIME_REGEX, "פורמט שעה לא תקין (HH:mm)"),
                toHour:
                    yup.string()
                       .required("חובה למלא שעה")
                       .matches(TIME_REGEX, "פורמט שעה לא תקין (HH:mm)")
                       .test("is-greater", "שעת הסיום חייבת להיות מאוחרת משעת ההתחלה", async function (value) {
                           const { fromHour } = this.parent;
                           return toHourNumber(value) > toHourNumber(fromHour);
                       }),
            }
        )
    ;
    const {
        watch,
        register,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
    } = useForm({
        defaultValues: {
            dayId: method === "PUT" ? [Number(item.dayId)] : [],
            fromHour: item ? formatHourToTime(item.fromHour) : "08:00",
            toHour: item ? formatHourToTime(item.toHour) : "11:00",
            outpostId,
            ...(method === "PUT" && { id: item.id }),
        },
        resolver: yupResolver(schema),
    });
    const onSubForm = async ({ fromHour, toHour, outpostId, dayId }) => {
        if (method === "PUT" && !isDirty) {
            // Form data has not changed, show a toast error
            toast.info("הטופס לא השתנה, נא שנה את אחד הפרמטרים");
            return;
        }
        try {
            const fromHourNumber = toHourNumber(fromHour);
            const toHourNumberValue = toHourNumber(toHour);

            if (method === "PUT") {
                await deleteShift(item.id);
            }
            await Promise.all(dayId.map((day) => {
                return createOrUpdateShift({
                    fromHour: fromHourNumber,
                    toHour: toHourNumberValue,
                    outpostId,
                    dayId: day,
                });
            }));
            toast.success(`${dayId.length > 1 ? `${dayId.length} משמרות נשמרו` : "משמרת נשמרה"} בהצלחה`)
        } catch (error) {
            console.error(error);
            toast.error("שגיאה בשמירת המשמרת");
            return;
        }
        reset();
        await queryClient.invalidateQueries(["shifts"]);
        onCloseDialog()
    };

    const selectedDays = watch("dayId");

    return (
        <ThemeProvider theme={theme}>
            <Dialog
                open={true}
                onClose={onCloseDialog}
                PaperProps={{
                    style: {
                        minWidth: "480px", // Set your minimum width here
                        maxWidth: "90vw", // Set a maximum width (e.g., 90% of viewport width)
                        padding: "20px",
                    },
                }}
            >
                <DialogTitle>
                    {actionHebrew} משמרות
                </DialogTitle>
                <form onSubmit={handleSubmit(onSubForm)}>
                    <DialogContent style={{ padding: "10px 20px" }}>
                        <FormControl fullWidth>
                            <InputLabel id="select-label-day">ימים בשבוע</InputLabel>
                            <Select
                                labelId="select-label-day"
                                multiple
                                {...register("dayId", {
                                    required: { value: true, message: "חובה למלא יום בשבוע" },
                                    min: { value: 1, message: "מנימום יום ראשון" },
                                    max: { value: 7, message: "מנימום יום שבת" },
                                })}
                                label="יום בשבוע"
                                defaultValue={item?.dayId ? [Number(item.dayId)] : []}
                            >
                                {daysOfWeekHebrew.map((day, index) => (
                                    <MenuItem
                                        sx={selectedDays.includes(index + 1) ? (shiftExistIndexes?.includes(index) ? { color: "error.main" } : { fontWeight: 500 }) : {}}
                                        key={index + 1}
                                        value={index + 1}
                                    >
                                        {day}
                                    </MenuItem>
                                ))}
                            </Select>
                            <FormHelperText error={!!errors?.dayId} sx={{ height: "1.5em" }}>
                                {shiftExistIndexes?.length > 0 ? `משמרת כבר קיימת בימי ${shiftExistIndexes?.sort().map((index) => daysOfWeekHebrew[index]).join(", ")}` : ""} {/* error message dayId */}
                            </FormHelperText>
                        </FormControl>
                        <Stack direction="row" gap={2} sx={{ "&>*": { flex: 1 }, marginTop: "1.5em" }}>
                            <TextField
                                label="משעה"
                                placeholder="05:45"
                                fullWidth
                                {...register("fromHour")}
                                error={!!errors?.fromHour}
                            />
                            <TextField
                                label="עד שעה"
                                placeholder="07:45"
                                fullWidth
                                {...register("toHour")}
                                error={!!errors?.toHour}
                            />
                        </Stack>

                        {/* error message fromHour */}
                        <FormHelperText error={!!errors?.fromHour || !!errors?.toHour} sx={{ height: "1.5em", paddingInlineStart: "1em" }}>
                            {errors?.fromHour?.message || errors?.toHour?.message}
                        </FormHelperText>
                    </DialogContent>

                    <DialogActions>
                        <Button
                            type="button"
                            onClick={onCloseDialog}
                            style={{ marginLeft: "8px" }}
                        >
                            ביטול
                        </Button>
                        <Button type="submit">{actionHebrew}</Button>
                    </DialogActions>
                </form>
            </Dialog>
        </ThemeProvider>
    );
}

ShiftDialog.propTypes = {
    onCloseDialog: PropTypes.func.isRequired,
    method: PropTypes.oneOf(["PUT", "POST"]).isRequired,
    item: PropTypes.object,
};
export default ShiftDialog;
