use crate::models::DataFileRecord;
use regex::Regex;
use serde_json::Value;

#[derive(Debug, Clone, Copy)]
pub struct PruneStats {
    pub before: usize,
    pub after: usize,
    pub pruned: usize,
}

#[derive(Debug, Clone)]
struct Predicate {
    column: String,
    op: PredicateOp,
    value: Value,
}

#[derive(Debug, Clone, Copy)]
enum PredicateOp {
    Eq,
    Lt,
    Lte,
    Gt,
    Gte,
}

pub fn prune_files(sql: &str, files: Vec<DataFileRecord>) -> (Vec<DataFileRecord>, PruneStats) {
    let before = files.len();
    let predicates = extract_predicates(sql);

    if predicates.is_empty() {
        return (
            files,
            PruneStats {
                before,
                after: before,
                pruned: 0,
            },
        );
    }

    let files = files
        .into_iter()
        .filter(|file| {
            predicates
                .iter()
                .all(|predicate| file_may_match(file, predicate))
        })
        .collect::<Vec<_>>();
    let after = files.len();

    (
        files,
        PruneStats {
            before,
            after,
            pruned: before.saturating_sub(after),
        },
    )
}

fn extract_predicates(sql: &str) -> Vec<Predicate> {
    let Some(where_clause) = sql.split_once_where() else {
        return Vec::new();
    };

    let Ok(regex) = Regex::new(
        r#"(?i)\b([a-zA-Z_][\w]*)\s*(=|<=|>=|<|>)\s*('([^']*)'|"([^"]*)"|[0-9]+(?:\.[0-9]+)?)"#,
    ) else {
        return Vec::new();
    };

    regex
        .captures_iter(where_clause)
        .filter_map(|captures| {
            let column = captures.get(1)?.as_str().to_string();
            let op = match captures.get(2)?.as_str() {
                "=" => PredicateOp::Eq,
                "<" => PredicateOp::Lt,
                "<=" => PredicateOp::Lte,
                ">" => PredicateOp::Gt,
                ">=" => PredicateOp::Gte,
                _ => return None,
            };
            let raw_value = captures.get(3)?.as_str();
            let value = parse_literal(raw_value);

            Some(Predicate { column, op, value })
        })
        .collect()
}

fn file_may_match(file: &DataFileRecord, predicate: &Predicate) -> bool {
    if let Some(partition_value) = lookup_value(&file.partition_values, &predicate.column) {
        return predicate_matches_value(predicate, partition_value);
    }

    let lower = lookup_value(&file.lower_bounds, &predicate.column);
    let upper = lookup_value(&file.upper_bounds, &predicate.column);

    match predicate.op {
        PredicateOp::Eq => {
            if let Some(lower) = lower {
                if compare_json(&predicate.value, lower).is_some_and(|ordering| ordering.is_lt()) {
                    return false;
                }
            }
            if let Some(upper) = upper {
                if compare_json(&predicate.value, upper).is_some_and(|ordering| ordering.is_gt()) {
                    return false;
                }
            }
            true
        }
        PredicateOp::Lt => lower
            .and_then(|lower| compare_json(lower, &predicate.value))
            .map_or(true, |ordering| ordering.is_lt()),
        PredicateOp::Lte => lower
            .and_then(|lower| compare_json(lower, &predicate.value))
            .map_or(true, |ordering| ordering.is_le()),
        PredicateOp::Gt => upper
            .and_then(|upper| compare_json(upper, &predicate.value))
            .map_or(true, |ordering| ordering.is_gt()),
        PredicateOp::Gte => upper
            .and_then(|upper| compare_json(upper, &predicate.value))
            .map_or(true, |ordering| ordering.is_ge()),
    }
}

fn predicate_matches_value(predicate: &Predicate, value: &Value) -> bool {
    let Some(ordering) = compare_json(value, &predicate.value) else {
        return true;
    };

    match predicate.op {
        PredicateOp::Eq => ordering.is_eq(),
        PredicateOp::Lt => ordering.is_lt(),
        PredicateOp::Lte => ordering.is_le(),
        PredicateOp::Gt => ordering.is_gt(),
        PredicateOp::Gte => ordering.is_ge(),
    }
}

fn lookup_value<'a>(
    map: &'a std::collections::BTreeMap<String, Value>,
    column: &str,
) -> Option<&'a Value> {
    map.get(column)
        .or_else(|| map.get(&column.to_ascii_lowercase()))
        .or_else(|| map.get(&column.to_ascii_uppercase()))
}

fn compare_json(left: &Value, right: &Value) -> Option<std::cmp::Ordering> {
    match (left, right) {
        (Value::Number(left), Value::Number(right)) => left.as_f64()?.partial_cmp(&right.as_f64()?),
        (Value::String(left), Value::String(right)) => Some(left.cmp(right)),
        (Value::String(left), Value::Number(right)) => {
            left.parse::<f64>().ok()?.partial_cmp(&right.as_f64()?)
        }
        (Value::Number(left), Value::String(right)) => {
            left.as_f64()?.partial_cmp(&right.parse::<f64>().ok()?)
        }
        _ => None,
    }
}

fn parse_literal(raw: &str) -> Value {
    let trimmed = raw.trim();
    if let Some(value) = trimmed
        .strip_prefix('\'')
        .and_then(|value| value.strip_suffix('\''))
    {
        return Value::String(value.to_string());
    }
    if let Some(value) = trimmed
        .strip_prefix('"')
        .and_then(|value| value.strip_suffix('"'))
    {
        return Value::String(value.to_string());
    }
    if let Ok(value) = trimmed.parse::<i64>() {
        return Value::Number(value.into());
    }
    if let Ok(value) = trimmed.parse::<f64>() {
        if let Some(number) = serde_json::Number::from_f64(value) {
            return Value::Number(number);
        }
    }
    Value::String(trimmed.to_string())
}

trait SqlWhereExt {
    fn split_once_where(&self) -> Option<&str>;
}

impl SqlWhereExt for str {
    fn split_once_where(&self) -> Option<&str> {
        let regex = Regex::new(r"(?i)\bwhere\b").ok()?;
        regex.find(self).map(|found| &self[found.end()..])
    }
}

#[cfg(test)]
mod tests {
    use super::prune_files;
    use crate::models::DataFileRecord;
    use serde_json::json;
    use serde_json::Value;
    use std::collections::BTreeMap;

    #[test]
    fn prunes_files_using_bounds() {
        let files = vec![
            file("a.parquet", json!(1), json!(10)),
            file("b.parquet", json!(20), json!(30)),
        ];

        let (files, stats) = prune_files("SELECT * FROM t WHERE id = 25", files);

        assert_eq!(files.len(), 1);
        assert_eq!(files[0].file_path, "b.parquet");
        assert_eq!(stats.pruned, 1);
    }

    fn file(path: &str, lower: Value, upper: Value) -> DataFileRecord {
        DataFileRecord {
            file_path: path.to_string(),
            record_count: 10,
            partition_values: BTreeMap::new(),
            lower_bounds: BTreeMap::from([("id".to_string(), lower)]),
            upper_bounds: BTreeMap::from([("id".to_string(), upper)]),
        }
    }
}
