// Document vault (§5.4) — the owner uploads vaccination / flea-worm records so
// they're never lost the night before a kennel stay. Files are private; viewing
// opens a short-lived signed URL.
import { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { Camera, File, FileArrowUp, FileText, FolderOpen, Image, ShareFat, Trash, type Icon } from "../../components/icons";
import { AppAlert } from "../../stores/appAlert";
import { useFocusEffect } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import EditShell from "../../components/EditShell";
import ConfirmModal from "../../components/ConfirmModal";
import { colors } from "@quirksandall/shared";
import { useActivePetStore } from "../../stores/activePet";
import { listDocuments, uploadDocument, removeDocument, documentSignedUrl, shareDocument, type NewDocument } from "../../lib/documents";
import { ensureCameraPermission } from "../../lib/photoPermission";

// Tinted per kind — a scannable colour cue rather than every document
// looking identical regardless of what it actually is. Reuses tokens
// already in the palette (success/caution) rather than inventing new ones.
const KINDS = [
  { key: "vaccination", label: "Vaccination", tint: colors.success, tintBg: "rgba(70,112,73,0.12)" },
  { key: "flea_worm", label: "Flea & worm", tint: colors.caution, tintBg: "rgba(127,90,48,0.12)" },
  { key: "insurance", label: "Insurance", tint: colors.textDark, tintBg: "rgba(81,0,0,0.08)" },
  { key: "other", label: "Other", tint: colors.primary, tintBg: colors.secondary },
] as const;
const kindLabel = (k: string) => KINDS.find((x) => x.key === k)?.label ?? "Document";
const kindMeta = (k: string) => KINDS.find((x) => x.key === k) ?? KINDS[2];

// Returns the icon COMPONENT — Phosphor icons are components, not names.
function iconFor(mime?: string): Icon {
  if (!mime) return File;
  if (mime === "application/pdf") return FileText;
  if (mime.startsWith("image/")) return Image;
  return File;
}

export default function Documents() {
  const { petId } = useActivePetStore();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<any>(null);

  const load = useCallback(() => {
    if (!petId) { setLoading(false); return; }
    listDocuments(petId)
      .then((d) => { setDocs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [petId]);
  useFocusEffect(load);

  // Pick the kind after choosing a file — a two-tap flow that avoids a whole
  // pending-upload form for the common case.
  const askKindAndUpload = (file: Omit<NewDocument, "kind" | "petId">) => {
    AppAlert.alert("What kind of document?", file.fileName, [
      ...KINDS.map((k) => ({ text: k.label, onPress: () => doUpload({ ...file, kind: k.key }) })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  const doUpload = async (file: Omit<NewDocument, "petId">) => {
    if (!petId) return;
    setBusy(true);
    try {
      await uploadDocument({ ...file, petId });
      load();
    } catch (e: any) {
      AppAlert.alert("Upload failed", e.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  // kind, when given (tapping a specific category's "Add ___ document" row),
  // skips the "What kind of document?" prompt — the category is already implied.
  const pickFile = async (kind?: string) => {
    const res = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const file = { uri: a.uri, fileName: a.name, mimeType: a.mimeType ?? undefined, sizeBytes: a.size ?? undefined };
    if (kind) doUpload({ ...file, kind }); else askKindAndUpload(file);
  };

  const takePhoto = async (kind?: string) => {
    const ok = await ensureCameraPermission("Photograph a document — a vaccination card, a vet letter — straight into the vault.");
    if (!ok) return;
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const file = { uri: a.uri, fileName: a.fileName ?? `photo-${Date.now()}.jpg`, mimeType: a.mimeType ?? "image/jpeg", sizeBytes: a.fileSize ?? undefined };
    if (kind) doUpload({ ...file, kind }); else askKindAndUpload(file);
  };

  // Per-document rather than multi-select: the OS share sheet takes one
  // attachment at a time on both platforms, so a "select several" mode would
  // only be able to send them one after another anyway.
  const [sharingId, setSharingId] = useState<string | null>(null);
  const share = async (doc: any) => {
    setSharingId(doc.id);
    try {
      await shareDocument(doc.storage_path, doc.file_name ?? doc.title ?? "document", doc.mime_type);
    } catch (e: any) {
      AppAlert.alert("Couldn't share that", e.message ?? "Try again.");
    } finally {
      setSharingId(null);
    }
  };

  const view = async (storagePath: string) => {
    try {
      const url = await documentSignedUrl(storagePath);
      await Linking.openURL(url);
    } catch (e: any) {
      AppAlert.alert("Couldn't open that", e.message ?? "Try again.");
    }
  };

  const addToKind = (kind: string) => {
    AppAlert.alert(`Add ${kindLabel(kind).toLowerCase()} document`, undefined, [
      { text: "Choose file", onPress: () => pickFile(kind) },
      { text: "Take photo", onPress: () => takePhoto(kind) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const doRemove = async () => {
    const doc = removeTarget;
    setRemoveTarget(null);
    if (!doc) return;
    try { await removeDocument(doc.id, doc.storage_path); load(); }
    catch (e: any) { AppAlert.alert("Couldn't remove", e.message); }
  };

  return (
    <EditShell
      title="Documents Vault"
      subtitle="Vaccination certificates, flea & worm records — the proof a kennel asks for. Kept private; only you can see these."
      onSave={() => {}}
      hideSave
      loading={loading}
    >
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
        <AddButton icon={FileArrowUp} label="Choose file" onPress={pickFile} disabled={busy} primary />
        <AddButton icon={Camera} label="Take photo" onPress={takePhoto} disabled={busy} />
      </View>

      {busy && (
        <View style={{ marginBottom: 16, alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {docs.length === 0 && (
        <View style={{ alignItems: "center", paddingVertical: 28, paddingHorizontal: 24, marginBottom: 4 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <FolderOpen size={26} weight="duotone" color={colors.primary} />
          </View>
          <Text style={{ color: colors.textDark, fontSize: 15, fontFamily: "Satoshi-Bold", textAlign: "center" }}>
            Nothing in the vault yet
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 6, fontFamily: "Satoshi-Light", textAlign: "center", lineHeight: 19 }}>
            Vaccination or flea & worm records — add them now so they're not a scramble the night before a stay.
          </Text>
        </View>
      )}

      <View style={{ gap: 18 }}>
        {/* Grouped by the kind chosen at upload (#9) — the categorisation
            already happens in the add flow, so the list just honours it.
            Every kind always shows, even empty — a dashed "Add ___ document"
            row in that kind's tint, rather than only surfacing once
            something's already been uploaded to it. */}
        {KINDS.map((k) => {
          const kindDocs = docs.filter((d) => d.kind === k.key);
          return (
          <View key={k.key} style={{ gap: 10 }}>
          <Text style={{ color: colors.textMuted, fontSize: 11, fontFamily: "Satoshi-Medium", textTransform: "uppercase", letterSpacing: 0.5 }}>
            {k.label}
          </Text>
          {kindDocs.map((doc) => (
            <View key={doc.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14 }}>
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: k.tintBg, alignItems: "center", justifyContent: "center" }}>
                {(() => { const DocIcon = iconFor(doc.mime_type); return <DocIcon size={18} weight="duotone" color={k.tint} />; })()}
              </View>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => view(doc.storage_path)} activeOpacity={0.7}>
                <Text numberOfLines={1} style={{ color: colors.textDark, fontSize: 14, fontFamily: "Satoshi-Medium" }}>{doc.title || doc.file_name}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2, fontFamily: "Satoshi-Light" }}>
                  {new Date(doc.uploaded_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => share(doc)}
                disabled={sharingId === doc.id}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                style={{ opacity: sharingId === doc.id ? 0.4 : 1 }}
              >
                {sharingId === doc.id
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <ShareFat size={18} color={colors.primary} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setRemoveTarget(doc)} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}>
                <Trash size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
          {kindDocs.length ? (
            // Already has a file in this kind — a small inline link (same
            // pattern as "+ Add another treat/allergy" elsewhere) rather
            // than the full dashed box, which is there to invite a first
            // upload, not to repeat itself once that job's done.
            <TouchableOpacity onPress={() => addToKind(k.key)} disabled={busy} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }} style={{ opacity: busy ? 0.5 : 1 }}>
              <Text style={{ color: colors.primary, fontSize: 12, fontFamily: "Satoshi-Medium" }}>+ Add another document</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => addToKind(k.key)}
              disabled={busy}
              activeOpacity={0.85}
              style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                paddingHorizontal: 14, paddingVertical: 14,
                borderRadius: 12, borderWidth: 1.5, borderColor: k.tint, borderStyle: "dashed",
                opacity: busy ? 0.5 : 1,
              }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: k.tintBg, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: k.tint, fontSize: 18, lineHeight: 18 }}>+</Text>
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 14, fontFamily: "Satoshi-Medium" }}>
                Add {k.label.toLowerCase()} document
              </Text>
            </TouchableOpacity>
          )}
          </View>
          );
        })}
      </View>

      <ConfirmModal
        visible={!!removeTarget}
        title="Remove this document?"
        message={removeTarget?.file_name}
        confirmLabel="Remove"
        destructive
        onConfirm={doRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </EditShell>
  );
}

// "Choose file" renders as the dark primary tile (matching the app's other
// dark-card CTAs — emergency block, unlock module) so the top of the screen
// isn't just more blush-on-white; "Take photo" stays the lighter secondary
// action beside it.
function AddButton({ icon: AddIcon, label, onPress, disabled, primary }: { icon: Icon; label: string; onPress: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={{
        flex: 1,
        height: 88,
        borderRadius: 14,
        borderWidth: primary ? 0 : 1,
        borderColor: colors.border,
        backgroundColor: primary ? colors.cardDark : "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {/* Dashed-circle icon badge — same "something goes here" motif as the
          dashboard's add-a-link row, instead of a bare dashed rectangle. */}
      <View
        style={{
          width: 36, height: 36, borderRadius: 18,
          borderWidth: primary ? 0 : 1.5,
          borderColor: colors.dashedBorder,
          borderStyle: primary ? "solid" : "dashed",
          backgroundColor: primary ? "rgba(248,236,238,0.15)" : "transparent",
          alignItems: "center", justifyContent: "center",
        }}
      >
        <AddIcon size={16} weight="duotone" color={primary ? colors.cardDarkText : colors.primary} />
      </View>
      <Text style={{ color: primary ? colors.cardDarkText : colors.textDark, fontSize: 13, fontFamily: "Satoshi-Medium" }}>{label}</Text>
    </TouchableOpacity>
  );
}
