import { supabase } from "./supabaseClient";
import { toast } from "@/services/notificationService";

export async function getGuardLinkByUserId(userId, campId) {
  try {
    const query = supabase
      .from("user_guard_links")
      .select("*")
      .eq("userId", userId);

    const { data, error } = campId
      ? await query.eq("campId", campId).maybeSingle()
      : await query.maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(error);
    toast.error("יש בעיה בשליפת שיוך חייל");
    return null;
  }
}

export async function linkUserToGuard(payload) {
  try {
    const { data, error } = await supabase
      .from("user_guard_links")
      .upsert(payload, { onConflict: "userId,campId" })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(error);
    toast.error("יש בעיה בשמירת שיוך חייל");
    throw error;
  }
}
