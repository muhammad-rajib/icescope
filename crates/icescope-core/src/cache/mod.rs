//! Cache policy definitions and cache-specific helpers.

pub mod query_result;

#[derive(Debug, Clone, Copy, Eq, PartialEq)]
pub enum CacheKind {
    Namespaces,
    Tables,
    Metadata,
    SnapshotUrls,
    QueryResults,
}

impl CacheKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Namespaces => "namespaces",
            Self::Tables => "tables",
            Self::Metadata => "metadata",
            Self::SnapshotUrls => "snapshot_urls",
            Self::QueryResults => "query_results",
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub struct CachePolicy {
    ttl_seconds: i64,
    max_entries: usize,
}

impl CachePolicy {
    pub fn for_kind(kind: CacheKind) -> Self {
        let profile = DeviceProfile::detect();
        match kind {
            CacheKind::Namespaces => Self {
                ttl_seconds: profile.scale_ttl(10 * 60),
                max_entries: profile.scale_cap(500),
            },
            CacheKind::Tables => Self {
                ttl_seconds: profile.scale_ttl(10 * 60),
                max_entries: profile.scale_cap(2_000),
            },
            CacheKind::Metadata => Self {
                ttl_seconds: profile.scale_ttl(15 * 60),
                max_entries: profile.scale_cap(1_000),
            },
            CacheKind::SnapshotUrls => Self {
                ttl_seconds: profile.scale_ttl(15 * 60),
                max_entries: profile.scale_cap(2_000),
            },
            CacheKind::QueryResults => Self {
                ttl_seconds: profile.scale_ttl(3 * 60),
                max_entries: profile.scale_cap(150),
            },
        }
    }

    pub fn ttl_seconds(self) -> i64 {
        self.ttl_seconds
    }

    pub fn max_entries(self) -> usize {
        self.max_entries
    }
}

#[derive(Debug, Clone, Copy)]
enum DeviceProfile {
    Low,
    Standard,
    High,
}

impl DeviceProfile {
    fn detect() -> Self {
        let cpus = std::thread::available_parallelism()
            .map(|value| value.get())
            .unwrap_or(4);

        match cpus {
            0..=4 => Self::Low,
            5..=8 => Self::Standard,
            _ => Self::High,
        }
    }

    fn scale_ttl(self, base_seconds: i64) -> i64 {
        match self {
            Self::Low => base_seconds / 2,
            Self::Standard => base_seconds,
            Self::High => base_seconds * 2,
        }
    }

    fn scale_cap(self, base_entries: usize) -> usize {
        match self {
            Self::Low => (base_entries / 2).max(50),
            Self::Standard => base_entries,
            Self::High => base_entries * 2,
        }
    }
}
