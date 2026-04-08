import { toast } from "@/services/notificationService";
import { supabase } from "./supabaseClient";
import { getCredentials } from "./authCredentials";

export async function getCamps(includeRegistrationCode = false) {
    try {
        const creds = getCredentials();
        const { data, error } = await supabase.rpc("rpc_get_my_camps", {
            p_user_id: creds.p_user_id,
            p_phone:   creds.p_phone,
        });
        if (error) throw error;
        if (!includeRegistrationCode && data) {
            return data.map(({ id, name, created_at }) => ({ id, name, created_at }));
        }
        return data;
    } catch (err) {
        console.log(err);
        toast.error("יש בעיה בבקשה נסה מאוחר יותר");
    }
}

export async function createOrUpdateCamp(bodyFormData, method, prevItemForUpdate) {
    try {
        const creds = getCredentials();
        if (method === "POST") {
            const { data, error } = await supabase.rpc("rpc_create_camp", {
                ...creds,
                p_name: bodyFormData.name,
            });
            if (error) throw error;
            toast.success(`בסיס ${bodyFormData.name} נוסף בהצלחה`);
        } else if (method === "PUT") {
            const { error } = await supabase.rpc("rpc_update_camp", {
                ...creds,
                p_camp_id: bodyFormData.id,
                p_name: bodyFormData.name,
                p_registration_code: bodyFormData.registration_code?.trim() || null,
            });
            if (error) throw error;
            toast.success(`בסיס ${prevItemForUpdate.name} התעדכן בהצלחה`);
        }
    } catch (err) {
        console.error(`An error occurred while ${method} בסיס`, err);
        toast.error("יש בעיה, בבקשה נסה מאוחר יותר");
        throw err;
    }
}
