pub fn friendly_s3_error(error: &str) -> String {
    if error.contains("ExpiredToken") {
        return "AWS credentials expired. Refresh your credentials and try again.".to_string();
    }

    if error.contains("AccessDenied") || error.contains("Forbidden") || error.contains("403") {
        return "S3 access denied. Check bucket permissions, region, and credentials.".to_string();
    }

    if error.contains("NoSuchBucket") || error.contains("bucket does not exist") {
        return "S3 bucket was not found. Check the bucket name in the warehouse URI.".to_string();
    }

    if error.contains("InvalidAccessKeyId") || error.contains("SignatureDoesNotMatch") {
        return "AWS credentials were rejected. Check your access key, secret key, region, and endpoint.".to_string();
    }

    if error.contains("MissingRegion") || error.contains("region") && error.contains("missing") {
        return "S3 region is missing. Set AWS_REGION or add a region on the connection."
            .to_string();
    }

    if error.contains("timeout") || error.contains("timed out") || error.contains("connection") {
        return "Could not reach S3. Check the endpoint, region, VPN/network access, and path-style setting.".to_string();
    }

    error.to_string()
}
