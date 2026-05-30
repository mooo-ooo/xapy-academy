import {
  Activity,
  BarChart3,
  BookOpen,
  Brain,
  Code2,
  FileText,
  Folder,
  Globe,
  Languages,
  LayoutDashboard,
  LineChart,
  ScrollText,
  Sigma,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Single source of truth for module icons. The admin icon picker and the
 * public `ModuleNav` both read this map, so a chosen name always renders
 * (and never drifts between picker and renderer). Unknown names → Globe.
 */
export const MODULE_ICONS: Record<string, LucideIcon> = {
  Activity,
  BarChart3,
  LineChart,
  Brain,
  Sigma,
  Code2,
  BookOpen,
  FileText,
  Folder,
  Globe,
  Languages,
  LayoutDashboard,
  ScrollText,
  Users,
};

export const MODULE_ICON_NAMES = Object.keys(MODULE_ICONS);

export function moduleIcon(name: string | null | undefined): LucideIcon {
  return name ? (MODULE_ICONS[name] ?? Globe) : Globe;
}
