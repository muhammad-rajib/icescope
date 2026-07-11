pub fn friendly_sql_error(error: &str) -> String {
    if error.contains("No field named") && error.contains('"') {
        return format!("{error}\nHint: use single quotes for string literals and double quotes only for identifiers.");
    }

    error.to_string()
}
