import { toast } from "@/services/notificationService";
import { supabase } from "./supabaseClient";
import { getCredentials } from "./authCredentials";

export const deleteDayLimit = async (limitId) => {
    try {
        const creds = getCredentials();
        const { error } = await supabase.rpc("rpc_delete_day_limit", {
            ...creds,
            p_limit_id: limitId,
        });
        if (error) throw error;
        toast.success("מחיקת הגבלה בוצעה בהצלחה");
    } catch (err) {
        console.log(err);
        toast.error("יש בעיה במחיקה נסה מאוחר יותר");
    }
};

export const createDayLimit = async (guardId, dayId) => {
    try {
        const creds = getCredentials();
        const { data, error } = await supabase.rpc("rpc_create_day_limit", {
            ...creds,
            p_guard_id: guardId,
            p_day_id: dayId,
        });
        if (error) throw error;
        toast.success("מגבלת יום נוספה בהצלחה!");
        return { data: { id: data }, status: 201 };
    } catch (err) {
        console.error("An error occurred", err);
        toast.error("יש בעיה, בבקשה נסה מאוחר יותר");
        throw err;
    }
};

export const getGuardDayLimits = async (guardId) => {
    try {
        const creds = getCredentials();
        const { data, error } = await supabase.rpc("rpc_get_guard_limits", {
            ...creds,
            p_guard_id: Number(guardId),
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        return row?.day_limits || [];
    } catch (error) {
        console.log(error);
        toast.error("נכשל בטעינת מגבלות הימים של החייל");
        return [];
    }
};
