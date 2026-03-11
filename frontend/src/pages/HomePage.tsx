import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { bookingsApi } from "../api/bookings";
import { roomsApi } from "../api/rooms";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import type { Room } from "../types/api";

/**
 * Главная: фильтры и список комнат для авторизованных пользователей.
 */
export function HomePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [date, setDate] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [capacityMin, setCapacityMin] = useState("");
  const [search, setSearch] = useState("");
  const [amenities, setAmenities] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setRooms([]);
      setFilterError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFilterError(null);

    const params: { capacity_min?: number; search?: string; amenities?: string; sort_by?: string } = {
      sort_by: sortBy,
    };
    const parsedCapacity = Number.parseInt(capacityMin, 10);
    if (capacityMin.trim() && Number.isFinite(parsedCapacity) && parsedCapacity >= 1) {
      params.capacity_min = parsedCapacity;
    }
    if (search.trim()) params.search = search.trim();
    if (amenities.trim()) params.amenities = amenities.trim();

    const now = new Date();
    const baseDate = date || now.toISOString().slice(0, 10);

    let fromIso: string | null = null;
    let toIso: string | null = null;

    if (date || timeStart || timeEnd) {
      if (timeStart && timeEnd) {
        const from = new Date(`${baseDate}T${timeStart}:00`);
        const to = new Date(`${baseDate}T${timeEnd}:00`);
        if (to <= from) {
          setFilterError("Время окончания должно быть позже времени начала.");
        } else {
          fromIso = from.toISOString();
          toIso = to.toISOString();
        }
      } else if (timeStart && !timeEnd) {
        const from = new Date(`${baseDate}T${timeStart}:00`);
        const to = new Date(from.getTime() + 60 * 60 * 1000);
        fromIso = from.toISOString();
        toIso = to.toISOString();
      } else if (!timeStart && timeEnd) {
        const to = new Date(`${baseDate}T${timeEnd}:00`);
        const from = new Date(to.getTime() - 60 * 60 * 1000);
        fromIso = from.toISOString();
        toIso = to.toISOString();
      } else if (date) {
        const from = new Date(`${baseDate}T00:00:00`);
        const to = new Date(`${baseDate}T23:59:59`);
        fromIso = from.toISOString();
        toIso = to.toISOString();
      }
    }

    const roomsPromise = roomsApi.list(params);
    const bookingsPromise = fromIso && toIso
      ? bookingsApi.list({ from_time: fromIso, to_time: toIso })
      : Promise.resolve([]);

    Promise.all([roomsPromise, bookingsPromise])
      .then(([roomsData, bookingsData]) => {
        if (cancelled) return;
        if (fromIso && toIso) {
          const busyRoomIds = new Set(bookingsData.map((b) => b.room_id));
          setRooms(roomsData.filter((r) => !busyRoomIds.has(r.id)));
        } else {
          setRooms(roomsData);
        }
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
  }, [user, capacityMin, search, amenities, sortBy, date, timeStart, timeEnd]);

  const shownCount = useMemo(() => rooms.length, [rooms]);

  const handleSearchClick = () => {
    if (!user) {
      setSearchModalOpen(true);
      return;
    }
    const listAnchor = document.getElementById("rooms-list");
    listAnchor?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-r from-blue-900 to-blue-700 text-white px-6 py-10 shadow-lg">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">{t("home", "title")}</h1>
        <p className="text-blue-100 max-w-2xl mb-6">{t("home", "subtitle")}</p>

        <div className="bg-white rounded-xl shadow-md p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-gray-800">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("home", "date")}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("home", "timeStart")}</label>
            <input
              type="time"
              value={timeStart}
              onChange={(e) => setTimeStart(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("home", "timeEnd")}</label>
            <input
              type="time"
              value={timeEnd}
              onChange={(e) => setTimeEnd(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t("home", "people")}</label>
            <input
              type="number"
              min={1}
              value={capacityMin}
              onChange={(e) => setCapacityMin(e.target.value)}
              placeholder="Например, 5"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Поиск по названию</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Например, Room A"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Удобства</label>
            <input
              type="text"
              value={amenities}
              onChange={(e) => setAmenities(e.target.value)}
              placeholder="Например, Проектор"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Сортировка</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name_asc">По названию (А-Я)</option>
              <option value="name_desc">По названию (Я-А)</option>
              <option value="capacity_asc">По вместимости (возр.)</option>
              <option value="capacity_desc">По вместимости (убыв.)</option>
              <option value="newest">Сначала новые</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSearchClick}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-md px-6 py-2.5 text-sm text-center transition-colors"
            >
              {t("home", "search")}
            </button>
          </div>
        </div>
        {filterError && <p className="mt-3 text-sm text-red-200">{filterError}</p>}
      </section>

      {user ? (
        <section id="rooms-list" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Доступные комнаты</h2>
            <span className="text-sm text-gray-500">Найдено: {shownCount}</span>
          </div>

          {loading ? (
            <p className="text-gray-500">Загрузка комнат...</p>
          ) : rooms.length === 0 ? (
            <p className="text-gray-500">По выбранным фильтрам комнат не найдено.</p>
          ) : (
            <ul className="space-y-3">
              {rooms.map((room) => {
                const photoUrl = room.photos && room.photos.length > 0 ? room.photos[0].url : null;
                return (
                  <li key={room.id}>
                    <Link
                      to={`/rooms/${room.id}`}
                      className="flex flex-col sm:flex-row bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-blue-400 transition-all"
                    >
                      <div className="sm:w-52 h-40 sm:h-auto bg-gray-100 shrink-0">
                        {photoUrl ? (
                          <img src={photoUrl} alt={room.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">Нет фото</div>
                        )}
                      </div>
                      <div className="p-4 flex-1 space-y-2">
                        <h3 className="font-semibold text-gray-900">{room.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">{room.description ?? "Описание не указано"}</p>
                        <p className="text-sm text-gray-500">Вместимость: {room.capacity}</p>
                        <p className="text-sm text-gray-500">Удобства: {room.amenities ?? "—"}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">Просмотр комнат после входа</h2>
          <p className="text-gray-600">Чтобы увидеть доступные комнаты с фотографиями и фильтрами, войдите в аккаунт.</p>
          <div className="flex gap-3">
            <Link to="/login" className="text-sm text-blue-700 hover:underline">Войти</Link>
            <Link to="/register" className="text-sm text-blue-700 hover:underline">Зарегистрироваться</Link>
          </div>
        </section>
      )}

      {searchModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSearchModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="search-auth-title"
        >
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 id="search-auth-title" className="text-lg font-semibold text-gray-900">
              Для поиска комнат необходимо зарегистрироваться или войти.
            </h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearchModalOpen(false);
                  navigate("/login");
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-md transition-colors"
              >
                Войти
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchModalOpen(false);
                  navigate("/register");
                }}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium py-2.5 rounded-md transition-colors"
              >
                Зарегистрироваться
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
