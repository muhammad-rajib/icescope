use crate::models::{ConnectionProfile, QueryPage, StorageType};
use anyhow::anyhow;

pub async fn execute_page(
    profile: &ConnectionProfile,
    _sql: &str,
    _page_size: usize,
    _offset: usize,
) -> anyhow::Result<QueryPage> {
    if !matches!(profile.storage_type, StorageType::S3) {
        return Err(anyhow!("Athena requires an S3 warehouse connection"));
    }

    let Some(athena) = &profile.athena else {
        return Err(anyhow!("Athena settings are required for this connection"));
    };

    if athena.database.as_deref().unwrap_or_default().is_empty()
        || athena
            .output_location
            .as_deref()
            .unwrap_or_default()
            .is_empty()
    {
        return Err(anyhow!(
            "Athena database and S3 output location are required before running queries"
        ));
    }

    Err(anyhow!(
        "Athena query execution is routed but not enabled in this build yet. Configure the AWS Athena SDK executor to run this query in AWS."
    ))
}
