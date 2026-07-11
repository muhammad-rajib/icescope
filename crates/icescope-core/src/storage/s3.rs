use crate::models::S3Settings;
use anyhow::{anyhow, Context};
use object_store::aws::AmazonS3Builder;
use object_store::ObjectStore;
use opendal::{Operator, Scheme};
use std::collections::{BTreeMap, HashMap};
use std::env;
use std::path::PathBuf;
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct S3WarehouseConfig {
    pub bucket: String,
    pub root: String,
    pub region: String,
    pub endpoint: Option<String>,
    pub path_style: bool,
    pub credentials: Option<AwsCredentials>,
}

#[derive(Debug, Clone)]
pub struct AwsCredentials {
    pub access_key_id: String,
    pub secret_access_key: String,
    pub session_token: Option<String>,
}

pub fn config_from_warehouse(
    warehouse_uri: &str,
    settings: Option<&S3Settings>,
) -> anyhow::Result<S3WarehouseConfig> {
    let (bucket, root) = parse_s3_uri(warehouse_uri)?;
    let region = settings
        .and_then(|settings| settings.region.clone())
        .or_else(|| env::var("AWS_REGION").ok())
        .or_else(|| env::var("AWS_DEFAULT_REGION").ok())
        .unwrap_or_else(|| "us-east-1".to_string());

    Ok(S3WarehouseConfig {
        bucket,
        root,
        region,
        endpoint: settings.and_then(|settings| settings.endpoint.clone()),
        path_style: settings.is_some_and(|settings| settings.path_style),
        credentials: resolve_credentials()?,
    })
}

pub fn opendal_operator(config: &S3WarehouseConfig) -> anyhow::Result<Operator> {
    let mut options = HashMap::new();
    options.insert("bucket".to_string(), config.bucket.clone());
    options.insert("root".to_string(), opendal_root(&config.root));
    options.insert("region".to_string(), config.region.clone());
    options.insert(
        "enable_virtual_host_style".to_string(),
        (!config.path_style).to_string(),
    );

    if let Some(endpoint) = &config.endpoint {
        options.insert("endpoint".to_string(), endpoint.clone());
    }

    if let Some(credentials) = &config.credentials {
        options.insert(
            "access_key_id".to_string(),
            credentials.access_key_id.clone(),
        );
        options.insert(
            "secret_access_key".to_string(),
            credentials.secret_access_key.clone(),
        );
        if let Some(session_token) = &credentials.session_token {
            options.insert("security_token".to_string(), session_token.clone());
        }
    }

    Operator::via_iter(Scheme::S3, options).context("failed to build OpenDAL S3 operator")
}

pub fn object_store(config: &S3WarehouseConfig) -> anyhow::Result<Arc<dyn ObjectStore>> {
    let mut builder = AmazonS3Builder::new()
        .with_bucket_name(&config.bucket)
        .with_region(&config.region)
        .with_virtual_hosted_style_request(!config.path_style);

    if let Some(endpoint) = &config.endpoint {
        builder = builder.with_endpoint(endpoint);
    }

    if let Some(credentials) = &config.credentials {
        builder = builder
            .with_access_key_id(&credentials.access_key_id)
            .with_secret_access_key(&credentials.secret_access_key);

        if let Some(session_token) = &credentials.session_token {
            builder = builder.with_token(session_token);
        }
    }

    Ok(Arc::new(builder.build()?))
}

fn parse_s3_uri(uri: &str) -> anyhow::Result<(String, String)> {
    let normalized = uri
        .strip_prefix("s3://")
        .or_else(|| uri.strip_prefix("s3a://"))
        .ok_or_else(|| anyhow!("S3 warehouse must start with s3:// or s3a://"))?;

    let mut parts = normalized.splitn(2, '/');
    let bucket = parts
        .next()
        .filter(|bucket| !bucket.is_empty())
        .ok_or_else(|| anyhow!("S3 warehouse URI is missing a bucket"))?
        .to_string();
    let root = parts.next().unwrap_or("").trim_matches('/').to_string();

    Ok((bucket, root))
}

fn opendal_root(root: &str) -> String {
    let trimmed = root.trim_matches('/');
    if trimmed.is_empty() {
        "/".to_string()
    } else {
        format!("/{trimmed}/")
    }
}

fn resolve_credentials() -> anyhow::Result<Option<AwsCredentials>> {
    if let (Ok(access_key_id), Ok(secret_access_key)) = (
        env::var("AWS_ACCESS_KEY_ID"),
        env::var("AWS_SECRET_ACCESS_KEY"),
    ) {
        return Ok(Some(AwsCredentials {
            access_key_id,
            secret_access_key,
            session_token: env::var("AWS_SESSION_TOKEN").ok(),
        }));
    }

    read_credentials_file()
}

fn read_credentials_file() -> anyhow::Result<Option<AwsCredentials>> {
    let path = env::var("AWS_SHARED_CREDENTIALS_FILE")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            let home = env::var("HOME").unwrap_or_default();
            PathBuf::from(home).join(".aws").join("credentials")
        });

    if !path.exists() {
        return Ok(None);
    }

    let profile = env::var("AWS_PROFILE").unwrap_or_else(|_| "default".to_string());
    let contents = std::fs::read_to_string(&path)
        .with_context(|| format!("failed to read AWS credentials file {}", path.display()))?;
    let sections = parse_ini_sections(&contents);
    let Some(values) = sections.get(&profile) else {
        return Ok(None);
    };

    let Some(access_key_id) = values.get("aws_access_key_id").cloned() else {
        return Ok(None);
    };
    let Some(secret_access_key) = values.get("aws_secret_access_key").cloned() else {
        return Ok(None);
    };

    Ok(Some(AwsCredentials {
        access_key_id,
        secret_access_key,
        session_token: values.get("aws_session_token").cloned(),
    }))
}

fn parse_ini_sections(contents: &str) -> BTreeMap<String, BTreeMap<String, String>> {
    let mut sections = BTreeMap::<String, BTreeMap<String, String>>::new();
    let mut current_section = "default".to_string();

    for raw_line in contents.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') || line.starts_with(';') {
            continue;
        }

        if line.starts_with('[') && line.ends_with(']') {
            current_section = line
                .trim_start_matches('[')
                .trim_end_matches(']')
                .trim()
                .to_string();
            continue;
        }

        if let Some((key, value)) = line.split_once('=') {
            sections
                .entry(current_section.clone())
                .or_default()
                .insert(key.trim().to_string(), value.trim().to_string());
        }
    }

    sections
}

#[cfg(test)]
mod tests {
    use super::{parse_ini_sections, parse_s3_uri};

    #[test]
    fn parses_s3_uri() {
        let (bucket, root) = parse_s3_uri("s3://bucket/path/to/warehouse").unwrap();
        assert_eq!(bucket, "bucket");
        assert_eq!(root, "path/to/warehouse");
    }

    #[test]
    fn parses_credentials_sections() {
        let sections = parse_ini_sections(
            r#"
            [default]
            aws_access_key_id = one
            aws_secret_access_key = two
            "#,
        );

        assert_eq!(sections["default"]["aws_access_key_id"], "one",);
    }
}
