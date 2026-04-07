import { supabase } from "./supabaseClient";
import { toast } from "@/services/notificationService";

export async function getShibutsEvents(shibutsId) {
  try {
    const { data, error } = await supabase
      .from("shibuts_events")
      .select("*")
      .eq("shibutsId", shibutsId)
      .order("createdAt", { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(error);
    toast.error("נכשל בטעינת דיווחי האירועים");
    return [];
  }
}

export async function addShibutsEvent({ shibutsId, campId, authorUserId, authorGuardId, content }) {
  try {
    const { data, error } = await supabase
      .from("shibuts_events")
      .insert({ shibutsId, campId, authorUserId, authorGuardId: authorGuardId || null, content })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(error);
    toast.error("נכשל בשליחת הדיווח");
    throw error;
  }
}

export async function deleteShibutsEvent(eventId) {
  try {
    const { error } = await supabase
      .from("shibuts_events")
      .delete()
      .eq("id", eventId);
    if (error) throw error;
    toast.success("הדיווח נמחק");
  } catch (error) {
    console.error(error);
    toast.error("נכשל במחיקת הדיווח");
    throw error;
  }
}
