use icescope_core::overview;
use icescope_core::{CatalogType, ConnectionProfile, QueryEngine, StorageType};

#[test]
fn local_fixture_overview_reports_tables() {
    let warehouse = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .join("tests/fixtures/warehouse");
    let profile = ConnectionProfile {
        id: "sample".to_string(),
        name: "Sample".to_string(),
        warehouse_path: warehouse.to_string_lossy().to_string(),
        storage_type: StorageType::Local,
        catalog_type: CatalogType::Hadoop,
        query_engine: QueryEngine::Datafusion,
        s3: None,
        rest: None,
        glue: None,
        hive: None,
        nessie: None,
        athena: None,
    };

    let summary = overview::get_overview(&profile).expect("overview loads");
    let table_names = summary
        .tables
        .iter()
        .map(|row| format!("{}.{}", row.namespace, row.table))
        .collect::<Vec<_>>();

    assert_eq!(summary.table_count, 2);
    assert_eq!(summary.record_count, 5);
    assert!(summary.total_size_bytes > 0);
    assert!(table_names.contains(&"analytics.events".to_string()));
    assert!(table_names.contains(&"analytics.users".to_string()));
}
