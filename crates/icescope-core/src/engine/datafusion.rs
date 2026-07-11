use crate::engine::pruning;
use crate::iceberg::scan;
use crate::models::{ConnectionProfile, QueryPage, SnapshotScanResult, StorageType};
use anyhow::{anyhow, Context};
use arrow::array::Array;
use arrow::record_batch::RecordBatch;
use arrow::util::display::array_value_to_string;
use datafusion::datasource::file_format::parquet::ParquetFormat;
use datafusion::datasource::listing::{
    ListingOptions, ListingTable, ListingTableConfig, ListingTableUrl,
};
use datafusion::prelude::SessionContext;
use regex::Regex;
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};
use std::path::PathBuf;
use std::sync::Arc;

pub async fn execute_page(
    profile: &ConnectionProfile,
    snapshot_scans: Option<&BTreeMap<String, SnapshotScanResult>>,
    sql: &str,
    page_size: usize,
    offset: usize,
) -> anyhow::Result<QueryPage> {
    if !matches!(profile.storage_type, StorageType::Local) {
        return Err(anyhow!(
            "DataFusion local queries currently require a local connection"
        ));
    }

    let bounded_page_size = page_size.clamp(50, 1000);
    let warehouse = resolve_warehouse_path(&profile.warehouse_path)?;
    let table_refs = find_table_refs(sql)?;
    let ctx = SessionContext::new();

    for table_ref in &table_refs {
        let table_key = format!("{}.{}", table_ref.namespace, table_ref.table);
        let scan = if let Some(scan) = snapshot_scans.and_then(|scans| scans.get(&table_key)) {
            scan.clone()
        } else {
            scan::current_snapshot_data_files(&warehouse, &table_ref.namespace, &table_ref.table)?
        };
        let (files, stats) = pruning::prune_files(sql, scan.files);
        eprintln!(
            "IceScope pruning {table_key}: before={} after={} pruned={}",
            stats.before, stats.after, stats.pruned
        );
        let parquet_files = files
            .iter()
            .map(|file| file.file_path.clone())
            .collect::<Vec<_>>();
        register_parquet_files(&ctx, &table_ref.engine_name(), parquet_files).await?;
    }

    let rewritten_sql = inject_limit_offset(
        &rewrite_table_names(sql, &table_refs),
        bounded_page_size + 1,
        offset,
    );
    let dataframe = ctx.sql(&rewritten_sql).await?;
    let batches = dataframe.collect().await?;
    let (columns, mut rows) = batches_to_rows(&batches)?;
    let has_more = rows.len() > bounded_page_size;
    rows.truncate(bounded_page_size);

    Ok(QueryPage {
        columns,
        rows,
        page_size: bounded_page_size,
        offset,
        has_more,
    })
}

#[derive(Debug, Clone, Eq, PartialEq, Ord, PartialOrd)]
pub struct ParsedTableRef {
    pub namespace: String,
    pub table: String,
}

impl ParsedTableRef {
    fn engine_name(&self) -> String {
        format!("{}_{}", self.namespace, self.table)
    }
}

async fn register_parquet_files(
    ctx: &SessionContext,
    table_name: &str,
    parquet_files: Vec<String>,
) -> anyhow::Result<()> {
    if parquet_files.is_empty() {
        return Err(anyhow!(
            "No current-snapshot parquet files found for {table_name}"
        ));
    }

    let table_paths = parquet_files
        .iter()
        .map(ListingTableUrl::parse)
        .collect::<Result<Vec<_>, _>>()?;
    let listing_options = ListingOptions::new(Arc::new(ParquetFormat::default()))
        .with_file_extension(".parquet")
        .with_collect_stat(false);
    let schema = listing_options
        .infer_schema(&ctx.state(), &table_paths[0])
        .await
        .with_context(|| format!("failed to infer schema from first parquet for {table_name}"))?;
    let config = ListingTableConfig::new_with_multi_paths(table_paths)
        .with_listing_options(listing_options)
        .with_schema(schema);
    let table = ListingTable::try_new(config)?;

    ctx.register_table(table_name, Arc::new(table))
        .with_context(|| format!("failed to register parquet table {table_name}"))?;

    Ok(())
}

fn resolve_warehouse_path(warehouse_path: &str) -> anyhow::Result<PathBuf> {
    let path = PathBuf::from(warehouse_path);
    if path.is_absolute() {
        return Ok(path);
    }

    Ok(std::env::current_dir()?.join(path))
}

pub fn parse_table_refs(sql: &str) -> anyhow::Result<Vec<ParsedTableRef>> {
    let regex = Regex::new(r#"(?i)\b(?:from|join)\s+([a-zA-Z_][\w]*)\.([a-zA-Z_][\w]*)\b"#)?;
    let refs = regex
        .captures_iter(sql)
        .map(|captures| ParsedTableRef {
            namespace: captures[1].to_string(),
            table: captures[2].to_string(),
        })
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect::<Vec<_>>();

    if refs.is_empty() {
        return Err(anyhow!(
            "No Iceberg tables found. Use qualified table names like analytics.events."
        ));
    }

    Ok(refs)
}

fn find_table_refs(sql: &str) -> anyhow::Result<Vec<ParsedTableRef>> {
    parse_table_refs(sql)
}

fn rewrite_table_names(sql: &str, table_refs: &[ParsedTableRef]) -> String {
    table_refs
        .iter()
        .fold(sql.to_string(), |rewritten, table_ref| {
            let pattern = format!(
                r#"(?i)\b{}\s*\.\s*{}\b"#,
                regex::escape(&table_ref.namespace),
                regex::escape(&table_ref.table)
            );
            Regex::new(&pattern)
                .map(|regex| {
                    regex
                        .replace_all(&rewritten, table_ref.engine_name())
                        .to_string()
                })
                .unwrap_or(rewritten)
        })
}

fn inject_limit_offset(sql: &str, limit: usize, offset: usize) -> String {
    let trimmed = sql.trim().trim_end_matches(';').trim();
    let has_limit = Regex::new(r"(?i)\blimit\b")
        .map(|regex| regex.is_match(trimmed))
        .unwrap_or(false);
    let has_offset = Regex::new(r"(?i)\boffset\b")
        .map(|regex| regex.is_match(trimmed))
        .unwrap_or(false);

    match (has_limit, has_offset) {
        (true, true) => trimmed.to_string(),
        (true, false) if offset > 0 => format!("{trimmed} OFFSET {offset}"),
        (true, false) => trimmed.to_string(),
        (false, true) => format!("{trimmed} LIMIT {limit}"),
        (false, false) => format!("{trimmed} LIMIT {limit} OFFSET {offset}"),
    }
}

fn batches_to_rows(
    batches: &[RecordBatch],
) -> anyhow::Result<(Vec<String>, Vec<BTreeMap<String, Value>>)> {
    let Some(first_batch) = batches.first() else {
        return Ok((Vec::new(), Vec::new()));
    };

    let columns = first_batch
        .schema()
        .fields()
        .iter()
        .map(|field| field.name().to_string())
        .collect::<Vec<_>>();

    let mut rows = Vec::new();

    for batch in batches {
        for row_index in 0..batch.num_rows() {
            let mut row = BTreeMap::new();

            for (column_index, column_name) in columns.iter().enumerate() {
                let array = batch.column(column_index);
                row.insert(column_name.clone(), array_value(array.as_ref(), row_index)?);
            }

            rows.push(row);
        }
    }

    Ok((columns, rows))
}

fn array_value(array: &dyn Array, row_index: usize) -> anyhow::Result<Value> {
    if array.is_null(row_index) {
        return Ok(Value::Null);
    }

    Ok(Value::String(array_value_to_string(array, row_index)?))
}

#[cfg(test)]
mod tests {
    use super::{inject_limit_offset, rewrite_table_names, ParsedTableRef};

    #[test]
    fn rewrites_qualified_table_names() {
        let sql = "SELECT * FROM analytics.events JOIN analytics.users ON true";
        let refs = vec![
            ParsedTableRef {
                namespace: "analytics".to_string(),
                table: "events".to_string(),
            },
            ParsedTableRef {
                namespace: "analytics".to_string(),
                table: "users".to_string(),
            },
        ];

        assert_eq!(
            rewrite_table_names(sql, &refs),
            "SELECT * FROM analytics_events JOIN analytics_users ON true"
        );
    }

    #[test]
    fn injects_limit_and_offset_when_missing() {
        assert_eq!(
            inject_limit_offset("SELECT * FROM analytics_events", 51, 50),
            "SELECT * FROM analytics_events LIMIT 51 OFFSET 50"
        );
    }
}
