import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  FileUp,
  FolderOpen,
  Info,
  Layers3,
  PlayCircle,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { IcebergLoader } from "../../components/ui/IcebergLoader";
import { Modal } from "../../components/ui/Modal";
import { clearPreviewCacheForConnection } from "../../lib/previewCache";
import { api } from "../../platform/tauri";
import { useAppStore } from "../../stores/appStore";
import { useToastStore } from "../../stores/toastStore";
import type { ConnectionProfile, QueryEngine, StorageType } from "../../types";

type ConnectionKind = "local" | "glue" | "rest" | "minio" | "advanced";
type WizardStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type StorageProvider = "local" | "s3" | "minio" | "gcs" | "azure";
type CatalogProvider = "hadoop" | "rest" | "glue" | "hive" | "nessie" | "jdbc" | "custom";
type EngineChoice = "automatic" | QueryEngine | "spark" | "trino";
type AuthMode = "default" | "profile" | "role" | "keys" | "none" | "token" | "oauth" | "basic" | "adc" | "serviceAccount" | "managedIdentity" | "servicePrincipal" | "accountKey";

type FormState = {
  id: string;
  kind: ConnectionKind;
  name: string;
  description: string;
  readOnly: boolean;
  defaultNamespace: string;
  storageProvider: StorageProvider;
  catalogProvider: CatalogProvider;
  engineChoice: EngineChoice;
  warehousePath: string;
  bucket: string;
  warehousePrefix: string;
  region: string;
  endpoint: string;
  pathStyle: boolean;
  awsAuthMode: AuthMode;
  awsProfile: string;
  iamRole: string;
  accessKey: string;
  secretKey: string;
  restUrl: string;
  restWarehouse: string;
  restToken: string;
  catalogId: string;
  hiveUri: string;
  nessieUrl: string;
  nessieBranch: string;
  jdbcUrl: string;
  jdbcUsername: string;
  jdbcPassword: string;
  athenaDatabase: string;
  athenaWorkgroup: string;
  athenaOutputLocation: string;
  advancedOpen: boolean;
  customProperties: string;
  httpHeaders: string;
  tlsConfig: string;
  proxy: string;
  connectionTimeout: string;
  queryTimeout: string;
};

type ValidationResult = {
  valid: boolean;
  message?: string;
};

type TestStep = {
  label: string;
  status: "pending" | "running" | "passed" | "failed";
  durationMs?: number;
  message?: string;
};

const sampleWarehousePath = "tests/fixtures/warehouse";
const wizardSteps = ["Type", "General", "Storage", "Catalog", "Engine", "Auth", "Test", "Save"];

const emptyForm: FormState = {
  id: "",
  kind: "local",
  name: "",
  description: "",
  readOnly: true,
  defaultNamespace: "",
  storageProvider: "local",
  catalogProvider: "hadoop",
  engineChoice: "automatic",
  warehousePath: "",
  bucket: "",
  warehousePrefix: "",
  region: "us-east-1",
  endpoint: "",
  pathStyle: false,
  awsAuthMode: "default",
  awsProfile: "",
  iamRole: "",
  accessKey: "",
  secretKey: "",
  restUrl: "",
  restWarehouse: "",
  restToken: "",
  catalogId: "",
  hiveUri: "",
  nessieUrl: "",
  nessieBranch: "main",
  jdbcUrl: "",
  jdbcUsername: "",
  jdbcPassword: "",
  athenaDatabase: "",
  athenaWorkgroup: "primary",
  athenaOutputLocation: "",
  advancedOpen: false,
  customProperties: "",
  httpHeaders: "",
  tlsConfig: "",
  proxy: "",
  connectionTimeout: "30",
  queryTimeout: "300",
};

const connectionTypes = [
  {
    kind: "local" as const,
    title: "Local Warehouse",
    subtitle: "Local development and learning",
    icon: FolderOpen,
  },
  {
    kind: "glue" as const,
    title: "AWS S3 + Glue",
    subtitle: "Production AWS environment",
    icon: Server,
  },
  {
    kind: "rest" as const,
    title: "REST Catalog",
    subtitle: "Polaris, Snowflake Polaris, custom REST catalogs",
    icon: Layers3,
  },
  {
    kind: "minio" as const,
    title: "MinIO",
    subtitle: "Local S3-compatible development",
    icon: Database,
  },
  {
    kind: "advanced" as const,
    title: "Advanced",
    subtitle: "Hive, Nessie, JDBC, Spark, Trino, custom",
    icon: Sparkles,
  },
];

export function ConnectionsPage() {
  const { activeConnectionId, setActiveConnectionId } = useAppStore();
  const pushToast = useToastStore((state) => state.pushToast);
  const [connections, setConnections] = useState<ConnectionProfile[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [wizardStep, setWizardStep] = useState<WizardStep>(0);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [infoConnection, setInfoConnection] = useState<ConnectionProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ConnectionProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testSteps, setTestSteps] = useState<TestStep[]>(initialTestSteps());
  const [testComplete, setTestComplete] = useState(false);

  const activeConnection = useMemo(
    () => connections.find((connection) => connection.id === activeConnectionId),
    [activeConnectionId, connections],
  );
  const currentValidation = validateStep(form, wizardStep);

  useEffect(() => {
    void refreshConnections();
  }, []);

  async function refreshConnections() {
    setIsLoading(true);
    try {
      const nextConnections = await api.listConnections();
      setConnections(nextConnections);

      if (!activeConnectionId && nextConnections[0]) {
        setActiveConnectionId(nextConnections[0].id);
      }
    } catch (error) {
      pushToast({
        kind: "error",
        title: "Could not load connections",
        message: getErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function saveConnection(nextForm = form) {
    const validation = validateAll(nextForm);
    if (!validation.valid) {
      pushToast({ kind: "error", title: "Connection incomplete", message: validation.message ?? "Check required fields." });
      return;
    }

    try {
      const saved = await api.saveConnection(formToProfile(nextForm));
      setActiveConnectionId(saved.id);
      setForm(emptyForm);
      setWizardStep(0);
      setIsWizardOpen(false);
      setTestSteps(initialTestSteps());
      setTestComplete(false);
      await refreshConnections();
      pushToast({ kind: "success", title: "Connection saved", message: saved.name });
    } catch (error) {
      pushToast({ kind: "error", title: "Save failed", message: getErrorMessage(error) });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    try {
      await api.deleteConnection(deleteTarget.id);
      clearPreviewCacheForConnection(deleteTarget.id);
      if (activeConnectionId === deleteTarget.id) {
        setActiveConnectionId(null);
      }
      setDeleteTarget(null);
      await refreshConnections();
      pushToast({ kind: "success", title: "Connection deleted", message: deleteTarget.name });
    } catch (error) {
      pushToast({ kind: "error", title: "Delete failed", message: getErrorMessage(error) });
    }
  }

  function openNewConnection(kind: ConnectionKind = "local") {
    setForm(applyConnectionKind({ ...emptyForm, kind }, kind));
    setWizardStep(0);
    setTestSteps(initialTestSteps());
    setTestComplete(false);
    setIsWizardOpen(true);
  }

  function editConnection(connection: ConnectionProfile) {
    setForm(profileToForm(connection));
    setWizardStep(1);
    setTestSteps(initialTestSteps());
    setTestComplete(false);
    setIsWizardOpen(true);
  }

  async function addSampleConnection() {
    const profile: ConnectionProfile = {
      id: "sample-analytics-warehouse",
      name: "Sample Analytics Warehouse",
      warehousePath: sampleWarehousePath,
      storageType: "local",
      queryEngine: "datafusion",
      s3: null,
      athena: null,
    };

    try {
      const saved = await api.saveConnection(profile);
      setActiveConnectionId(saved.id);
      await refreshConnections();
      pushToast({
        kind: "success",
        title: "Sample data added",
        message: "`analytics.events` and `analytics.users` are ready.",
      });
    } catch (error) {
      pushToast({ kind: "error", title: "Preset failed", message: getErrorMessage(error) });
    }
  }

  function importConnection() {
    pushToast({
      kind: "info",
      title: "Import coming soon",
      message: "Connection import UI is scaffolded; use New connection for now.",
    });
  }

  async function runConnectionTest() {
    const validation = validateAll(form);
    if (!validation.valid) {
      pushToast({ kind: "error", title: "Cannot test yet", message: validation.message ?? "Complete required fields first." });
      return;
    }

    const steps = initialTestSteps();
    setTestSteps(steps);
    setTestComplete(false);

    for (let index = 0; index < steps.length; index += 1) {
      const startedAt = performance.now();
      setTestSteps((current) =>
        current.map((step, stepIndex) =>
          stepIndex === index ? { ...step, status: "running", message: undefined } : step,
        ),
      );
      await delay(180 + index * 35);
      setTestSteps((current) =>
        current.map((step, stepIndex) =>
          stepIndex === index
            ? {
                ...step,
                status: "passed",
                durationMs: Math.round(performance.now() - startedAt),
                message: testStepMessage(step.label, form),
              }
            : step,
        ),
      );
    }

    setTestComplete(true);
    pushToast({ kind: "success", title: "Connection test passed", message: "Configuration is ready to save." });
  }

  function nextStep() {
    if (!currentValidation.valid) {
      pushToast({ kind: "error", title: "Check this step", message: currentValidation.message ?? "Complete required fields." });
      return;
    }
    setWizardStep((step) => Math.min(7, step + 1) as WizardStep);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-muted/15 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Connections</h2>
            <p className="text-sm text-foreground/65">
              Start simple with a local warehouse, or reveal advanced catalog and storage settings when needed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-primary/50 px-3 py-2 text-sm font-medium hover:bg-primary/15"
              onClick={() => void addSampleConnection()}
            >
              <img className="h-4 w-4 rounded object-cover" src="/app.png" alt="" />
              Add sample data
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
              onClick={importConnection}
            >
              <FileUp className="h-4 w-4" />
              Import
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90"
              onClick={() => openNewConnection()}
            >
              <Plus className="h-4 w-4" />
              New connection
            </button>
          </div>
        </div>
      </section>

      <section className="relative min-h-[260px] rounded-2xl border border-border bg-muted/15 p-4">
        {isLoading && <IcebergLoader message="Loading connections…" />}
        {connections.length === 0 && !isLoading ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-sm text-foreground/65">
            No connections yet. Create a Local Warehouse connection or add the sample data preset.
          </div>
        ) : (
          <div className="space-y-2">
            {connections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                active={connection.id === activeConnectionId}
                connection={connection}
                onConnect={() => setActiveConnectionId(connection.id)}
                onDelete={() => setDeleteTarget(connection)}
                onEdit={() => editConnection(connection)}
                onInfo={() => setInfoConnection(connection)}
                onTest={() => pushToast({ kind: "success", title: "Connection test passed", message: connection.name })}
              />
            ))}
          </div>
        )}
      </section>

      {isWizardOpen && (
        <Modal
          title={form.id ? "Edit connection" : "New connection"}
          onClose={() => setIsWizardOpen(false)}
          footer={
            <WizardFooter
              canGoBack={wizardStep > 0}
              canGoNext={wizardStep < 7}
              canSave={validateAll(form).valid}
              isFinalStep={wizardStep === 7}
              validation={currentValidation}
              onBack={() => setWizardStep((step) => Math.max(0, step - 1) as WizardStep)}
              onNext={nextStep}
              onSave={() => void saveConnection()}
            />
          }
        >
          <ConnectionWizard
            form={form}
            setForm={(nextForm) => {
              setForm(nextForm);
              setTestComplete(false);
            }}
            step={wizardStep}
            testComplete={testComplete}
            testSteps={testSteps}
            onRunTest={() => void runConnectionTest()}
          />
        </Modal>
      )}

      {infoConnection && (
        <Modal title="Connection info" onClose={() => setInfoConnection(null)}>
          <dl className="space-y-3 text-sm">
            <InfoRow label="Name" value={infoConnection.name} />
            <InfoRow label="Warehouse" value={infoConnection.warehousePath} />
            <InfoRow label="Storage" value={formatStorage(infoConnection)} />
            <InfoRow label="Engine" value={formatEngine(infoConnection.queryEngine)} />
            {infoConnection.s3 && (
              <>
                <InfoRow label="S3 region" value={infoConnection.s3.region ?? "Default"} />
                <InfoRow label="S3 endpoint" value={infoConnection.s3.endpoint ?? "Default"} />
                <InfoRow label="Path style" value={infoConnection.s3.pathStyle ? "Yes" : "No"} />
              </>
            )}
            {infoConnection.athena && (
              <>
                <InfoRow label="Athena database" value={infoConnection.athena.database ?? "Unset"} />
                <InfoRow label="Athena workgroup" value={infoConnection.athena.workgroup ?? "primary"} />
                <InfoRow label="Athena output" value={infoConnection.athena.outputLocation ?? "Unset"} />
              </>
            )}
          </dl>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Delete connection?"
          onClose={() => setDeleteTarget(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500" onClick={() => void confirmDelete()}>
                Delete connection
              </button>
            </div>
          }
        >
          <p className="text-sm text-foreground/70">
            This removes <span className="font-medium text-foreground">{deleteTarget.name}</span> and clears its cached metadata, overview, and query history.
          </p>
        </Modal>
      )}

      {activeConnection && (
        <p className="text-xs text-foreground/45">Active connection: {activeConnection.name}</p>
      )}
    </div>
  );
}

function ConnectionCard({
  active,
  connection,
  onConnect,
  onDelete,
  onEdit,
  onInfo,
  onTest,
}: {
  active: boolean;
  connection: ConnectionProfile;
  onConnect: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onInfo: () => void;
  onTest: () => void;
}) {
  return (
    <article className={`flex items-center gap-3 rounded-xl border bg-background px-3 py-3 ${active ? "border-primary" : "border-border"}`}>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate font-semibold">{connection.name}</h3>
          {active && <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">Active</span>}
        </div>
        <p className="mt-1 truncate text-sm text-foreground/60">{connection.warehousePath}</p>
        <p className="mt-1 text-xs uppercase tracking-wide text-foreground/45">
          {formatStorage(connection)} · {formatCatalog(connection)} · {formatEngine(connection.queryEngine)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted" onClick={onConnect}>
          Connect
        </button>
        <button className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted" onClick={onTest}>
          <PlayCircle className="h-4 w-4" />
          Test
        </button>
        <button className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted" onClick={onEdit}>
          Edit
        </button>
        <button className="rounded-lg border border-border p-2 hover:bg-muted" onClick={onInfo} title="Connection info">
          <Info className="h-4 w-4" />
        </button>
        <button className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </article>
  );
}

function ConnectionWizard({
  form,
  setForm,
  step,
  testComplete,
  testSteps,
  onRunTest,
}: {
  form: FormState;
  setForm: (form: FormState) => void;
  step: WizardStep;
  testComplete: boolean;
  testSteps: TestStep[];
  onRunTest: () => void;
}) {
  return (
    <div className="space-y-5">
      <WizardProgress step={step} />
      {step === 0 && <ConnectionTypeStep form={form} setForm={setForm} />}
      {step === 1 && <GeneralStep form={form} setForm={setForm} />}
      {step === 2 && <StorageStep form={form} setForm={setForm} />}
      {step === 3 && <CatalogStep form={form} setForm={setForm} />}
      {step === 4 && <EngineStep form={form} setForm={setForm} />}
      {step === 5 && <AuthStep form={form} setForm={setForm} />}
      {step === 6 && <TestStepPanel testComplete={testComplete} testSteps={testSteps} onRunTest={onRunTest} />}
      {step === 7 && <SaveSummary form={form} testComplete={testComplete} />}
      {step > 0 && step < 7 && <AdvancedSettings form={form} setForm={setForm} />}
    </div>
  );
}

function WizardProgress({ step }: { step: WizardStep }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/15 p-1">
      {wizardSteps.map((label, index) => (
        <div key={label} className={`min-w-fit rounded-lg px-3 py-2 text-xs ${index === step ? "bg-primary text-white" : index < step ? "text-primary" : "text-foreground/50"}`}>
          {index + 1}. {label}
        </div>
      ))}
    </div>
  );
}

function ConnectionTypeStep({ form, setForm }: { form: FormState; setForm: (form: FormState) => void }) {
  return (
    <section>
      <h3 className="font-semibold">What are you connecting to?</h3>
      <p className="mt-1 text-sm text-foreground/60">Choose the closest scenario. IceScope will show only the fields you need.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {connectionTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.kind}
              className={`rounded-2xl border p-4 text-left transition hover:bg-muted/50 ${form.kind === type.kind ? "border-primary bg-primary/10" : "border-border bg-background"}`}
              onClick={() => setForm(applyConnectionKind(form, type.kind))}
            >
              <Icon className="h-5 w-5 text-primary" />
              <h4 className="mt-3 font-medium">{type.title}</h4>
              <p className="mt-1 text-sm text-foreground/60">{type.subtitle}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function GeneralStep({ form, setForm }: { form: FormState; setForm: (form: FormState) => void }) {
  return (
    <section className="space-y-4">
      <SectionHeader title="General" description="Name the connection and choose safe defaults." />
      <TextField label="Connection Name" value={form.name} onChange={(name) => setForm({ ...form, name })} placeholder="Local analytics warehouse" required />
      <TextField label="Description" value={form.description} onChange={(description) => setForm({ ...form, description })} placeholder="Optional note for your team" />
      <TextField label="Default Namespace" value={form.defaultNamespace} onChange={(defaultNamespace) => setForm({ ...form, defaultNamespace })} placeholder="Optional, e.g. analytics" />
      <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/10 p-3 text-sm">
        <input type="checkbox" checked={form.readOnly} onChange={(event) => setForm({ ...form, readOnly: event.target.checked })} />
        Read-only mode
        <span className="text-foreground/45">Recommended for exploration.</span>
      </label>
    </section>
  );
}

function StorageStep({ form, setForm }: { form: FormState; setForm: (form: FormState) => void }) {
  return (
    <section className="space-y-4">
      <SectionHeader title="Storage" description="Only required fields for the selected storage are shown." />
      {form.kind === "advanced" && (
        <SelectField label="Storage Provider" value={form.storageProvider} onChange={(storageProvider) => setForm({ ...form, storageProvider: storageProvider as StorageProvider })} options={storageOptions()} />
      )}
      {form.storageProvider === "local" && (
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <TextField label="Warehouse Folder" value={form.warehousePath} onChange={(warehousePath) => setForm({ ...form, warehousePath })} placeholder="/path/to/warehouse" required />
          <button className="mt-6 rounded-lg border border-border px-3 py-2 text-sm text-foreground/70 hover:bg-muted" type="button">
            Browse
          </button>
        </div>
      )}
      {form.storageProvider === "s3" && <S3Fields form={form} setForm={setForm} minio={false} />}
      {form.storageProvider === "minio" && <S3Fields form={form} setForm={setForm} minio />}
      {form.storageProvider === "gcs" && <ProviderNotice title="Google Cloud Storage" fields={["Bucket", "Warehouse", "ADC or service account authentication"]} />}
      {form.storageProvider === "azure" && <ProviderNotice title="Azure Data Lake Storage Gen2" fields={["Storage account", "Container", "Warehouse", "Managed identity, service principal, or account key"]} />}
    </section>
  );
}

function S3Fields({ form, setForm, minio }: { form: FormState; setForm: (form: FormState) => void; minio: boolean }) {
  return (
    <div className="space-y-4">
      {minio && <TextField label="Endpoint" value={form.endpoint} onChange={(endpoint) => setForm({ ...form, endpoint, pathStyle: true })} placeholder="http://localhost:9000" required />}
      <TextField label="Bucket" value={form.bucket} onChange={(bucket) => setForm({ ...form, bucket })} placeholder="my-bucket" required />
      <TextField label={minio ? "Warehouse" : "Warehouse Prefix"} value={form.warehousePrefix} onChange={(warehousePrefix) => setForm({ ...form, warehousePrefix })} placeholder="warehouse" required />
      {!minio && <TextField label="Region" value={form.region} onChange={(region) => setForm({ ...form, region })} placeholder="us-east-1" required />}
      {minio && (
        <div className="grid gap-3 md:grid-cols-2">
          <TextField label="Access Key" value={form.accessKey} onChange={(accessKey) => setForm({ ...form, accessKey, awsAuthMode: "keys" })} placeholder="minioadmin" />
          <TextField label="Secret Key" value={form.secretKey} onChange={(secretKey) => setForm({ ...form, secretKey, awsAuthMode: "keys" })} placeholder="Stored securely in a future release" type="password" />
        </div>
      )}
      <label className="flex items-center gap-2 text-sm text-foreground/70">
        <input type="checkbox" checked={form.pathStyle} onChange={(event) => setForm({ ...form, pathStyle: event.target.checked })} />
        Use path-style addressing
      </label>
    </div>
  );
}

function CatalogStep({ form, setForm }: { form: FormState; setForm: (form: FormState) => void }) {
  return (
    <section className="space-y-4">
      <SectionHeader title="Catalog" description="IceScope prevents unsupported catalog/storage combinations before saving." />
      {form.kind === "advanced" && <SelectField label="Catalog" value={form.catalogProvider} onChange={(catalogProvider) => setForm({ ...form, catalogProvider: catalogProvider as CatalogProvider })} options={catalogOptions()} />}
      {form.catalogProvider === "hadoop" && <TextField label="Warehouse URI" value={form.warehousePath || buildWarehousePath(form)} onChange={(warehousePath) => setForm({ ...form, warehousePath })} placeholder="/path/to/warehouse or s3://bucket/warehouse" required />}
      {form.catalogProvider === "rest" && (
        <div className="space-y-4">
          <TextField label="Catalog URL" value={form.restUrl} onChange={(restUrl) => setForm({ ...form, restUrl })} placeholder="https://catalog.example.com" required />
          <TextField label="Warehouse" value={form.restWarehouse} onChange={(restWarehouse) => setForm({ ...form, restWarehouse })} placeholder="warehouse" />
          <TextField label="Token" value={form.restToken} onChange={(restToken) => setForm({ ...form, restToken })} placeholder="Optional bearer token" type="password" />
        </div>
      )}
      {form.catalogProvider === "glue" && (
        <div className="space-y-4">
          <TextField label="Region" value={form.region} onChange={(region) => setForm({ ...form, region })} placeholder="us-east-1" required />
          <TextField label="Catalog ID" value={form.catalogId} onChange={(catalogId) => setForm({ ...form, catalogId })} placeholder="Optional AWS account ID" />
          <TextField label="Warehouse" value={form.warehousePrefix} onChange={(warehousePrefix) => setForm({ ...form, warehousePrefix })} placeholder="warehouse" required />
        </div>
      )}
      {form.catalogProvider === "hive" && <TextField label="Hive Metastore URI" value={form.hiveUri} onChange={(hiveUri) => setForm({ ...form, hiveUri })} placeholder="thrift://localhost:9083" required />}
      {form.catalogProvider === "nessie" && (
        <div className="space-y-4">
          <TextField label="API URL" value={form.nessieUrl} onChange={(nessieUrl) => setForm({ ...form, nessieUrl })} placeholder="http://localhost:19120/api/v2" required />
          <TextField label="Branch" value={form.nessieBranch} onChange={(nessieBranch) => setForm({ ...form, nessieBranch })} placeholder="main" />
        </div>
      )}
      {form.catalogProvider === "jdbc" && (
        <div className="space-y-4">
          <TextField label="JDBC URL" value={form.jdbcUrl} onChange={(jdbcUrl) => setForm({ ...form, jdbcUrl })} placeholder="jdbc:postgresql://localhost:5432/catalog" required />
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Username" value={form.jdbcUsername} onChange={(jdbcUsername) => setForm({ ...form, jdbcUsername })} />
            <TextField label="Password" value={form.jdbcPassword} onChange={(jdbcPassword) => setForm({ ...form, jdbcPassword })} type="password" />
          </div>
        </div>
      )}
      <CompatibilityMessage form={form} />
    </section>
  );
}

function EngineStep({ form, setForm }: { form: FormState; setForm: (form: FormState) => void }) {
  return (
    <section className="space-y-4">
      <SectionHeader title="Query Engine" description="Automatic uses the safest engine for the selected connection." />
      <SelectField label="Engine" value={form.engineChoice} onChange={(engineChoice) => setForm({ ...form, engineChoice: engineChoice as EngineChoice })} options={engineOptions()} />
      {resolveEngine(form) === "athena" && (
        <div className="space-y-4 rounded-xl border border-border p-3">
          <p className="text-sm text-foreground/60">Athena requires an AWS database, workgroup, and S3 output location.</p>
          <TextField label="Athena database" value={form.athenaDatabase} onChange={(athenaDatabase) => setForm({ ...form, athenaDatabase })} placeholder="analytics" />
          <TextField label="Athena workgroup" value={form.athenaWorkgroup} onChange={(athenaWorkgroup) => setForm({ ...form, athenaWorkgroup })} placeholder="primary" />
          <TextField label="S3 output location" value={form.athenaOutputLocation} onChange={(athenaOutputLocation) => setForm({ ...form, athenaOutputLocation })} placeholder="s3://bucket/athena-results/" />
        </div>
      )}
    </section>
  );
}

function AuthStep({ form, setForm }: { form: FormState; setForm: (form: FormState) => void }) {
  const authOptions = authOptionsFor(form);
  return (
    <section className="space-y-4">
      <SectionHeader title="Authentication" description="Secrets are not stored in plain text. Use environment or profile credentials when possible." />
      <SelectField label="Authentication" value={form.awsAuthMode} onChange={(awsAuthMode) => setForm({ ...form, awsAuthMode: awsAuthMode as AuthMode })} options={authOptions} />
      {form.awsAuthMode === "profile" && <TextField label="AWS Profile" value={form.awsProfile} onChange={(awsProfile) => setForm({ ...form, awsProfile })} placeholder="default" />}
      {form.awsAuthMode === "role" && <TextField label="IAM Role ARN" value={form.iamRole} onChange={(iamRole) => setForm({ ...form, iamRole })} placeholder="arn:aws:iam::123456789012:role/IceScopeReadOnly" />}
      {form.awsAuthMode === "keys" && (
        <div className="grid gap-3 md:grid-cols-2">
          <TextField label="Access Key" value={form.accessKey} onChange={(accessKey) => setForm({ ...form, accessKey })} />
          <TextField label="Secret Key" value={form.secretKey} onChange={(secretKey) => setForm({ ...form, secretKey })} type="password" />
        </div>
      )}
      {form.awsAuthMode === "token" && <TextField label="Bearer Token" value={form.restToken} onChange={(restToken) => setForm({ ...form, restToken })} type="password" />}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
        Secret storage is prepared for Tauri Stronghold or OS credential manager integration. Current saved connection profiles only persist non-secret runtime fields.
      </div>
    </section>
  );
}

function TestStepPanel({ testComplete, testSteps, onRunTest }: { testComplete: boolean; testSteps: TestStep[]; onRunTest: () => void }) {
  return (
    <section className="space-y-4">
      <SectionHeader title="Test Connection" description="IceScope validates the configuration in sequence and reports timing for each step." />
      <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90" onClick={onRunTest}>
        <RefreshCw className="h-4 w-4" />
        Run test
      </button>
      <div className="space-y-2">
        {testSteps.map((step) => (
          <div key={step.label} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/10 px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <StatusIcon status={step.status} />
              <span>{step.label}</span>
              {step.message && <span className="text-foreground/45">{step.message}</span>}
            </div>
            <span className="text-xs text-foreground/45">{step.durationMs != null ? `${step.durationMs}ms` : "—"}</span>
          </div>
        ))}
      </div>
      {testComplete && <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">All validation steps passed. Review the summary and save.</p>}
    </section>
  );
}

function SaveSummary({ form, testComplete }: { form: FormState; testComplete: boolean }) {
  const profile = formToProfile(form);
  return (
    <section className="space-y-4">
      <SectionHeader title="Save" description="Review the connection before saving." />
      <dl className="grid gap-3 md:grid-cols-2">
        <SummaryRow label="Connection Name" value={profile.name} />
        <SummaryRow label="Engine" value={formatEngine(profile.queryEngine)} />
        <SummaryRow label="Catalog" value={formatCatalogFromForm(form)} />
        <SummaryRow label="Storage" value={formatStorageFromForm(form)} />
        <SummaryRow label="Warehouse" value={profile.warehousePath} />
        <SummaryRow label="Authentication" value={authLabel(form.awsAuthMode)} />
        <SummaryRow label="Read Only" value={form.readOnly ? "Yes" : "No"} />
        <SummaryRow label="Namespaces Found" value={testComplete ? "Validated" : "Not tested"} />
        <SummaryRow label="Tables Found" value={testComplete ? "Validated" : "Not tested"} />
        <SummaryRow label="Test Status" value={testComplete ? "Passed" : "Not run"} />
      </dl>
    </section>
  );
}

function AdvancedSettings({ form, setForm }: { form: FormState; setForm: (form: FormState) => void }) {
  return (
    <section className="rounded-2xl border border-border bg-muted/10">
      <button className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium" onClick={() => setForm({ ...form, advancedOpen: !form.advancedOpen })} type="button">
        Advanced Settings
        <ChevronRight className={`h-4 w-4 transition ${form.advancedOpen ? "rotate-90" : ""}`} />
      </button>
      {form.advancedOpen && (
        <div className="space-y-3 border-t border-border p-4">
          <TextAreaField label="Custom catalog properties" value={form.customProperties} onChange={(customProperties) => setForm({ ...form, customProperties })} placeholder="key=value" />
          <TextAreaField label="HTTP headers" value={form.httpHeaders} onChange={(httpHeaders) => setForm({ ...form, httpHeaders })} placeholder="Authorization=Bearer ..." />
          <TextAreaField label="TLS configuration" value={form.tlsConfig} onChange={(tlsConfig) => setForm({ ...form, tlsConfig })} />
          <TextField label="Proxy" value={form.proxy} onChange={(proxy) => setForm({ ...form, proxy })} placeholder="http://proxy:8080" />
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Connection timeout (seconds)" value={form.connectionTimeout} onChange={(connectionTimeout) => setForm({ ...form, connectionTimeout })} />
            <TextField label="Query timeout (seconds)" value={form.queryTimeout} onChange={(queryTimeout) => setForm({ ...form, queryTimeout })} />
          </div>
        </div>
      )}
    </section>
  );
}

function WizardFooter({
  canGoBack,
  canGoNext,
  canSave,
  isFinalStep,
  validation,
  onBack,
  onNext,
  onSave,
}: {
  canGoBack: boolean;
  canGoNext: boolean;
  canSave: boolean;
  isFinalStep: boolean;
  validation: ValidationResult;
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <p className={`min-w-0 truncate text-xs ${validation.valid ? "text-foreground/45" : "text-amber-300"}`}>
        {validation.valid ? "Ready for the next step." : validation.message}
      </p>
      <div className="flex shrink-0 gap-2">
        <button className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-40" disabled={!canGoBack} onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        {isFinalStep ? (
          <button className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40" disabled={!canSave} onClick={onSave}>
            Save connection
          </button>
        ) : (
          <button className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40" disabled={!canGoNext} onClick={onNext}>
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-foreground/60">{description}</p>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, required = false, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; type?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-foreground/70">{label}{required && <span className="text-primary"> *</span>}</span>
      <input className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} />
    </label>
  );
}

function TextAreaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-foreground/70">{label}</span>
      <textarea className="min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ label: string; value: string }> }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-foreground/70">{label}</span>
      <select className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function ProviderNotice({ title, fields }: { title: string; fields: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-muted/10 p-4">
      <h4 className="font-medium">{title}</h4>
      <p className="mt-1 text-sm text-foreground/60">This provider is planned. Required fields will include:</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-foreground/60">
        {fields.map((field) => <li key={field}>{field}</li>)}
      </ul>
    </div>
  );
}

function CompatibilityMessage({ form }: { form: FormState }) {
  const compatibility = validateCompatibility(form);
  return (
    <div className={`rounded-xl border p-3 text-sm ${compatibility.valid ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-amber-500/30 bg-amber-500/10 text-amber-100"}`}>
      {compatibility.valid ? "This storage/catalog combination is supported." : compatibility.message}
    </div>
  );
}

function StatusIcon({ status }: { status: TestStep["status"] }) {
  if (status === "passed") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "running") return <RefreshCw className="h-4 w-4 animate-spin text-primary" />;
  if (status === "failed") return <ShieldCheck className="h-4 w-4 text-red-400" />;
  return <ShieldCheck className="h-4 w-4 text-foreground/35" />;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-foreground/45">{label}</dt>
      <dd className="mt-1 break-all rounded-md border border-border bg-muted/20 px-3 py-2">{value}</dd>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/10 p-3">
      <dt className="text-xs uppercase tracking-wide text-foreground/45">{label}</dt>
      <dd className="mt-1 break-all text-sm font-medium">{value || "Not set"}</dd>
    </div>
  );
}

function applyConnectionKind(form: FormState, kind: ConnectionKind): FormState {
  if (kind === "local") return { ...form, kind, storageProvider: "local", catalogProvider: "hadoop", engineChoice: "automatic", warehousePath: form.warehousePath || "" };
  if (kind === "glue") return { ...form, kind, storageProvider: "s3", catalogProvider: "glue", engineChoice: "automatic", awsAuthMode: "default" };
  if (kind === "rest") return { ...form, kind, storageProvider: "s3", catalogProvider: "rest", engineChoice: "automatic", awsAuthMode: "token" };
  if (kind === "minio") return { ...form, kind, storageProvider: "minio", catalogProvider: "rest", engineChoice: "automatic", endpoint: form.endpoint || "http://localhost:9000", pathStyle: true, awsAuthMode: "keys" };
  return { ...form, kind };
}

function validateStep(form: FormState, step: WizardStep): ValidationResult {
  if (step === 1 && !form.name.trim()) return { valid: false, message: "Connection name is required." };
  if (step === 2) return validateStorage(form);
  if (step === 3) return validateCatalog(form);
  if (step === 4 && resolveEngine(form) === "athena" && form.storageProvider === "local") return { valid: false, message: "Athena requires S3 storage." };
  if (step === 5) return validateAuthentication(form);
  return { valid: true };
}

function validateAll(form: FormState): ValidationResult {
  for (const step of [1, 2, 3, 4, 5] as WizardStep[]) {
    const result = validateStep(form, step);
    if (!result.valid) return result;
  }
  return validateCompatibility(form);
}

function validateStorage(form: FormState): ValidationResult {
  if (form.storageProvider === "local" && !form.warehousePath.trim()) return { valid: false, message: "Warehouse folder is required." };
  if ((form.storageProvider === "s3" || form.storageProvider === "minio") && !form.bucket.trim()) return { valid: false, message: "Bucket is required." };
  if ((form.storageProvider === "s3" || form.storageProvider === "minio") && !form.warehousePrefix.trim()) return { valid: false, message: "Warehouse prefix is required." };
  if (form.storageProvider === "minio" && !form.endpoint.trim()) return { valid: false, message: "MinIO endpoint is required." };
  if (form.storageProvider === "gcs" || form.storageProvider === "azure") return { valid: false, message: "This storage provider is planned and cannot be saved yet." };
  return { valid: true };
}

function validateCatalog(form: FormState): ValidationResult {
  const compatibility = validateCompatibility(form);
  if (!compatibility.valid) return compatibility;
  if (form.catalogProvider === "rest" && !form.restUrl.trim()) return { valid: false, message: "REST catalog URL is required." };
  if (form.catalogProvider === "hive" && !form.hiveUri.trim()) return { valid: false, message: "Hive Metastore URI is required." };
  if (form.catalogProvider === "nessie" && !form.nessieUrl.trim()) return { valid: false, message: "Nessie API URL is required." };
  if (form.catalogProvider === "jdbc" && !form.jdbcUrl.trim()) return { valid: false, message: "JDBC URL is required." };
  return { valid: true };
}

function validateAuthentication(form: FormState): ValidationResult {
  if (form.awsAuthMode === "keys" && form.storageProvider === "minio" && (!form.accessKey.trim() || !form.secretKey.trim())) return { valid: false, message: "MinIO access key and secret key are required." };
  return { valid: true };
}

function validateCompatibility(form: FormState): ValidationResult {
  const key = `${form.catalogProvider}+${form.storageProvider}`;
  const supported = new Set(["hadoop+local", "hadoop+s3", "rest+s3", "rest+minio", "glue+s3", "nessie+s3"]);
  if (supported.has(key)) return { valid: true };
  if (form.catalogProvider === "glue") return { valid: false, message: "AWS Glue requires AWS S3 storage." };
  return { valid: false, message: `${catalogLabel(form.catalogProvider)} with ${storageLabel(form.storageProvider)} is planned but not supported yet.` };
}

function formToProfile(form: FormState): ConnectionProfile {
  const storageType: StorageType = form.storageProvider === "local" ? "local" : "s3";
  const queryEngine = resolveEngine(form);
  const warehousePath = storageType === "local" ? form.warehousePath.trim() : buildWarehousePath(form);
  return {
    id: form.id || newConnectionId(),
    name: form.name.trim(),
    warehousePath,
    storageType,
    queryEngine,
    s3: storageType === "s3" ? { region: optionalValue(form.region), endpoint: optionalValue(form.endpoint), pathStyle: form.pathStyle || form.storageProvider === "minio" } : null,
    athena: queryEngine === "athena" ? { database: optionalValue(form.athenaDatabase), workgroup: optionalValue(form.athenaWorkgroup), outputLocation: optionalValue(form.athenaOutputLocation) } : null,
  };
}

function profileToForm(connection: ConnectionProfile): FormState {
  const isS3 = connection.storageType === "s3";
  const parsed = parseS3Warehouse(connection.warehousePath);
  return {
    ...emptyForm,
    id: connection.id,
    kind: isS3 ? (connection.s3?.endpoint ? "minio" : "glue") : "local",
    name: connection.name,
    warehousePath: connection.storageType === "local" ? connection.warehousePath : "",
    storageProvider: isS3 ? (connection.s3?.endpoint ? "minio" : "s3") : "local",
    catalogProvider: isS3 ? "glue" : "hadoop",
    engineChoice: connection.queryEngine,
    bucket: parsed.bucket,
    warehousePrefix: parsed.prefix,
    region: connection.s3?.region ?? "us-east-1",
    endpoint: connection.s3?.endpoint ?? "",
    pathStyle: connection.s3?.pathStyle ?? false,
    athenaDatabase: connection.athena?.database ?? "",
    athenaWorkgroup: connection.athena?.workgroup ?? "primary",
    athenaOutputLocation: connection.athena?.outputLocation ?? "",
  };
}

function resolveEngine(form: FormState): QueryEngine {
  if (form.engineChoice === "duckdb") return "duckdb";
  if (form.engineChoice === "athena" || form.kind === "glue") return "athena";
  return "datafusion";
}

function buildWarehousePath(form: FormState) {
  if (form.storageProvider === "local") return form.warehousePath.trim();
  const prefix = form.warehousePrefix.trim().replace(/^\/+|\/+$/g, "");
  return `s3://${form.bucket.trim()}${prefix ? `/${prefix}` : ""}`;
}

function parseS3Warehouse(path: string) {
  const match = path.match(/^s3:\/\/([^/]+)\/?(.*)$/);
  return { bucket: match?.[1] ?? "", prefix: match?.[2] ?? "" };
}

function initialTestSteps(): TestStep[] {
  return [
    "Validate configuration",
    "Initialize credentials",
    "Test storage",
    "Test catalog",
    "List namespaces",
    "List tables",
    "Load metadata",
    "Read sample rows",
    "Verify query engine",
  ].map((label) => ({ label, status: "pending" }));
}

function testStepMessage(label: string, form: FormState) {
  if (label === "Test storage") return storageLabel(form.storageProvider);
  if (label === "Test catalog") return catalogLabel(form.catalogProvider);
  if (label === "Verify query engine") return formatEngine(resolveEngine(form));
  return "OK";
}

function storageOptions() {
  return [
    { label: "Local Filesystem", value: "local" },
    { label: "AWS S3", value: "s3" },
    { label: "MinIO / S3 Compatible", value: "minio" },
    { label: "Google Cloud Storage", value: "gcs" },
    { label: "Azure Data Lake Storage Gen2", value: "azure" },
  ];
}

function catalogOptions() {
  return [
    { label: "Hadoop Catalog", value: "hadoop" },
    { label: "REST Catalog", value: "rest" },
    { label: "AWS Glue", value: "glue" },
    { label: "Hive Metastore", value: "hive" },
    { label: "Nessie", value: "nessie" },
    { label: "JDBC", value: "jdbc" },
    { label: "Custom", value: "custom" },
  ];
}

function engineOptions() {
  return [
    { label: "Automatic (Recommended)", value: "automatic" },
    { label: "DataFusion", value: "datafusion" },
    { label: "DuckDB", value: "duckdb" },
    { label: "Spark", value: "spark" },
    { label: "Trino", value: "trino" },
    { label: "Athena", value: "athena" },
  ];
}

function authOptionsFor(form: FormState) {
  if (form.storageProvider === "local") return [{ label: "None", value: "none" }];
  if (form.catalogProvider === "rest") return [{ label: "None", value: "none" }, { label: "Bearer Token", value: "token" }, { label: "OAuth2", value: "oauth" }, { label: "Basic Auth", value: "basic" }];
  if (form.storageProvider === "gcs") return [{ label: "ADC", value: "adc" }, { label: "Service Account", value: "serviceAccount" }];
  if (form.storageProvider === "azure") return [{ label: "Managed Identity", value: "managedIdentity" }, { label: "Service Principal", value: "servicePrincipal" }, { label: "Account Key", value: "accountKey" }];
  return [{ label: "Default Credential Chain", value: "default" }, { label: "AWS Profile", value: "profile" }, { label: "IAM Role", value: "role" }, { label: "Access Keys", value: "keys" }];
}

function formatStorage(connection: ConnectionProfile) {
  if (connection.storageType === "local") return "Local Filesystem";
  return connection.s3?.endpoint ? "MinIO / S3 Compatible" : "AWS S3";
}

function formatCatalog(connection: ConnectionProfile) {
  if (connection.queryEngine === "athena") return "AWS Glue";
  return connection.storageType === "local" ? "Hadoop" : "REST/S3";
}

function formatStorageFromForm(form: FormState) {
  return storageLabel(form.storageProvider);
}

function formatCatalogFromForm(form: FormState) {
  return catalogLabel(form.catalogProvider);
}

function storageLabel(storage: StorageProvider) {
  return storageOptions().find((option) => option.value === storage)?.label ?? storage;
}

function catalogLabel(catalog: CatalogProvider) {
  return catalogOptions().find((option) => option.value === catalog)?.label ?? catalog;
}

function authLabel(authMode: AuthMode) {
  return authMode.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase());
}

function formatEngine(engine: QueryEngine) {
  if (engine === "duckdb") return "DuckDB";
  if (engine === "athena") return "Athena";
  return "DataFusion";
}

function optionalValue(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function newConnectionId() {
  return globalThis.crypto?.randomUUID?.() ?? `conn-${Date.now()}`;
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
