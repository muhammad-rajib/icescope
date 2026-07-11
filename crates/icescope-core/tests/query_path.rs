use icescope_core::engine::datafusion::parse_table_refs;

#[test]
fn parses_qualified_tables_without_catalog_scan() {
    let refs = parse_table_refs(
        r#"
        SELECT e.event_id, u.email
        FROM analytics.events e
        JOIN analytics.users u ON e.user_id = u.user_id
        "#,
    )
    .expect("table refs parse");

    let names = refs
        .iter()
        .map(|table_ref| format!("{}.{}", table_ref.namespace, table_ref.table))
        .collect::<Vec<_>>();

    assert_eq!(names, vec!["analytics.events", "analytics.users"]);
}
