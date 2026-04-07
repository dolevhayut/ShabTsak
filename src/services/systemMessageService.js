import { supabase } from "./supabaseClient";
import { toast } from "@/services/notificationService";

export async function getSystemMessages(campId, { includeInactive = false } = {}) {
  try {
    let query = supabase
      .from("system_messages")
      .select("*")
      .eq("campId", campId)
      .order("createdAt", { ascending: false });

    if (!includeInactive) {
      query = query.eq("isActive", true);
    }

    const { data, error } = await query;
    if (error) throw error;

    const now = Date.now();
    return (data || []).filter(
      (m) => !m.expiresAt || Number(m.expiresAt) > now
    );
  } catch (err) {
    console.error(err);
    toast.error("נכשל בטעינת הודעות המערכת");
    return [];
  }
}

export async function createSystemMessage(payload) {
  try {
    const { data, error } = await supabase
      .from("system_messages")
      .insert({
        campId: payload.campId,
        outpostId: payload.outpostId || null,
        authorUserId: payload.authorUserId || null,
        title: payload.title,
        content: payload.content || null,
        priority: payload.priority || "info",
        expiresAt: payload.expiresAt || null,
        isActive: true,
      })
      .select()
      .single();
    if (error) throw error;
    toast.success("ההודעה פורסמה");
    return data;
  } catch (err) {
    console.error(err);
    toast.error("נכשל בפרסום ההודעה");
    throw err;
  }
}

export async function updateSystemMessage(id, payload) {
  try {
    const { data, error } = await supabase
      .from("system_messages")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    toast.success("ההודעה עודכנה");
    return data;
  } catch (err) {
    console.error(err);
    toast.error("נכשל בעדכון ההודעה");
    throw err;
  }
}

export async function deleteSystemMessage(id) {
  try {
    const { error } = await supabase
      .from("system_messages")
      .delete()
      .eq("id", id);
    if (error) throw error;
    toast.success("ההודעה נמחקה");
  } catch (err) {
    console.error(err);
    toast.error("נכשל במחיקת ההודעה");
    throw err;
  }
}
