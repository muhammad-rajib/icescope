use icescope_core::catalog;
use icescope_core::{ConnectionProfile, QueryEngine, S3Settings, StorageType};

#[tokio::test]
#[ignore = "requires MinIO at localhost:9000 and AWS-style credentials"]
async fn minio_s3_catalog_lists_namespaces_and_tables() {
    std::env::set_var("AWS_ACCESS_KEY_ID", "minioadmin");
    std::env::set_var("AWS_SECRET_ACCESS_KEY", "minioadmin");
    std::env::set_var("AWS_REGION", "us-east-1");

    let profile = ConnectionProfile {
        id: "minio".to_string(),
        name: "MinIO".to_string(),
        warehouse_path: "s3://icescope/warehouse".to_string(),
        storage_type: StorageType::S3,
        query_engine: QueryEngine::Datafusion,
        s3: Some(S3Settings {
            region: Some("us-east-1".to_string()),
            endpoint: Some("http://127.0.0.1:9000".to_string()),
            path_style: true,
        }),
        athena: None,
    };

    seed_minio_fixture(&profile).await;

    let namespaces = catalog::list_namespaces(&profile).expect("namespaces list");
    let tables = catalog::list_tables(&profile, "analytics").expect("tables list");

    assert!(namespaces
        .iter()
        .any(|namespace| namespace.name == "analytics"));
    assert!(tables.iter().any(|table| table.name == "events"));
}

async fn seed_minio_fixture(profile: &ConnectionProfile) {
    use icescope_core::storage::s3::{config_from_warehouse, opendal_operator};

    let config = config_from_warehouse(&profile.warehouse_path, profile.s3.as_ref())
        .expect("s3 config builds");
    let op = opendal_operator(&config).expect("operator builds");

    op.create_dir("analytics/events/metadata/")
        .await
        .expect("metadata dir creates");
    op.write("analytics/events/metadata/v1.metadata.json", "{}")
        .await
        .expect("metadata writes");
}
