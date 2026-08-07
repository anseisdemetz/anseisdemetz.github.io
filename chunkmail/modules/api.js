import { supabase } from "../config/supabase.js";

export const API = {
  // 1. Récupérer les morceaux (items) filtrés avec leurs tags et l'email associé
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

    // Filtrage par tag si sélectionné
    if (tagId) {
      return data.filter(item => 
        item.cm_item_tags.some(it => it.cm_tags.id === tagId)
      );
    }

    return data;
  },

  // 2. Récupérer uniquement les tags associés à au moins un morceau ACTIF
    async getTags() {
      const { data, error } = await supabase
        .from("cm_item_tags")
        .select(`
          cm_tags(*),
          cm_items!inner(status)
        `)
        .eq("cm_items.status", "active");

      if (error) {
        console.error("Erreur récupération tags:", error);
        return [];
      }

      // Déduplication des tags uniques
      const uniqueTagsMap = new Map();
      (data || []).forEach(row => {
        if (row.cm_tags && !uniqueTagsMap.has(row.cm_tags.id)) {
          uniqueTagsMap.set(row.cm_tags.id, row.cm_tags);
        }
      });

      return Array.from(uniqueTagsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    },

  // 3. Mettre un morceau à la corbeille ou le restaurer
  async updateItemStatus(itemId, newStatus) {
    const { error } = await supabase
      .from("cm_items")
      .update({ status: newStatus })
      .eq("id", itemId);
    
    if (error) console.error("Erreur changement statut:", error);
    return !error;
  },

  // 4. Vider définitivement la corbeille
  async emptyTrash() {
    const { error } = await supabase
      .from("cm_items")
      .delete()
      .eq("status", "trashed");
      
    if (error) console.error("Erreur vidage corbeille:", error);
    return !error;
  },

  // 5. Ingestion directe d'un email analysé vers Supabase (cm_emails, cm_items, cm_tags, cm_item_tags)
  async ingestParsedEmail(rawEmail, analysis) {
    // A. Insertion de l'Email Source
    const { data: emailRecord, error: emailError } = await supabase
      .from("cm_emails")
      .insert({
        message_id: rawEmail.messageId,
        account_type: analysis.account_type || "professional",
        sender: rawEmail.sender,
        recipient: rawEmail.recipient || null,
        subject: rawEmail.subject || "(Sans objet)",
        body_raw: rawEmail.bodyRaw,
        received_at: rawEmail.receivedAtISO,
        summary: analysis.summary,
        is_spam_or_low_priority: analysis.is_spam_or_low_priority || false,
        priority_score: analysis.priority_score || 3,
        status: "active"
      })
      .select("id")
      .single();

    if (emailError) {
      console.error("Erreur insertion cm_emails:", emailError);
      throw emailError;
    }

    // B. Insertion des Morceaux (Items) + Tags
    for (const item of (analysis.items || [])) {
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

      if (itemError) {
        console.error("Erreur insertion cm_items:", itemError);
        continue;
      }

      // Upsert des Tags et création des liaisons
      for (const tag of (item.tags || [])) {
        const { data: tagRecord, error: tagError } = await supabase
          .from("cm_tags")
          .upsert({ name: tag.name.trim(), color_hex: tag.color_hex }, { onConflict: "name" })
          .select("id")
          .single();

        if (tagRecord && !tagError) {
          await supabase
            .from("cm_item_tags")
            .upsert({ item_id: itemRecord.id, tag_id: tagRecord.id }, { onConflict: "item_id,tag_id" });
        }
      }
    }

    return true;
  }
};