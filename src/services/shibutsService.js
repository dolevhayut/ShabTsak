import { toast } from "@/services/notificationService";
import { supabase } from "./supabaseClient";
import { getTimeStr } from "../utils/dateUtils";
import { getCredentials } from "./authCredentials";

export async function createOrUpdateShibuts(bodyFormData) {
    try {
        const creds = getCredentials();

        if (bodyFormData.id) {
            const { error } = await supabase.rpc("rpc_update_shibuts", {
                ...creds,
                p_shibuts_id: bodyFormData.id,
                p_guard_id: bodyFormData.guardId,
                p_shift_id: bodyFormData.shiftId,
                p_outpost_id: bodyFormData.outpostId,
                p_camp_id: bodyFormData.campId,
                p_the_date: bodyFormData.theDate,
            });
            if (error) throw error;
        } else {
            const { error } = await supabase.rpc("rpc_create_shibuts", {
                ...creds,
                p_guard_id: bodyFormData.guardId,
                p_shift_id: bodyFormData.shiftId,
                p_outpost_id: bodyFormData.outpostId,
                p_camp_id: bodyFormData.campId,
                p_the_date: bodyFormData.theDate,
            });
            if (error) throw error;
        }

        toast.success(
            `שיבוץ של ${bodyFormData.guardName} בעמדה ${bodyFormData.outpostName} בשעות ${getTimeStr(bodyFormData.start.getHours())} - ${getTimeStr(bodyFormData.end.getHours())} נשמר בהצלחה`
        );
    } catch (err) {
        console.error(err);
        toast.error("יש בעיה בשמירת השיבוץ, בבקשה נסה מאוחר יותר");
        throw err;
    }
}

export async function getShibutsimOfCurrentMonthByCampId(campId, shibutsDates) {
    try {
        let startTs, endTs;
        if (shibutsDates) {
            startTs = shibutsDates[0].getTime();
            endTs = shibutsDates[1].getTime();
        } else {
            const now = new Date();
            const first = new Date(now.getFullYear(), now.getMonth(), 1);
            const last = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            startTs = first.getTime();
            endTs = last.getTime();
        }

        const { data, error } = await supabase
            .from("shibuts")
            .select("*")
            .eq("campId", campId)
            .gte("theDate", startTs)
            .lte("theDate", endTs);
        if (error) throw error;
        return data;
    } catch (err) {
        console.log(err);
        toast.error("יש בעיה בשליפת בשיבוצים נסה מאוחר יותר");
    }
}

export async function getAutoShibutsimByCampIdAndDates(_campId, _shibutsDates) {
    toast.info("שיבוץ אוטומטי עדיין לא מיושם בגרסת Supabase");
    return [];
}

export async function deleteAutoShibutsim(campId, shibutsDates) {
    try {
        const creds = getCredentials();
        const startTs = shibutsDates[0].getTime();
        const endTs = shibutsDates[1].getTime();

        const { error } = await supabase.rpc("rpc_delete_shibuts_range", {
            ...creds,
            p_camp_id: campId,
            p_start_ts: startTs,
            p_end_ts: endTs,
        });
        if (error) throw error;
        toast.success("מחיקת שיבוצים בוצעה בהצלחה");
    } catch (err) {
        console.log(err);
        toast.error("יש בעיה במחיקה נסה מאוחר יותר");
    }
}

export async function deleteShibuts(shibutsId) {
    try {
        const creds = getCredentials();
        const { error } = await supabase.rpc("rpc_delete_shibuts", {
            ...creds,
            p_shibuts_id: shibutsId,
        });
        if (error) throw error;
        toast.success("מחיקת שיבוץ בוצעה בהצלחה");
    } catch (err) {
        console.log(err);
        toast.error("יש בעיה במחיקה נסה מאוחר יותר");
    }
}

export async function getShibutsimByGuardAndCamp(guardId, campId, dateRange) {
    try {
        if (!guardId || !campId) {
            return [];
        }

        let query = supabase
            .from("shibuts")
            .select("*")
            .eq("guardId", guardId)
            .eq("campId", campId)
            .order("theDate", { ascending: true });

        if (dateRange?.length === 2) {
            query = query
                .gte("theDate", dateRange[0].getTime())
                .lte("theDate", dateRange[1].getTime());
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.log(err);
        toast.error("יש בעיה בשליפת המשמרות שלך");
        return [];
    }
}

export async function getShibutsById(shibutsId) {
    try {
        const { data, error } = await supabase
            .from("shibuts")
            .select("*")
            .eq("id", shibutsId)
            .maybeSingle();
        if (error) throw error;
        return data;
    } catch (err) {
        console.error(err);
        toast.error("יש בעיה בשליפת השיבוץ");
        return null;
    }
}

export async function updateShibutsGuard(shibutsId, newGuardId) {
    try {
        const creds = getCredentials();
        const existing = await getShibutsById(shibutsId);
        if (!existing) throw new Error("shibuts not found");

        const { error } = await supabase.rpc("rpc_update_shibuts", {
            ...creds,
            p_shibuts_id: shibutsId,
            p_guard_id: newGuardId,
            p_shift_id: existing.shiftId,
            p_outpost_id: existing.outpostId,
            p_camp_id: existing.campId,
            p_the_date: existing.theDate,
        });
        if (error) throw error;
        toast.success("השיבוץ הועבר לשומר אחר");
        return { id: shibutsId, guardId: newGuardId };
    } catch (err) {
        console.error(err);
        toast.error("נכשל בהחלפת השומר");
        throw err;
    }
}

export async function moveShibutsToDate(shibutsId, nextDateInput) {
    try {
        const creds = getCredentials();
        const nextDate = new Date(nextDateInput);
        if (Number.isNaN(nextDate.getTime())) {
            throw new Error("invalid date");
        }

        const midnightTs = new Date(
            nextDate.getFullYear(),
            nextDate.getMonth(),
            nextDate.getDate()
        ).getTime();

        const { error } = await supabase.rpc("rpc_move_shibuts_date", {
            ...creds,
            p_shibuts_id: shibutsId,
            p_new_date: midnightTs,
        });
        if (error) throw error;

        toast.success("השיבוץ הוזז לתאריך החדש");
        return { id: shibutsId, theDate: midnightTs };
    } catch (err) {
        console.error(err);
        toast.error("נכשל בהזזת השיבוץ לתאריך החדש");
        throw err;
    }
}
