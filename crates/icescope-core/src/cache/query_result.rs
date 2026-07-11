use crate::db::AppDb;
use crate::models::QueryPage;

pub fn get(
    db: &AppDb,
    connection_id: &str,
    sql: &str,
    page_size: usize,
    offset: usize,
) -> anyhow::Result<Option<QueryPage>> {
    db.get_query_result_cache(connection_id, sql, page_size, offset)
}

pub fn put(
    db: &AppDb,
    connection_id: &str,
    sql: &str,
    page_size: usize,
    offset: usize,
    page: &QueryPage,
) -> anyhow::Result<()> {
    db.put_query_result_cache(connection_id, sql, page_size, offset, page)
}
