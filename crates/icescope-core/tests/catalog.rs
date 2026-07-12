#[test]
fn local_catalog_lists_namespaced_fixture_tables() {
    use icescope_core::{catalog, ConnectionProfile, QueryEngine, StorageType};

    let profile = ConnectionProfile {
        id: "fixture".to_string(),
        name: "Fixture".to_string(),
        warehouse_path: format!(
            "{}/../../tests/fixtures/warehouse",
            env!("CARGO_MANIFEST_DIR")
        ),
        storage_type: StorageType::Local,
        query_engine: QueryEngine::Datafusion,
        s3: None,
        athena: None,
    };

    let namespaces = catalog::list_namespaces(&profile).expect("namespaces list");
    assert_eq!(
        namespaces
            .iter()
            .map(|item| item.name.as_str())
            .collect::<Vec<_>>(),
        vec!["analytics"]
    );

    let tables = catalog::list_tables(&profile, "analytics").expect("tables list");
    assert_eq!(
        tables
            .iter()
            .map(|item| item.name.as_str())
            .collect::<Vec<_>>(),
        vec!["events", "users"]
    );
}

#[test]
fn local_catalog_lists_root_tables_as_default_namespace() {
    use icescope_core::catalog::local;
    use std::fs;

    let warehouse =
        std::env::temp_dir().join(format!("icescope-root-catalog-{}", std::process::id()));
    let table_metadata = warehouse.join("customers").join("metadata");
    fs::create_dir_all(&table_metadata).expect("metadata dir");
    fs::write(table_metadata.join("v1.metadata.json"), "{}").expect("metadata file");

    let namespaces = local::list_namespaces(&warehouse).expect("namespaces list");
    assert_eq!(
        namespaces[0].name,
        warehouse.file_name().unwrap().to_string_lossy()
    );

    let tables = local::list_tables(&warehouse, &namespaces[0].name).expect("tables list");
    assert_eq!(tables[0].name, "customers");

    fs::remove_dir_all(warehouse).expect("cleanup");
}

#[test]
fn connection_profiles_round_trip_through_sqlite() {
    use icescope_core::db::AppDb;
    use icescope_core::{ConnectionProfile, QueryEngine, StorageType};

    let db = AppDb::in_memory().expect("database opens");
    let profile = ConnectionProfile {
        id: "local-dev".to_string(),
        name: "Local Dev".to_string(),
        warehouse_path: "/tmp/warehouse".to_string(),
        storage_type: StorageType::Local,
        query_engine: QueryEngine::Datafusion,
        s3: None,
        athena: None,
    };

    db.save_connection(&profile).expect("connection saves");

    let profiles = db.list_connections().expect("connections list");
    assert_eq!(profiles.len(), 1);
    assert_eq!(profiles[0].id, profile.id);

    db.delete_connection(&profile.id)
        .expect("connection deletes");

    let profiles = db.list_connections().expect("connections list");
    assert!(profiles.is_empty());
}

#[test]
fn metadata_and_query_caches_invalidate_with_connection() {
    use icescope_core::cache::CacheKind;
    use icescope_core::db::AppDb;
    use icescope_core::{ConnectionProfile, QueryEngine, QueryPage, StorageType};
    use std::collections::BTreeMap;

    let db = AppDb::in_memory().expect("database opens");
    let profile = ConnectionProfile {
        id: "local-dev".to_string(),
        name: "Local Dev".to_string(),
        warehouse_path: "/tmp/warehouse".to_string(),
        storage_type: StorageType::Local,
        query_engine: QueryEngine::Datafusion,
        s3: None,
        athena: None,
    };
    let page = QueryPage {
        columns: vec!["status".to_string()],
        rows: vec![BTreeMap::new()],
        page_size: 50,
        offset: 0,
        has_more: false,
    };

    db.save_connection(&profile).expect("connection saves");
    db.put_metadata_cache(
        &profile.id,
        CacheKind::Namespaces,
        "all",
        &vec!["analytics"],
    )
    .expect("metadata cache stores");
    db.put_query_result_cache(&profile.id, "SELECT 1", 50, 0, &page)
        .expect("query cache stores");

    let namespaces = db
        .get_metadata_cache::<Vec<String>>(&profile.id, CacheKind::Namespaces, "all")
        .expect("metadata cache reads");
    assert_eq!(namespaces, Some(vec!["analytics".to_string()]));
    assert!(db
        .get_query_result_cache(&profile.id, "SELECT 1", 50, 0)
        .expect("query cache reads")
        .is_some());

    db.delete_connection(&profile.id)
        .expect("connection deletes");

    assert!(db
        .get_metadata_cache::<Vec<String>>(&profile.id, CacheKind::Namespaces, "all")
        .expect("metadata cache reads")
        .is_none());
    assert!(db
        .get_query_result_cache(&profile.id, "SELECT 1", 50, 0)
        .expect("query cache reads")
        .is_none());
}
