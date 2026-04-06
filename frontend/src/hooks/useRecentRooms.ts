import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "recent_room_ids";
const MAX_RECENT = 12;

function parseIds(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .map((x) => Number(x))
      .filter((x) => Number.isInteger(x) && x > 0);
  } catch {
    return [];
  }
}

export function useRecentRooms() {
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    setIds(parseIds(localStorage.getItem(STORAGE_KEY)));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids]);

  const pushRecent = (roomId: number) => {
    if (!Number.isInteger(roomId) || roomId <= 0) return;
    setIds((prev) => {
      const next = [roomId, ...prev.filter((x) => x !== roomId)].slice(0, MAX_RECENT);
      if (next.length === prev.length && next.every((x, i) => x === prev[i])) return prev;
      return next;
    });
  };

  return useMemo(
    () => ({
      recentRoomIds: ids,
      pushRecent,
    }),
    [ids]
  );
}

