import json
import os
import pandas as pd


def find_csv_file(base_dir, keyword):
    for file in os.listdir(base_dir):
        if file.lower().endswith('.csv') and keyword.lower() in file.lower():
            return os.path.join(base_dir, file)
    return None


def generate_dashboard_data():
    base_dir = os.path.dirname(os.path.abspath(__file__))

    users_csv = find_csv_file(base_dir, 'utilisateurs')
    reprises_csv = find_csv_file(base_dir, 'reprises')
    output_json = os.path.join(base_dir, 'data.json')

    df_users = pd.read_csv(users_csv, encoding='utf-8-sig')
    df_reprises = pd.read_csv(reprises_csv, encoding='utf-8-sig')

    df_users['date_inscription'] = pd.to_datetime(df_users['date_inscription'])
    df_reprises['date_reprise'] = pd.to_datetime(df_reprises['date_reprise'])

    df_users['month'] = (
        df_users['date_inscription'].dt.to_period('M').astype(str)
    )
    df_reprises['month'] = (
        df_reprises['date_reprise'].dt.to_period('M').astype(str)
    )

    # Joindre les reprises à la cohorte d'inscription de l'utilisateur
    df_merged = df_reprises.merge(
        df_users[['identifiant_utilisateur', 'month']],
        on='identifiant_utilisateur',
        how='left',
        suffixes=('', '_user'),
    )

    total_users = int(len(df_users))
    total_reprises = int(len(df_reprises))
    canceled_reprises = int((df_reprises['statut_reprise'] == 'canceled').sum())
    valid_reprises = total_reprises - canceled_reprises
    cancel_rate = round((canceled_reprises / total_reprises) * 100, 1)

    reprises_per_user_all = df_reprises.groupby(
        'identifiant_utilisateur'
    ).size()
    avg_reprises_per_active_user = round(
        float(reprises_per_user_all.mean()), 2
    )

    signups_monthly = df_users.groupby('month').size().to_dict()
    reprises_monthly = (
        df_reprises.groupby(['month', 'statut_reprise'])
        .size()
        .unstack(fill_value=0)
        .to_dict(orient='index')
    )
    reprises_by_channel_monthly = (
        df_reprises.groupby(['month', 'bol_reprise'])
        .size()
        .unstack(fill_value=0)
        .to_dict(orient='index')
    )

    # Ventilation des reprises par canal pour la COHORTE d'inscription du mois
    cohort_channel_summary = (
        df_merged.groupby(['month_user', 'bol_reprise'])
        .size()
        .unstack(fill_value=0)
        .to_dict(orient='index')
    )

    all_months = sorted(
        list(
            set(list(signups_monthly.keys()) + list(reprises_monthly.keys()))
        )
    )

    timeline = []
    for m in all_months:
        signup_cnt = int(signups_monthly.get(m, 0))
        rep_dict = reprises_monthly.get(m, {})
        canceled = int(rep_dict.get('canceled', 0))
        pending = int(rep_dict.get('pending', 0))
        draft = int(rep_dict.get('draft', 0))
        ended = int(rep_dict.get('ended', 0))
        valid = pending + draft + ended
        total_rep = canceled + valid

        channel_dict = {
            str(k): int(v)
            for k, v in reprises_by_channel_monthly.get(m, {}).items()
            if v > 0
        }
        cohort_dict = {
            str(k): int(v)
            for k, v in cohort_channel_summary.get(m, {}).items()
            if v > 0
        }

        timeline.append({
            'month': m,
            'signups': signup_cnt,
            'reprises_total': total_rep,
            'reprises_canceled': canceled,
            'reprises_valid': valid,
            'channels': channel_dict,
            'cohort_channels': cohort_dict,
        })

    channels = {
        str(k): int(v)
        for k, v in df_reprises['bol_reprise'].value_counts().to_dict().items()
    }
    statuses = {
        str(k): int(v)
        for k, v in df_reprises['statut_reprise']
        .value_counts()
        .to_dict()
        .items()
    }

    output_data = {
        'summary': {
            'total_users': total_users,
            'total_reprises': total_reprises,
            'valid_reprises': valid_reprises,
            'canceled_reprises': canceled_reprises,
            'cancel_rate': cancel_rate,
            'avg_reprises_per_active_user': avg_reprises_per_active_user,
        },
        'timeline': timeline,
        'channels': channels,
        'statuses': statuses,
    }

    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    generate_dashboard_data()