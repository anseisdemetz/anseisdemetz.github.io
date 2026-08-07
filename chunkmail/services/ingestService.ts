import { createClient } from "@supabase/supabase-js";

// Types des données d'entrée
export interface RawEmailInput {
  messageId: string;
  sender: string;
  recipient?: string;
  subject?: string;
  bodyRaw: string;
  receivedAtISO: string;
}

export interface TagExtraction {
  name: string;
  color_hex: string;
}

export interface ChunkItemExtraction {
  type: "action" | "event" | "note" | "spam_low_priority";
  title: string;
  content?: string;
  verbatim: string;
  due_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  reminder_date?: string | null;
  tags: TagExtraction[];
}

export interface GeminiAnalysisResult {
  account_type: "personal" | "professional";
  summary: string;
  is_spam_or_low_priority: boolean;
  priority_score: number;
  items: ChunkItemExtraction[];
}

// Client Supabase (Utilise la clé SERVICE_ROLE pour contourner le RLS en écriture backend)
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Insère l'email, ses morceaux découpés, les tags et leurs liaisons dans Supabase.
 */
export async function ingestEmailAndChunks(
  rawEmail: RawEmailInput,
  analysis: GeminiAnalysisResult
): Promise<{ emailId: string; itemsInserted: number }> {
  try {
    // 1. Insertion de l'e-mail source dans cm_emails
    const { data: emailRecord, error: emailError } = await supabase
      .from("cm_emails")
      .insert({
        message_id: rawEmail.messageId,
        account_type: analysis.account_type,
        sender: rawEmail.sender,
        recipient: rawEmail.recipient || null,
        subject: rawEmail.subject || "(Sans objet)",
        body_raw: rawEmail.bodyRaw,
        received_at: rawEmail.receivedAtISO,
        summary: analysis.summary,
        is_spam_or_low_priority: analysis.is_spam_or_low_priority,
        priority_score: analysis.priority_score,
        status: "active",
      })
      .select("id")
      .single();

    if (emailError || !emailRecord) {
      throw new Error(`Erreur lors de l'insertion de l'email : ${emailError?.message}`);
    }

    const emailId = emailRecord.id;
    let itemsInsertedCount = 0;

    // 2. Traitement et insertion de chaque morceau (chunk)
    for (const item of analysis.items) {
      const { data: itemRecord, error: itemError } = await supabase
        .from("cm_items")
        .insert({
          email_id: emailId,
          type: item.type,
          title: item.title,
          content: item.content || null,
          verbatim: item.verbatim,
          due_date: item.due_date || null,
          start_time: item.start_time || null,
          end_time: item.end_time || null,
          reminder_date: item.reminder_date || null,
          status: "active",
        })
        .select("id")
        .single();

      if (itemError || !itemRecord) {
        console.error(`Erreur d'insertion du morceau "${item.title}":`, itemError?.message);
        continue;
      }

      const itemId = itemRecord.id;
      itemsInsertedCount++;

      // 3. Gestion des Tags (Upsert dans cm_tags) et création des liaisons
      for (const tag of item.tags) {
        // Upsert : Crée le tag s'il n'existe pas, ou met à jour sa couleur s'il existe déjà
        const { data: tagRecord, error: tagError } = await supabase
          .from("cm_tags")
          .upsert(
            {
              name: tag.name.trim(),
              color_hex: tag.color_hex,
            },
            { onConflict: "name" }
          )
          .select("id")
          .single();

        if (tagError || !tagRecord) {
          console.error(`Erreur d'upsert du tag "${tag.name}":`, tagError?.message);
          continue;
        }

        // Insertion dans la table de jonction cm_item_tags
        const { error: relationError } = await supabase
          .from("cm_item_tags")
          .upsert(
            {
              item_id: itemId,
              tag_id: tagRecord.id,
            },
            { onConflict: "item_id,tag_id" }
          );

        if (relationError) {
          console.error(`Erreur de liaison item/tag:`, relationError.message);
        }
      }
    }

    return { emailId, itemsInserted: itemsInsertedCount };
  } catch (err) {
    console.error("Échec global de l'ingestion ChunkMail :", err);
    throw err;
  }
}