import { supabase } from "../config/supabase.js";

export const API = {
  // Récupérer les morceaux (items) filtrés avec leurs tags et l'email associé
  async getItems({ type = null, account = "all", tagId = null, includeTrashed = false }) {
    let query = supabase
      .from("cm_items")
      .select(`
        *,
        cm_emails!inner(*),
        cm_item_tags(
          cm_tags(*)
        )
      `)
      .order("created_at", { ascending: false });

    if (!includeTrashed) {
      query = query.eq("status", "active");
    } else {
      query = query.eq("status", "trashed");
    }

    if (type && type !== "daily") {
      query = query.eq("type", type);
    } else if (type === "daily") {
      query = query.eq("type", "spam_low_priority");
    }

    if (account !== "all") {
      query = query.eq("cm_emails.account_type", account);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Erreur lors de la récupération des items:", error);
      return [];
    }

    // Filtrage JS par tag si sélectionné
    if (tagId) {
      return data.filter(item => 
        item.cm_item_tags.some(it => it.cm_tags.id === tagId)
      );
    }

    return data;
  },

  // Récupérer tous les tags enregistrés
  async getTags() {
    const { data, error } = await supabase.from("cm_tags").select("*").order("name");
    if (error) console.error("Erreur tags:", error);
    return data || [];
  },

  // Mettre un morceau à la corbeille ou le restaurer
  async updateItemStatus(itemId, newStatus) {
    const { error } = await supabase
      .from("cm_items")
      .update({ status: newStatus })
      .eq("id", itemId);
    
    if (error) console.error("Erreur changement statut:", error);
    return !error;
  },

  // Vider définitivement la corbeille (Items + Emails associés si orphelins)
  async emptyTrash() {
    const { error } = await supabase
      .from("cm_items")
      .delete()
      .eq("status", "trashed");
      
    if (error) console.error("Erreur vidage corbeille:", error);
    return !error;
  }
};

// Ingestion directe depuis le navigateur vers Supabase
  async ingestParsedEmail(rawEmail, analysis) {
    // 1. Insertion Email
    const { data: emailRecord, error: emailError } = await supabase
      .from("cm_emails")
      .insert({
        message_id: rawEmail.messageId,
        account_type: analysis.account_type || "professional",
        sender: rawEmail.sender,
        recipient: rawEmail.recipient,
        subject: rawEmail.subject,
        body_raw: rawEmail.bodyRaw,
        received_at: rawEmail.receivedAtISO,
        summary: analysis.summary,
        is_spam_or_low_priority: analysis.is_spam_or_low_priority,
        priority_score: analysis.priority_score,
        status: "active"
      })
      .select("id")
      .single();

    if (emailError) throw emailError;

    // 2. Insertion Chunks (Items) + Tags
    for (const item of analysis.items) {
      const { data: itemRecord, error: itemError } = await supabase
        .from("cm_items")
        .insert({
          email_id: emailRecord.id,
          type: item.type,
          title: item.title,
          content: item.content || null,
          verbatim: item.verbatim,
          due_date: item.due_date || null,
          start_time: item.start_time || null,
          end_time: item.end_time || null,
          reminder_date: item.reminder_date || null,
          status: "active"
        })
        .select("id")
        .single();

      if (itemError) continue;

      // Upsert Tags et liaisons
      for (const tag of (item.tags || [])) {
        const { data: tagRecord } = await supabase
          .from("cm_tags")
          .upsert({ name: tag.name.trim(), color_hex: tag.color_hex }, { onConflict: "name" })
          .select("id")
          .single();

        if (tagRecord) {
          await supabase
            .from("cm_item_tags")
            .upsert({ item_id: itemRecord.id, tag_id: tagRecord.id }, { onConflict: "item_id,tag_id" });
        }
      }
    }

    return true;
  }