import { supabase } from "./supabaseClient";

export async function logCommanderAction(payload) {
  const { error } = await supabase.from("commander_actions_log").insert(payload);
  if (error) {
    console.error("Failed to log commander action", error);
  }
}

export async function logAiIntent(payload) {
  const { data, error } = await supabase
    .from("ai_commander_intents")
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error("Failed to log AI intent", error);
    throw error;
  }
  return data;
}

export async function updateAiIntent(intentId, updates) {
  const { data, error } = await supabase
    .from("ai_commander_intents")
    .update(updates)
    .eq("id", intentId)
    .select()
    .single();
  if (error) {
    console.error("Failed to update AI intent", error);
    throw error;
  }
  return data;
}
