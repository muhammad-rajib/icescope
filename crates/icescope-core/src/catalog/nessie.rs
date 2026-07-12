use crate::models::{ConnectionProfile, NamespaceInfo, RestCatalogSettings, TableInfo};

pub async fn list_namespaces(profile: &ConnectionProfile) -> anyhow::Result<Vec<NamespaceInfo>> {
    let rest_profile = as_rest_profile(profile);
    super::rest::list_namespaces(&rest_profile).await
}

pub async fn list_tables(
    profile: &ConnectionProfile,
    namespace: &str,
) -> anyhow::Result<Vec<TableInfo>> {
    let rest_profile = as_rest_profile(profile);
    super::rest::list_tables(&rest_profile, namespace).await
}

fn as_rest_profile(profile: &ConnectionProfile) -> ConnectionProfile {
    let mut profile = profile.clone();
    if let Some(nessie) = &profile.nessie {
        let mut url = nessie.url.trim_end_matches('/').to_string();
        if !url.ends_with("/iceberg") {
            url = format!("{url}/iceberg");
        }
        profile.rest = Some(RestCatalogSettings {
            url,
            warehouse: nessie.branch.clone(),
            token: nessie.token.clone(),
        });
    }
    profile
}
