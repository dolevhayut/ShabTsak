import { toast } from "@/services/notificationService";
import { supabase } from "./supabaseClient";
import { getCredentials } from "./authCredentials";

export async function getCampSettings(campId) {
    try {
        const creds = getCredentials();
        const { data, error } = await supabase.rpc("rpc_get_camp_settings", {
            ...creds,
            p_camp_id: campId,
        });
        if (error) throw error;
        const raw = Array.isArray(data) ? data[0] : data;
        if (!raw) return { camp_id: campId, min_rest_hours: 8 };
        return {
            camp_id: raw.out_camp_id ?? raw.camp_id ?? campId,
            min_rest_hours: raw.out_min_rest_hours ?? raw.min_rest_hours ?? 8,
        };
    } catch (err) {
        console.error(err);
        toast.error("שגיאה בטעינת הגדרות הבסיס");
        return { camp_id: campId, min_rest_hours: 8 };
    }
}

export async function updateCampSettings(campId, settings) {
    try {
        const creds = getCredentials();
        const { error } = await supabase.rpc("rpc_update_camp_settings", {
            ...creds,
            p_camp_id: campId,
            p_min_rest_hours: settings.min_rest_hours,
        });
        if (error) throw error;
        toast.success("הגדרות הבסיס עודכנו בהצלחה");
    } catch (err) {
        console.error(err);
        toast.error("שגיאה בעדכון הגדרות הבסיס");
        throw err;
    }
}

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
