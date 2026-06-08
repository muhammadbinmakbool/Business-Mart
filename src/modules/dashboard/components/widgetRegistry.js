import {
  SummaryCardsWidget,
  RecentActivityWidget,
  PendingAttentionWidget,
  ChartsWidget,
  QuickActionsWidget
} from "./DashboardWidgets";

/**
 * Widget Registry Configuration
 * Future-proofs widget placement: widgets can be disabled, reordered,
 * or mapped to custom grid sizes.
 */
export const WIDGET_REGISTRY = [
  {
    id: "quickActions",
    name: "Quick Shortcut Actions",
    component: QuickActionsWidget,
    enabled: true,
    gridClass: "col-span-full"
  },
  {
    id: "summaryCards",
    name: "Summary Statistics",
    component: SummaryCardsWidget,
    enabled: true,
    gridClass: "col-span-full"
  },
  {
    id: "charts",
    name: "Business Movement Visualizer",
    component: ChartsWidget,
    enabled: true,
    gridClass: "col-span-full lg:col-span-8"
  },
  {
    id: "pendingAttention",
    name: "Pending Attention Items",
    component: PendingAttentionWidget,
    enabled: true,
    gridClass: "col-span-full lg:col-span-4 lg:row-span-2"
  },
  {
    id: "recentActivity",
    name: "System Activity Feed",
    component: RecentActivityWidget,
    enabled: true,
    gridClass: "col-span-full lg:col-span-8"
  }
];
