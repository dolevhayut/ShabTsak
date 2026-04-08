import { toast } from "@/services/notificationService";
import { supabase } from "./supabaseClient";
import { getCredentials } from "./authCredentials";

export async function getShiftsByOutpostId(outpostId) {
    try {
        const creds = getCredentials();
        const { data, error } = await supabase.rpc("rpc_get_shifts_by_outpost", {
            ...creds,
            p_outpost_id: outpostId,
        });
        if (error) throw error;
        return data;
    } catch (err) {
        console.log(err);
        toast.error("יש בעיה בבקשה נסה מאוחר יותר");
    }
}

export async function deleteShift(shiftId) {
    try {
        const creds = getCredentials();
        const { error } = await supabase.rpc("rpc_delete_shift", {
            ...creds,
            p_shift_id: shiftId,
        });
        if (error) throw error;
    } catch (err) {
        console.log(err);
    }
}

export async function createOrUpdateShift(bodyFormData, method = "POST") {
    try {
        const creds = getCredentials();
        if (method === "POST") {
            const { data, error } = await supabase.rpc("rpc_create_shift", {
                ...creds,
                p_outpost_id: bodyFormData.outpostId,
                p_day_id: bodyFormData.dayId,
                p_from_hour: bodyFormData.fromHour,
                p_to_hour: bodyFormData.toHour,
            });
            if (error) throw error;
            return { id: data, ...bodyFormData };
        } else if (method === "PUT") {
            const { error } = await supabase.rpc("rpc_create_shift", {
                ...creds,
                p_outpost_id: bodyFormData.outpostId,
                p_day_id: bodyFormData.dayId,
                p_from_hour: bodyFormData.fromHour,
                p_to_hour: bodyFormData.toHour,
            });
            if (error) throw error;
            return bodyFormData;
        }
    } catch (err) {
        throw err;
    }
}
