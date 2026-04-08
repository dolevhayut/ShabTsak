import { toast } from "@/services/notificationService";
import { supabase } from "./supabaseClient";
import { getCredentials } from "./authCredentials";

export async function getOutpostsByCampId(campId) {
    try {
        const creds = getCredentials();
        const { data, error } = await supabase.rpc("rpc_get_outposts_by_camp", {
            ...creds,
            p_camp_id: campId,
        });
        if (error) throw error;
        return data;
    } catch (err) {
        console.log(err);
        toast.error("יש בעיה בבקשה נסה מאוחר יותר");
    }
}

export async function createOrUpdateOutpost(bodyFormData, method, prevItemForUpdate) {
    try {
        const creds = getCredentials();
        if (method === "POST") {
            const { error } = await supabase.rpc("rpc_create_outpost", {
                ...creds,
                p_name: bodyFormData.name,
                p_camp_id: bodyFormData.campId,
                p_min_guards: bodyFormData.minGuards || 1,
            });
            if (error) throw error;
            toast.success(`עמדה ${bodyFormData.name} נוספה בהצלחה`);
        } else if (method === "PUT") {
            const { error } = await supabase.rpc("rpc_update_outpost", {
                ...creds,
                p_outpost_id: bodyFormData.id,
                p_name: bodyFormData.name,
                p_min_guards: bodyFormData.minGuards,
            });
            if (error) throw error;
            toast.success(`עמדה ${prevItemForUpdate.name} התעדכנה בהצלחה`);
        }
    } catch (err) {
        console.error(`An error occurred while ${method} עמדה`, err);
        toast.error("יש בעיה, בבקשה נסה מאוחר יותר");
        throw err;
    }
}

export async function getOutpostsAndShiftsForCampId(campId) {
    try {
        const creds = getCredentials();
        const { data, error } = await supabase.rpc("rpc_get_outposts_with_shifts", {
            ...creds,
            p_camp_id: campId,
        });
        if (error) throw error;
        return data;
    } catch (err) {
        console.log(err);
        toast.error("יש בעיה בבקשה נסה מאוחר יותר");
    }
}
