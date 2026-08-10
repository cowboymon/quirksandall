// The app's icon set — Phosphor (https://phosphoricons.com), drawn as SVG via
// react-native-svg rather than glyphs from an icon font.
//
// Import icons from HERE, never from "phosphor-react-native" directly. The
// package's barrel re-exports all ~1500 icons, and Metro does not tree-shake,
// so a single barrel import drags roughly 26MB of icon source into the bundle.
// Measured on this app (expo export, iOS): barrel = 12.3 MB bundle,
// per-icon = 5.48 MB. The per-icon modules pull in only an icon-base and
// that icon's own path data, never the barrel.
//
// The "./src/icons/*" subpath below is published in the package's exports
// map, so both TypeScript and Metro resolve it. (lib/module/icons/* also
// bundles, but TypeScript refuses it — the exports map doesn't list it.)
//
// NOTE: Metro caches its module map, so a newly added icon may fail to
// resolve until you restart with `npx expo start -c`.
//
// Adding an icon: find it at phosphoricons.com, add a line below in
// alphabetical order. Weights are per-usage — `weight="fill"` where a solid
// glyph is wanted, otherwise the default regular stroke.
// `export type` (not `export { type ... }`) so this is guaranteed to be
// erased at compile time. If it survived as a runtime import it would pull
// the barrel back in and undo everything above.
export type { Icon, IconProps, IconWeight } from "phosphor-react-native";

export { AirplaneTilt } from "phosphor-react-native/src/icons/AirplaneTilt";
export { Bell } from "phosphor-react-native/src/icons/Bell";
export { CalendarDots } from "phosphor-react-native/src/icons/CalendarDots";
export { Camera } from "phosphor-react-native/src/icons/Camera";
export { CaretDown } from "phosphor-react-native/src/icons/CaretDown";
export { CaretLeft } from "phosphor-react-native/src/icons/CaretLeft";
export { CaretRight } from "phosphor-react-native/src/icons/CaretRight";
export { CaretUp } from "phosphor-react-native/src/icons/CaretUp";
export { Check } from "phosphor-react-native/src/icons/Check";
export { Eye } from "phosphor-react-native/src/icons/Eye";
export { EyeSlash } from "phosphor-react-native/src/icons/EyeSlash";
export { File } from "phosphor-react-native/src/icons/File";
export { FileText } from "phosphor-react-native/src/icons/FileText";
export { FolderOpen } from "phosphor-react-native/src/icons/FolderOpen";
export { Image } from "phosphor-react-native/src/icons/Image";
export { Key } from "phosphor-react-native/src/icons/Key";
export { LinkSimple } from "phosphor-react-native/src/icons/LinkSimple";
export { LockSimple } from "phosphor-react-native/src/icons/LockSimple";
export { MagnifyingGlass } from "phosphor-react-native/src/icons/MagnifyingGlass";
export { MapPin } from "phosphor-react-native/src/icons/MapPin";
export { PencilLine } from "phosphor-react-native/src/icons/PencilLine";
export { Phone } from "phosphor-react-native/src/icons/Phone";
export { Plus } from "phosphor-react-native/src/icons/Plus";
export { ShareFat } from "phosphor-react-native/src/icons/ShareFat";
export { Trash } from "phosphor-react-native/src/icons/Trash";
export { UploadSimple } from "phosphor-react-native/src/icons/UploadSimple";
export { WarningCircle } from "phosphor-react-native/src/icons/WarningCircle";
export { X } from "phosphor-react-native/src/icons/X";
export { XCircle } from "phosphor-react-native/src/icons/XCircle";
