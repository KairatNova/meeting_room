import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "favorite_room_ids";

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

export function useFavoriteRooms() {
  const [ids, setIds] = useState<number[]>([]);

  useEffect(() => {
    setIds(parseIds(localStorage.getItem(STORAGE_KEY)));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids]);

  const setFavorite = (roomId: number, isFavorite: boolean) => {
    if (!Number.isInteger(roomId) || roomId <= 0) return;
    setIds((prev) => {
      if (isFavorite) {
        if (prev.includes(roomId)) return prev;
        return [roomId, ...prev];
      }
      return prev.filter((id) => id !== roomId);
    });
  };

  const toggleFavorite = (roomId: number) => {
    setIds((prev) => {
      if (prev.includes(roomId)) return prev.filter((id) => id !== roomId);
      return [roomId, ...prev];
    });
  };

  const isFavorite = (roomId: number) => ids.includes(roomId);

  return useMemo(
    () => ({
      favoriteIds: ids,
      isFavorite,
      setFavorite,
      toggleFavorite,
    }),
    [ids]
  );
}

