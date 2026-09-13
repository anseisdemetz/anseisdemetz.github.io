import json
import glob
import os

def consolidate_json_files(file_patterns, output_file, deduplicate_by_key='idproduct'):
    """
    Consolide plusieurs fichiers JSON (résultats paginés) en un seul.
    
    :param file_patterns: Liste des chemins ou motifs glob (ex: ['response_*.json', 'file2.json'])
    :param output_file: Chemin du fichier JSON de sortie.
    :param deduplicate_by_key: Clé utilisée pour dédoublonner (ex: 'idproduct'). 
                               Mettre None pour ne pas dédoublonner.
    """
    # Résolution des fichiers matching les motifs passés
    matched_files = []
    if isinstance(file_patterns, str):
        file_patterns = [file_patterns]
        
    for pattern in file_patterns:
        matched_files.extend(glob.glob(pattern))
    
    # Éliminer les doublons dans la liste de fichiers et trier
    matched_files = sorted(list(set(matched_files)))
    
    if not matched_files:
        print("❌ Aucun fichier trouvé correspondant aux motifs spécifiés.")
        return

    print(f"📁 {len(matched_files)} fichier(s) trouvé(s) à consolider :")
    for f in matched_files:
        print(f"  - {f}")

    all_results = []
    seen_ids = set()
    base_structure = None

    for file_path in matched_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                # Conserver la structure de base du premier fichier (result_code, message, etc.)
                if base_structure is None:
                    base_structure = {
                        "result_code": data.get("result_code", "OK"),
                        "message": data.get("message", ""),
                        "metadata": data.get("metadata", {}).copy()
                    }
                
                # Extraction des résultats
                results = data.get("results", [])
                for item in results:
                    if deduplicate_by_key and deduplicate_by_key in item:
                        item_id = item[deduplicate_by_key]
                        if item_id not in seen_ids:
                            seen_ids.add(item_id)
                            all_results.append(item)
                    else:
                        all_results.append(item)
                        
        except Exception as e:
            print(f"⚠️ Erreur lors de la lecture de {file_path}: {e}")

    if base_structure is None:
        print("❌ Aucun contenu valide n'a pu être extrait.")
        return

    # Mise à jour des métadonnées pour refléter le fichier consolidé
    total_count = len(all_results)
    base_structure["metadata"]["page"] = 1
    base_structure["metadata"]["limit"] = total_count
    base_structure["metadata"]["after_page"] = False
    base_structure["metadata"]["before_page"] = False
    base_structure["metadata"]["total"] = total_count
    base_structure["metadata"]["results"] = total_count
    base_structure["results"] = all_results

    # Écriture du fichier consolidé
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(base_structure, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Consolidation terminée avec succès !")
    print(f"📊 Total des éléments regroupés : {total_count}")
    print(f"💾 Fichier généré : {output_file}")


# --- EXEMPLE D'UTILISATION ---
if __name__ == "__main__":
    # 1. Utilisation avec un motif glob (ex: tous les fichiers response_*.json dans le dossier courant)
    consolidate_json_files(
        file_patterns=["response_*.json"],
        output_file="consolidated_response.json",
        deduplicate_by_key="idproduct"  # Déduplique selon l'idproduct
    )

    # 2. Alternative : passer une liste explicite de fichiers
    # consolidate_json_files(
    #     file_patterns=["response_1.json", "response_2.json", "response_3.json"],
    #     output_file="consolidated_response.json"
    # )