import { Types } from "mongoose";
import { AppShortcut } from "@/models/AppShortcut";

export type ShortcutSource = "system" | "custom";

export type ShortcutOrderEntry = {
  id: string;
  source: ShortcutSource;
};

export type ShortcutItem = {
  id: string;
  source: ShortcutSource;
  url: string;
  category: string;
  name: string | null;
  title: string | null;
  iconUrl: string | null;
};

export type MyAppShortcutsUserShape = {
  myAppShortcutIds?: Array<Types.ObjectId | { toString(): string }>;
  myCustomAppShortcuts?: Array<{
    _id: Types.ObjectId | { toString(): string };
    url: string;
    category?: string;
    name?: string | null;
    title?: string | null;
    iconUrl?: string | null;
  }>;
  myAppShortcutOrder?: Array<{
    id: Types.ObjectId | { toString(): string } | string;
    source: ShortcutSource;
  }> | null;
};

function toShortcutKey(entry: ShortcutOrderEntry) {
  return `${entry.source}:${entry.id}`;
}

export function buildShortcutOrder(params: {
  storedOrder?: Array<{ id: { toString(): string } | string; source: ShortcutSource }> | null;
  systemShortcutIds: string[];
  customShortcutIds: string[];
}) {
  const { storedOrder, systemShortcutIds, customShortcutIds } = params;
  const validEntries = [
    ...systemShortcutIds.map((id) => ({ id, source: "system" as const })),
    ...customShortcutIds.map((id) => ({ id, source: "custom" as const })),
  ];
  const validKeys = new Set(validEntries.map(toShortcutKey));
  const seenKeys = new Set<string>();
  const normalized: ShortcutOrderEntry[] = [];

  for (const item of storedOrder ?? []) {
    const entry = {
      id: item.id.toString(),
      source: item.source,
    };
    const key = toShortcutKey(entry);

    if (!validKeys.has(key) || seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    normalized.push(entry);
  }

  for (const entry of validEntries) {
    const key = toShortcutKey(entry);

    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    normalized.push(entry);
  }

  return normalized;
}

export function isSameShortcutOrder(
  left: ShortcutOrderEntry[],
  right: ShortcutOrderEntry[],
) {
  return (
    left.length === right.length &&
    left.every((item, index) => {
      const other = right[index];
      return other && item.id === other.id && item.source === other.source;
    })
  );
}

export async function buildOrderedShortcutItems(user: MyAppShortcutsUserShape) {
  const systemShortcutIds = (user.myAppShortcutIds ?? []).map((item) => item.toString());
  const customShortcuts: ShortcutItem[] = (user.myCustomAppShortcuts ?? []).map((item) => ({
    id: item._id.toString(),
    source: "custom",
    url: item.url,
    category: item.category ?? "Custom",
    name: item.name ?? null,
    title: item.title ?? null,
    iconUrl: item.iconUrl ?? null,
  }));

  const systemShortcuts = systemShortcutIds.length
    ? await AppShortcut.find({ _id: { $in: systemShortcutIds } }).lean()
    : [];

  const systemById = new Map<string, ShortcutItem>(
    systemShortcuts.map((item) => [
      item._id.toString(),
      {
        id: item._id.toString(),
        source: "system",
        url: item.url,
        category: item.category ?? "Custom",
        name: item.name ?? null,
        title: item.title ?? null,
        iconUrl: item.iconUrl ?? null,
      },
    ]),
  );

  const customById = new Map(customShortcuts.map((item) => [item.id, item]));
  const order = buildShortcutOrder({
    storedOrder: user.myAppShortcutOrder ?? [],
    systemShortcutIds,
    customShortcutIds: customShortcuts.map((item) => item.id),
  });

  return {
    order,
    data: order
      .map((entry) =>
        entry.source === "system"
          ? systemById.get(entry.id)
          : customById.get(entry.id),
      )
      .filter((item): item is ShortcutItem => Boolean(item)),
  };
}
