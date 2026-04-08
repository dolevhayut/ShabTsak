import PropTypes from "prop-types";
import { useForm, Controller } from "react-hook-form";
import { useQueryClient } from "react-query";
import {
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    ThemeProvider,
    Select,
    MenuItem,
    Dialog,
    InputLabel,
    FormControl,
    Stack,
    Typography,
    FormHelperText,
} from "@mui/material";
import { theme } from "@/theme/theme";
import { toast } from "@/services/notificationService";
import { generateShiftsForOutpost } from "@/services/shiftService.js";
import { daysOfWeekHebrew, hourArr } from "@/utils/dateUtils";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const DURATION_OPTIONS = [1, 2, 3, 4, 6, 8, 12];

const schema = yup.object({
    durationHours: yup.number().oneOf(DURATION_OPTIONS).required(),
    fromHour: yup.number().min(0).max(23).required(),
    toHour: yup
        .number()
        .min(1)
        .max(24)
        .required()
        .test(
            "after-from",
            "שעת הסיום חייבת להיות אחרי שעת ההתחלה",
            function (value) {
                const { fromHour } = this.parent;
                return value > fromHour;
            },
        ),
    dayIds: yup
        .array()
        .of(yup.number().min(1).max(7))
        .min(1, "בחר לפחות יום אחד")
        .required(),
});

function AutoGenerateShiftsDialog({ onClose, outpostId: outpostIdRaw }) {
    const outpostId = Number(outpostIdRaw);
    const queryClient = useQueryClient();
    const {
        handleSubmit,
        control,
        watch,
        formState: { errors, isSubmitting },
    } = useForm({
        defaultValues: {
            durationHours: 3,
            fromHour: 0,
            toHour: 24,
            dayIds: [1, 2, 3, 4, 5, 6, 7],
        },
        resolver: yupResolver(schema),
    });

    const fromHour = watch("fromHour");
    const toHour = watch("toHour");
    const durationHours = watch("durationHours");

    const previewSlotsPerDay = (() => {
        if (toHour <= fromHour || !durationHours) return 0;
        let n = 0;
        let t = fromHour;
        while (t + durationHours <= toHour) {
            n += 1;
            t += durationHours;
        }
        return n;
    })();

    const onSubmit = async (values) => {
        if (!Number.isFinite(outpostId)) {
            toast.error("מזהה עמדה לא תקין");
            return;
        }
        try {
            const { created, skipped } = await generateShiftsForOutpost({
                outpostId,
                durationHours: values.durationHours,
                fromHour: values.fromHour,
                toHour: values.toHour,
                dayIds: values.dayIds,
            });
            if (created === 0 && skipped === 0) {
                toast.info(
                    "לא נוצרו משמרות — אין מקום בטווח השעות (או שהמשך גדול מדי מול התחלה/סיום)",
                );
            } else {
                const parts = [`נוצרו ${created} משמרות`];
                if (skipped > 0) {
                    parts.push(`דולגו ${skipped} (היו כבר משמרות חופפות)`);
                }
                toast.success(parts.join(". "));
            }
            await queryClient.invalidateQueries(["shifts", String(outpostIdRaw)]);
            onClose();
        } catch (e) {
            console.error(e);
            toast.error("שגיאה ביצירת המשמרות");
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <Dialog
                open
                onClose={onClose}
                PaperProps={{
                    style: {
                        minWidth: "480px",
                        maxWidth: "90vw",
                        padding: "20px",
                    },
                }}
            >
                <DialogTitle>יצירה אוטומטית של משמרות</DialogTitle>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogContent style={{ padding: "10px 20px" }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            נקבע אורך משמרת קבוע, טווח שעות ביום, וימים — המערכת תיצור
                            משמרות רצופות (למשל 3 שעות מ־00:00 עד 24:00 = 8 משמרות לכל
                            יום).
                        </Typography>
                        <Stack spacing={2}>
                            <FormControl fullWidth>
                                <InputLabel id="dur-label">אורך משמרת (שעות)</InputLabel>
                                <Controller
                                    name="durationHours"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            {...field}
                                            labelId="dur-label"
                                            label="אורך משמרת (שעות)"
                                        >
                                            {DURATION_OPTIONS.map((h) => (
                                                <MenuItem key={h} value={h}>
                                                    {h} שעות
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    )}
                                />
                            </FormControl>
                            <Stack direction="row" gap={2} sx={{ "&>*": { flex: 1 } }}>
                                <FormControl fullWidth>
                                    <InputLabel id="from-label">משעה</InputLabel>
                                    <Controller
                                        name="fromHour"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                {...field}
                                                labelId="from-label"
                                                label="משעה"
                                            >
                                                {hourArr.slice(0, 24).map((hour) => (
                                                    <MenuItem key={hour} value={Number(hour)}>
                                                        {hour}:00
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        )}
                                    />
                                </FormControl>
                                <FormControl fullWidth>
                                    <InputLabel id="to-label">עד שעה (סוף טווח)</InputLabel>
                                    <Controller
                                        name="toHour"
                                        control={control}
                                        render={({ field }) => (
                                            <Select
                                                {...field}
                                                labelId="to-label"
                                                label="עד שעה (סוף טווח)"
                                            >
                                                {hourArr.map((hour) => (
                                                    <MenuItem key={hour} value={Number(hour)}>
                                                        {hour === "24"
                                                            ? "24:00 (חצות)"
                                                            : `${hour}:00`}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        )}
                                    />
                                </FormControl>
                            </Stack>
                            {errors.toHour && (
                                <FormHelperText error sx={{ mx: 0 }}>
                                    {errors.toHour.message}
                                </FormHelperText>
                            )}
                            <FormControl fullWidth error={!!errors.dayIds}>
                                <InputLabel id="days-label">ימים</InputLabel>
                                <Controller
                                    name="dayIds"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            {...field}
                                            labelId="days-label"
                                            label="ימים"
                                            multiple
                                            value={field.value}
                                            onChange={field.onChange}
                                            renderValue={(selected) =>
                                                selected
                                                    .sort((a, b) => a - b)
                                                    .map((id) => daysOfWeekHebrew[id - 1])
                                                    .join(", ")
                                            }
                                        >
                                            {daysOfWeekHebrew.map((day, index) => (
                                                <MenuItem key={index + 1} value={index + 1}>
                                                    {day}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    )}
                                />
                                <FormHelperText>
                                    {errors.dayIds?.message ||
                                        `בכל יום נוצרות כ־${previewSlotsPerDay} משמרות בטווח הנוכחי`}
                                </FormHelperText>
                            </FormControl>
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button type="button" onClick={onClose} sx={{ ml: 1 }}>
                            ביטול
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            צור משמרות
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </ThemeProvider>
    );
}

AutoGenerateShiftsDialog.propTypes = {
    onClose: PropTypes.func.isRequired,
    /** מזהה עמדה מהנתיב (מחרוזת או מספר) */
    outpostId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default AutoGenerateShiftsDialog;
