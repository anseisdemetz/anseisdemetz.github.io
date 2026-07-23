import json
import re

def parse_markdown_file(filepath):
    """
    Lit un fichier Markdown et extrait le vocabulaire en identifiant 
    automatiquement la langue et la présence d'une colonne de prononciation.
    """
    vocabulary = []
    detected_lang = 'italian' # Par défaut si non spécifié
    has_pronunciation = False
    word_id = 1

    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    for line in lines:
        line = line.strip()
        
        # Détection des lignes de tableau
        if line.startswith('|') and not line.startswith('| :--'):
            parts = [p.strip() for p in line.split('|')[1:-1]]
            
            # 1. Analyse de la ligne d'en-tête pour détecter la structure
            if 'Français' in parts[0]:
                header_lang = parts[1].lower()
                if 'anglais' in header_lang:
                    detected_lang = 'english'
                elif 'italien' in header_lang:
                    detected_lang = 'italian'
                
                # Vérifie si une colonne prononciation existe
                has_pronunciation = any('prononciation' in p.lower() for p in parts)
                continue

            # 2. Extraction des données de vocabulaire
            if len(parts) >= 3:
                french = parts[0].replace('**', '').strip()
                term = parts[1].replace('**', '').strip()
                
                if has_pronunciation and len(parts) >= 4:
                    pronunciation = parts[2].strip()
                    sentence = parts[3].replace('**', '').strip()
                else:
                    pronunciation = ""
                    sentence = parts[2].replace('**', '').strip()

                # Ignorer la phrase si c'est un placeholder "//"
                if sentence == "//":
                    sentence = ""

                vocabulary.append({
                    "id": f"{detected_lang[:2]}_{word_id}",
                    "term": term,
                    "translation": french,
                    "pronunciation": pronunciation,
                    "sentence": sentence,
                    "mastered": False,
                    "source": filepath
                })
                word_id += 1

    return detected_lang, has_pronunciation, vocabulary


def update_vocabulary_db(md_filepath, db_filepath='vocabulary_db.json'):
    """
    Met à jour ou crée le fichier JSON global 'vocabulary_db.json'
    """
    # Charger la base existante ou initialiser la structure
    try:
        with open(db_filepath, 'r', encoding='utf-8') as f:
            db = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        db = {
            "languages": {
                "english": { "name": "Anglais", "code": "en", "flag": "🇬🇧", "has_pronunciation": True, "vocabulary": [] },
                "italian": { "name": "Italien", "code": "it", "flag": "🇮🇹", "has_pronunciation": False, "vocabulary": [] }
            }
        }

    # Extraire les données du fichier Markdown
    lang, has_pron, new_vocab = parse_markdown_file(md_filepath)

    # Inscription dans la bonne section de la base de données
    db["languages"][lang]["vocabulary"] = new_vocab
    db["languages"][lang]["has_pronunciation"] = has_pron

    # Sauvegarde du fichier JSON
    with open(db_filepath, 'w', encoding='utf-8') as f:
        json.dump(db, f, ensure_ascii=False, indent=2)

    print(f"✅ Succès : {len(new_vocab)} mots ajoutés à la liste [{db['languages'][lang]['name']}] dans '{db_filepath}' !")


# --- EXEMPLE D'UTILISATION ---
# Pour charger votre fichier italien :
update_vocabulary_db('mots_italiens.md')