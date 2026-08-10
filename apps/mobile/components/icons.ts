// The app's icon set — Phosphor (https://phosphoricons.com), drawn as SVG via
// react-native-svg rather than glyphs from an icon font.
//
// Import icons from HERE, never from "phosphor-react-native" directly. The
// package's barrel re-exports all ~1500 icons, and Metro does not tree-shake,
// so a single barrel import drags roughly 26MB of icon source into the bundle.
// The per-icon subpath used below is a published entry point (see the
// "./src/icons/*" key in the package's exports map), so this is a supported
// deep import rather than reaching into internals — and only the icons listed
// here are bundled.
//
// Adding an icon: find it at phosphoricons.com, add a line below in
// alphabetical order. Weights are per-usage — `weight="fill"` where a solid
// glyph is wanted, otherwise the default regular stroke.
export { type Icon, type IconProps, type IconWeight } from "phosphor-react-native";

export { AirplaneTilt } from "phosphor-react-native/src/icons/AirplaneTilt";
export { Bell } from "phosphor-react-native/src/icons/Bell";
export { CalendarBlank } from "phosphor-react-native/src/icons/CalendarBlank";
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
export { PencilSimple } from "phosphor-react-native/src/icons/PencilSimple";
export { Phone } from "phosphor-react-native/src/icons/Phone";
export { Plus } from "phosphor-react-native/src/icons/Plus";
export { ShareNetwork } from "phosphor-react-native/src/icons/ShareNetwork";
export { Trash } from "phosphor-react-native/src/icons/Trash";
export { UploadSimple } from "phosphor-react-native/src/icons/UploadSimple";
export { WarningCircle } from "phosphor-react-native/src/icons/WarningCircle";
export { X } from "phosphor-react-native/src/icons/X";
export { XCircle } from "phosphor-react-native/src/icons/XCircle";
