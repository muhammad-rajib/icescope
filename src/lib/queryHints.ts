export type QueryHint = {
  kind: "warning" | "info";
  title: string;
  message: string;
};

export function getQueryHints(sql: string): QueryHint[] {
  const hints: QueryHint[] = [];

  if (usesSelectStar(sql)) {
    hints.push({
      kind: "warning",
      title: "SELECT * can be expensive",
      message:
        "IceScope will still page results, but selecting explicit columns is faster on wide Iceberg tables.",
    });
  }

  if (looksLikeDoubleQuotedString(sql)) {
    hints.push({
      kind: "info",
      title: "SQL quote hint",
      message:
        "Use single quotes for string literals, for example status = 'active'. Double quotes are for identifiers.",
    });
  }

  return hints;
}

export function friendlyClientError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (/s3|aws|bucket|accessdenied|expiredtoken|signature/i.test(message)) {
    return friendlyS3Message(message);
  }

  if (/No field named|field not found|column.*not found/i.test(message) && message.includes('"')) {
    return `${message}\nHint: use single quotes for string literals and double quotes only for identifiers.`;
  }

  return message;
}

function usesSelectStar(sql: string) {
  return /\bselect\s+(?:distinct\s+)?\*/i.test(stripSqlComments(sql));
}

function looksLikeDoubleQuotedString(sql: string) {
  const normalized = stripSqlComments(sql);
  return /(?:=|<>|!=|<|>|<=|>=|\bin\b|\blike\b)\s*"[^"]+"/i.test(normalized);
}

function friendlyS3Message(message: string) {
  if (/ExpiredToken/i.test(message)) {
    return "AWS credentials expired. Refresh your credentials and try again.";
  }

  if (/AccessDenied|Forbidden|403/i.test(message)) {
    return "S3 access denied. Check bucket permissions, region, and credentials.";
  }

  if (/NoSuchBucket|bucket.*not.*found|bucket does not exist/i.test(message)) {
    return "S3 bucket was not found. Check the bucket name in the warehouse URI.";
  }

  if (/InvalidAccessKeyId|SignatureDoesNotMatch/i.test(message)) {
    return "AWS credentials were rejected. Check your access key, secret key, region, and endpoint.";
  }

  if (/timeout|timed out|connection/i.test(message)) {
    return "Could not reach S3. Check the endpoint, region, VPN/network access, and path-style setting.";
  }

  return message;
}

function stripSqlComments(sql: string) {
  return sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}
