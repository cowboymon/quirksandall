// The app's icon set — Phosphor (https://phosphoricons.com), drawn as SVG via
// react-native-svg rather than glyphs from an icon font.
//
// Import icons from HERE, never from "phosphor-react-native" directly. The
// package's barrel re-exports all ~1500 icons, and Metro does not tree-shake,
// so a single barrel import drags roughly 26MB of icon source into the bundle.
// Measured on this app (expo export, iOS): barrel = 12.3 MB bundle,
// per-icon = 5.49 MB. The per-icon modules pull in only an icon-base and that
// icon's own path data, never the barrel.
//
// The "./src/icons/*" subpath below is published in the package's exports
// map, so both TypeScript and Metro resolve it. (lib/module/icons/* also
// bundles, but TypeScript refuses it — the exports map doesn't list it.)
//
// NOTE: Metro caches its module map, so a newly added icon may fail to
// resolve until you restart with `npx expo start -c`.
//
// Adding an icon: find it at phosphoricons.com, add its import and export
// below in alphabetical order.

import React from "react";
import type { Icon, IconProps, IconWeight } from "phosphor-react-native";

import { AirplaneTilt as AirplaneTiltBase } from "phosphor-react-native/src/icons/AirplaneTilt";
import { Bell as BellBase } from "phosphor-react-native/src/icons/Bell";
import { CalendarDots as CalendarDotsBase } from "phosphor-react-native/src/icons/CalendarDots";
import { Camera as CameraBase } from "phosphor-react-native/src/icons/Camera";
import { CaretDown as CaretDownBase } from "phosphor-react-native/src/icons/CaretDown";
import { CaretLeft as CaretLeftBase } from "phosphor-react-native/src/icons/CaretLeft";
import { CaretRight as CaretRightBase } from "phosphor-react-native/src/icons/CaretRight";
import { CaretUp as CaretUpBase } from "phosphor-react-native/src/icons/CaretUp";
import { Check as CheckBase } from "phosphor-react-native/src/icons/Check";
import { Eye as EyeBase } from "phosphor-react-native/src/icons/Eye";
import { EyeSlash as EyeSlashBase } from "phosphor-react-native/src/icons/EyeSlash";
import { File as FileBase } from "phosphor-react-native/src/icons/File";
import { FileArrowUp as FileArrowUpBase } from "phosphor-react-native/src/icons/FileArrowUp";
import { FileText as FileTextBase } from "phosphor-react-native/src/icons/FileText";
import { FolderOpen as FolderOpenBase } from "phosphor-react-native/src/icons/FolderOpen";
import { Image as ImageBase } from "phosphor-react-native/src/icons/Image";
import { Key as KeyBase } from "phosphor-react-native/src/icons/Key";
import { LinkSimple as LinkSimpleBase } from "phosphor-react-native/src/icons/LinkSimple";
import { LockSimple as LockSimpleBase } from "phosphor-react-native/src/icons/LockSimple";
import { MagnifyingGlass as MagnifyingGlassBase } from "phosphor-react-native/src/icons/MagnifyingGlass";
import { MapPin as MapPinBase } from "phosphor-react-native/src/icons/MapPin";
import { PencilLine as PencilLineBase } from "phosphor-react-native/src/icons/PencilLine";
import { PencilSimpleLine as PencilSimpleLineBase } from "phosphor-react-native/src/icons/PencilSimpleLine";
import { Phone as PhoneBase } from "phosphor-react-native/src/icons/Phone";
import { Plus as PlusBase } from "phosphor-react-native/src/icons/Plus";
import { ShareFat as ShareFatBase } from "phosphor-react-native/src/icons/ShareFat";
import { Trash as TrashBase } from "phosphor-react-native/src/icons/Trash";
import { WarningCircle as WarningCircleBase } from "phosphor-react-native/src/icons/WarningCircle";
import { X as XBase } from "phosphor-react-native/src/icons/X";
import { XCircle as XCircleBase } from "phosphor-react-native/src/icons/XCircle";

/** The weight every icon uses unless its call site says otherwise. One line
 * to restyle the whole app.
 *
 * Phosphor ships IconContext for exactly this, but it's a VALUE export from
 * the package barrel — importing it would pull all ~1500 icons back into the
 * bundle and undo the saving described above. Wrapping here keeps the
 * per-icon imports intact.
 */
export const DEFAULT_ICON_WEIGHT: IconWeight = "duotone";

// `{...props}` last, so an explicit weight at the call site still wins —
// e.g. the solid lock on the paid-feature pill.
function withDefaultWeight(Base: Icon, name: string): Icon {
  const Wrapped = (props: IconProps) => <Base weight={DEFAULT_ICON_WEIGHT} {...props} />;
  Wrapped.displayName = name;
  return Wrapped;
}

export const AirplaneTilt = withDefaultWeight(AirplaneTiltBase, "AirplaneTilt");
export const Bell = withDefaultWeight(BellBase, "Bell");
export const CalendarDots = withDefaultWeight(CalendarDotsBase, "CalendarDots");
export const Camera = withDefaultWeight(CameraBase, "Camera");
export const CaretDown = withDefaultWeight(CaretDownBase, "CaretDown");
export const CaretLeft = withDefaultWeight(CaretLeftBase, "CaretLeft");
export const CaretRight = withDefaultWeight(CaretRightBase, "CaretRight");
export const CaretUp = withDefaultWeight(CaretUpBase, "CaretUp");
export const Check = withDefaultWeight(CheckBase, "Check");
export const Eye = withDefaultWeight(EyeBase, "Eye");
export const EyeSlash = withDefaultWeight(EyeSlashBase, "EyeSlash");
export const File = withDefaultWeight(FileBase, "File");
export const FileArrowUp = withDefaultWeight(FileArrowUpBase, "FileArrowUp");
export const FileText = withDefaultWeight(FileTextBase, "FileText");
export const FolderOpen = withDefaultWeight(FolderOpenBase, "FolderOpen");
export const Image = withDefaultWeight(ImageBase, "Image");
export const Key = withDefaultWeight(KeyBase, "Key");
export const LinkSimple = withDefaultWeight(LinkSimpleBase, "LinkSimple");
export const LockSimple = withDefaultWeight(LockSimpleBase, "LockSimple");
export const MagnifyingGlass = withDefaultWeight(MagnifyingGlassBase, "MagnifyingGlass");
export const MapPin = withDefaultWeight(MapPinBase, "MapPin");
export const PencilLine = withDefaultWeight(PencilLineBase, "PencilLine");
export const PencilSimpleLine = withDefaultWeight(PencilSimpleLineBase, "PencilSimpleLine");
export const Phone = withDefaultWeight(PhoneBase, "Phone");
export const Plus = withDefaultWeight(PlusBase, "Plus");
export const ShareFat = withDefaultWeight(ShareFatBase, "ShareFat");
export const Trash = withDefaultWeight(TrashBase, "Trash");
export const WarningCircle = withDefaultWeight(WarningCircleBase, "WarningCircle");
export const X = withDefaultWeight(XBase, "X");
export const XCircle = withDefaultWeight(XCircleBase, "XCircle");

export type { Icon, IconProps, IconWeight };
