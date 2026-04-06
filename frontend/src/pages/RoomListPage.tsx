import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { mediaUrl } from "../api/client";
import { EmptyStateCard } from "../components/EmptyStateCard";
import { SkeletonBlocks } from "../components/SkeletonBlocks";
import { useFavoriteRooms } from "../hooks/useFavoriteRooms";
import { roomsApi } from "../api/rooms";
import type { Room } from "../types/api";

/**
 * Список комнат с фильтрами (вместимость, поиск). Заглушка до реализации API.
 */
export function RoomListPage() {
  const { isFavorite, toggleFavorite } = useFavoriteRooms();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [capacityMin, setCapacityMin] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params: { capacity_min?: number; search?: string } = {};
    if (capacityMin) params.capacity_min = parseInt(capacityMin, 10);
    if (search.trim()) params.search = search.trim();
    roomsApi
      .list(params)
      .then((data) => {
        if (!cancelled) setRooms(data);
      })
      .catch(() => {
        if (!cancelled) setRooms([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [capacityMin, search]);

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Левая колонка — фильтры, как сайдбар на booking */}
      <aside className="md:w-64 bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-fit">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">
          Фильтры
        </h2>
        <div className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Поиск по названию
            </label>
            <input
              type="text"
              placeholder="Например: Комната 1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Мин. вместимость
            </label>
            <input
              type="number"
              placeholder="От 2"
              min={1}
              value={capacityMin}
              onChange={(e) => setCapacityMin(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </aside>

      {/* Правая колонка — список карточек */}
      <section className="flex-1">
        <h1 className="text-2xl font-semibold mb-2">Комнаты</h1>
        <p className="text-sm text-gray-600 mb-4">
          Выберите подходящую переговорную и перейдите к просмотру календаря и
          бронированию.
        </p>

        {loading ? (
          <SkeletonBlocks count={3} className="h-28" />
        ) : rooms.length === 0 ? (
          <EmptyStateCard
            title="Комнат пока нет"
            hint="Попробуйте изменить фильтры или вернуться на главную."
            actionLabel="Перейти на главную"
            actionTo="/"
          />
        ) : (
          <ul className="space-y-3">
            {rooms.map((room) => (
              <li key={room.id}>
                <div className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-500 hover:shadow-md transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {room.photos?.[0]?.url ? (
                      <img
                        src={mediaUrl(room.photos[0].url)}
                        alt={room.name}
                        className="w-full sm:w-40 h-24 object-cover rounded-md border border-gray-200"
                      />
                    ) : (
                      <div className="w-full sm:w-40 h-24 rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-400 flex items-center justify-center">
                        Нет фото
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <Link to={`/rooms/${room.id}`} className="font-semibold text-gray-900 text-sm sm:text-base hover:underline">
                          {room.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(room.id)}
                          className={isFavorite(room.id) ? "text-amber-500 text-lg" : "text-gray-300 hover:text-amber-500 text-lg"}
                          aria-label={isFavorite(room.id) ? "Убрать из избранного" : "Добавить в избранное"}
                        >
                          ★
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
                        {room.description ?? "Описание не указано"}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        Вместимость: {room.capacity}
                      </p>
                      {room.amenities && (
                        <p className="text-[11px] text-gray-500 mt-1">
                          Удобства: {room.amenities}
                        </p>
                      )}
                    </div>
                    <div className="sm:w-32 flex sm:flex-col justify-end items-end gap-2">
                      <span className="text-[11px] text-gray-500">
                        Доступность в календаре
                      </span>
                      <Link to={`/rooms/${room.id}`} className="inline-flex items-center justify-center bg-blue-600 text-white text-xs font-medium rounded-md px-3 py-1">
                        Смотреть
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
