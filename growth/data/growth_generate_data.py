import json
import pandas as pd

def generate_tradein_data():
    print("1/5 - Chargement des fichiers CSV sources...")
    df_users = pd.read_csv('utilisateurs_bol_corrige.csv')
    df_reprises = pd.read_csv('reprises_bol_corrige.csv')

    # Nouveaux noms de colonnes issus de la nouvelle en-tête
    col_user_id = 'identifiant_utilisateur'
    col_channel_user = 'bol_compte'
    col_channel_reprise = 'bol_reprise'
    col_status_transaction = 'statut_transaction'
    col_status_metier = 'statut_metier'

    # Conversion des dates
    df_users['date_inscription'] = pd.to_datetime(df_users['date_inscription'])
    df_reprises['date_reprise'] = pd.to_datetime(df_reprises['date_reprise'])

    df_users['year'] = df_users['date_inscription'].dt.year.astype(str)
    df_users['month'] = df_users['date_inscription'].dt.strftime('%Y-%m')
    df_reprises['month'] = df_reprises['date_reprise'].dt.strftime('%Y-%m')
    df_reprises['year'] = df_reprises['date_reprise'].dt.year.astype(str)

    # Historique depuis 2020-01-01
    df_users = df_users[df_users['date_inscription'] >= '2020-01-01'].copy()
    df_reprises = df_reprises[df_reprises['date_reprise'] >= '2020-01-01'].copy()

    print("2/5 - Calcul des métriques annuelles par affilié...")
    yearly_stats = {}
    all_channels = sorted(list(set(df_reprises[col_channel_reprise].dropna().unique()).union(df_users[col_channel_user].dropna().unique())))
    all_years = sorted(list(set(df_users['year'].unique()).union(df_reprises['year'].unique())))

    for channel in all_channels:
        yearly_stats[channel] = {}

        users_in_channel = df_users[df_users[col_channel_user] == channel]
        reprises_in_channel = df_reprises[df_reprises[col_channel_reprise] == channel]

        for yr in all_years:
            signups_cnt = len(users_in_channel[users_in_channel['year'] == yr])
            reprises_year = reprises_in_channel[reprises_in_channel['year'] == yr]
            reprises_cnt = len(reprises_year)
            active_users_cnt = reprises_year[col_user_id].nunique()

            # [A045] Reprises validées : statut_metier == 'validee'
            if col_status_metier in reprises_year.columns:
                reprises_year_metier = reprises_year[col_status_metier].astype(str).str.lower().str.strip()
                valid_reprises_cnt = len(reprises_year[reprises_year_metier == 'validee'])
            else:
                valid_reprises_cnt = 0

            yearly_stats[channel][yr] = {
                "signups": signups_cnt,
                "reprises": reprises_cnt,
                "reprises_validated": valid_reprises_cnt,
                "users_with_reprise": active_users_cnt
            }

    print("3/5 - Préparation des données pour data.json...")
    user_reprises_map = df_reprises.groupby([col_user_id, col_channel_reprise]).size().unstack(fill_value=0).to_dict(orient='index')

    users_data_list = []
    for _, row in df_users.iterrows():
        u_id = row[col_user_id]
        users_data_list.append({
            "id": u_id,
            "date_inscription": row['date_inscription'].strftime('%Y-%m-%d'),
            "month": row['month'],
            "origin_channel": row[col_channel_user] if pd.notna(row[col_channel_user]) else "Direct / Inconnu",
            "channels": user_reprises_map.get(u_id, {})
        })

    all_months = sorted(list(set(df_users['month'].unique()).union(df_reprises['month'].unique())))
    timeline_list = []

    for m in all_months:
        signups_m = len(df_users[df_users['month'] == m])
        reprises_m = df_reprises[df_reprises['month'] == m]
        channels_m = reprises_m[col_channel_reprise].value_counts().to_dict()

        cohort_user_ids = df_users[df_users['month'] == m][col_user_id]
        cohort_reprises = df_reprises[df_reprises[col_user_id].isin(cohort_user_ids)]
        cohort_channels_m = cohort_reprises[col_channel_reprise].value_counts().to_dict()

        status_trans = reprises_m[col_status_transaction].astype(str).str.lower().str.strip() if col_status_transaction in reprises_m.columns else pd.Series('', index=reprises_m.index)
        is_canceled = status_trans.str.contains('cancel|annul', na=False)

        if col_status_metier in reprises_m.columns:
            is_valid = (reprises_m[col_status_metier].astype(str).str.lower().str.strip() == 'validee')
        else:
            is_valid = ~is_canceled

        timeline_list.append({
            "month": m,
            "signups": signups_m,
            "reprises_total": len(reprises_m),
            "reprises_canceled": int(is_canceled.sum()),
            "reprises_valid": int(is_valid.sum()),
            "channels": {k: int(v) for k, v in channels_m.items()},
            "cohort_channels": {k: int(v) for k, v in cohort_channels_m.items()}
        })

    total_reprises = len(df_reprises)
    canceled_reprises = int(df_reprises[col_status_transaction].astype(str).str.lower().str.contains('cancel|annul', na=False).sum()) if col_status_transaction in df_reprises.columns else 0
    cancel_rate = round((canceled_reprises / total_reprises * 100), 1) if total_reprises > 0 else 0.0

    summary_data = {
        "total_users": len(df_users),
        "total_reprises": total_reprises,
        "canceled_reprises": canceled_reprises,
        "cancel_rate": cancel_rate
    }

    channels_global = {k: int(v) for k, v in df_reprises[col_channel_reprise].value_counts().items()}

    final_output = {
        "summary": summary_data,
        "timeline": timeline_list,
        "channels": channels_global,
        "yearly_affiliate_stats": yearly_stats,
        "users_data": users_data_list
    }

    print("4/5 - Écriture dans data.json...")
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(final_output, f, ensure_ascii=False, indent=2)

    print("✅ data.json régénéré avec la nouvelle structure CSV !")

if __name__ == "__main__":
    generate_tradein_data()