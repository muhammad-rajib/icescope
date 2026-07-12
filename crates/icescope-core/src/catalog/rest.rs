use crate::models::{ConnectionProfile, NamespaceInfo, RestCatalogSettings, TableInfo};
use anyhow::{anyhow, Context};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use serde::Deserialize;

pub async fn list_namespaces(profile: &ConnectionProfile) -> anyhow::Result<Vec<NamespaceInfo>> {
    let settings = rest_settings(profile)?;
    let client = client(settings)?;
    let url = catalog_url(settings, "namespaces");
    let response = client
        .get(url)
        .send()
        .await?
        .error_for_status()?
        .json::<NamespacesResponse>()
        .await?;

    let mut namespaces = response
        .namespaces
        .into_iter()
        .map(|parts| NamespaceInfo {
            name: parts.join("."),
        })
        .collect::<Vec<_>>();
    namespaces.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(namespaces)
}

pub async fn list_tables(
    profile: &ConnectionProfile,
    namespace: &str,
) -> anyhow::Result<Vec<TableInfo>> {
    let settings = rest_settings(profile)?;
    let client = client(settings)?;
    let namespace_path = namespace
        .split('.')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("%1F");
    let url = catalog_url(settings, &format!("namespaces/{namespace_path}/tables"));
    let response = client
        .get(url)
        .send()
        .await?
        .error_for_status()?
        .json::<TablesResponse>()
        .await?;

    let mut tables = response
        .identifiers
        .into_iter()
        .map(|identifier| TableInfo {
            namespace: identifier.namespace.join("."),
            name: identifier.name,
        })
        .collect::<Vec<_>>();
    tables.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(tables)
}

fn rest_settings(profile: &ConnectionProfile) -> anyhow::Result<&RestCatalogSettings> {
    profile
        .rest
        .as_ref()
        .ok_or_else(|| anyhow!("REST catalog settings are required"))
}

fn client(settings: &RestCatalogSettings) -> anyhow::Result<reqwest::Client> {
    let mut headers = HeaderMap::new();
    if let Some(token) = settings.token.as_deref().filter(|token| !token.is_empty()) {
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {token}"))
                .context("REST catalog token contains invalid header characters")?,
        );
    }

    Ok(reqwest::Client::builder()
        .default_headers(headers)
        .build()?)
}

fn catalog_url(settings: &RestCatalogSettings, path: &str) -> String {
    let base = settings.url.trim_end_matches('/');
    let path = path.trim_start_matches('/');
    match settings
        .warehouse
        .as_deref()
        .map(str::trim)
        .filter(|warehouse| !warehouse.is_empty())
    {
        Some(prefix) => format!("{base}/v1/{}/{path}", prefix.trim_matches('/')),
        None => format!("{base}/v1/{path}"),
    }
}

#[derive(Debug, Deserialize)]
struct NamespacesResponse {
    namespaces: Vec<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct TablesResponse {
    identifiers: Vec<TableIdentifier>,
}

#[derive(Debug, Deserialize)]
struct TableIdentifier {
    namespace: Vec<String>,
    name: String,
}
