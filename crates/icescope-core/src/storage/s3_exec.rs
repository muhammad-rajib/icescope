use std::future::Future;
use std::sync::LazyLock;
use tokio::runtime::{Builder, Runtime};

static S3_RUNTIME: LazyLock<Runtime> = LazyLock::new(|| {
    Builder::new_multi_thread()
        .worker_threads(16)
        .thread_name("icescope-s3")
        .enable_all()
        .build()
        .expect("failed to build IceScope S3 runtime")
});

pub fn block_on<F>(future: F) -> F::Output
where
    F: Future,
{
    S3_RUNTIME.block_on(future)
}
