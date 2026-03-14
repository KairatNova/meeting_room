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
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const hasAdvancedFilters = Boolean(sortBy !== "name_asc" || region || city || district || address);

  useEffect(() => {
    if (!user) {
      setRooms([]);
      setFilterError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFilterError(null);

    const params: {
      capacity_min?: number;
      search?: string;
      amenities?: string;
      region?: string;
      city?: string;
      district?: string;
      address?: string;
      sort_by?: string;
    } = {
      sort_by: sortBy,
    };
    const parsedCapacity = Number.parseInt(capacityMin, 10);
    if (capacityMin.trim() && Number.isFinite(parsedCapacity) && parsedCapacity >= 1) {
      params.capacity_min = parsedCapacity;
    }
    if (search.trim()) params.search = search.trim();
    if (amenities.trim()) params.amenities = amenities.trim();
    if (region.trim()) params.region = region.trim();
    if (city.trim()) params.city = city.trim();
    if (district.trim()) params.district = district.trim();
    if (address.trim()) params.address = address.trim();

    const now = new Date();
    const baseDate = date || now.toISOString().slice(0, 10);

    let fromIso: string | null = null;
    let toIso: string | null = null;

    if (date || timeStart || timeEnd) {
      if (timeStart && timeEnd) {
        const from = new Date(`${baseDate}T${timeStart}:00`);
        const to = new Date(`${baseDate}T${timeEnd}:00`);
        if (to <= from) {
          setFilterError(t("home", "endAfterStart"));
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
  }, [user, capacityMin, search, amenities, region, city, district, address, sortBy, date, timeStart, timeEnd]);

  const shownCount = useMemo(() => rooms.length, [rooms]);
  const hasActiveFilters = Boolean(
    date ||
      timeStart ||
      timeEnd ||
      capacityMin ||
      search ||
      amenities ||
      region ||
      city ||
      district ||
      address ||
      sortBy !== "name_asc"
  );

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    if (date) labels.push(`Дата: ${date}`);
    if (timeStart) labels.push(`Начало: ${timeStart}`);
    if (timeEnd) labels.push(`Окончание: ${timeEnd}`);
    if (capacityMin) labels.push(`Людей от: ${capacityMin}`);
    if (search) labels.push(`Название: ${search}`);
    if (amenities) labels.push(`Удобства: ${amenities}`);
    if (region) labels.push(`Область: ${region}`);
    if (city) labels.push(`Город: ${city}`);
    if (district) labels.push(`Район: ${district}`);
    if (address) labels.push(`Адрес: ${address}`);
    if (sortBy !== "name_asc") labels.push("Сортировка изменена");
    return labels;
  }, [address, amenities, capacityMin, city, date, district, region, search, sortBy, timeEnd, timeStart]);

  const resetFilters = () => {
    setDate("");
    setTimeStart("");
    setTimeEnd("");
    setCapacityMin("");
    setSearch("");
    setAmenities("");
    setRegion("");
    setCity("");
    setDistrict("");
    setAddress("");
    setSortBy("name_asc");
    setShowAdvancedFilters(false);
  };

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
      <section className="rounded-2xl bg-gradient-to-r from-blue-900 to-blue-700 text-white px-6 py-8 shadow-lg">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">{t("home", "title")}</h1>
        <p className="text-blue-100 max-w-3xl mb-4">{t("home", "subtitle")}</p>

        <div className="app-card p-4 text-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div>
            <label className="field-label">{t("home", "date")}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">{t("home", "timeStart")}</label>
            <input
              type="time"
              value={timeStart}
              onChange={(e) => setTimeStart(e.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">{t("home", "timeEnd")}</label>
            <input
              type="time"
              value={timeEnd}
              onChange={(e) => setTimeEnd(e.target.value)}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">{t("home", "people")}</label>
            <input
              type="number"
              min={1}
              value={capacityMin}
              onChange={(e) => setCapacityMin(e.target.value)}
              placeholder="Например, 5"
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">{t("home", "searchByName")}</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Например, Room A"
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">{t("home", "amenities")}</label>
            <input
              type="text"
              value={amenities}
              onChange={(e) => setAmenities(e.target.value)}
              placeholder="Например, Проектор"
              className="field-input"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleSearchClick}
              className="btn-primary w-full"
            >
              {t("home", "search")}
            </button>
            <button type="button" onClick={resetFilters} className="btn-secondary">
              {t("home", "reset")}
            </button>
          </div>
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((v) => !v)}
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              {showAdvancedFilters ? t("home", "hideAdvancedFilters") : t("home", "showAdvancedFilters")}
            </button>
          </div>
          {(showAdvancedFilters || hasAdvancedFilters) && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              <div>
                <label className="field-label">{t("home", "sorting")}</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="field-input"
                >
                  <option value="name_asc">{t("home", "sortNameAsc")}</option>
                  <option value="name_desc">{t("home", "sortNameDesc")}</option>
                  <option value="capacity_asc">{t("home", "sortCapacityAsc")}</option>
                  <option value="capacity_desc">{t("home", "sortCapacityDesc")}</option>
                  <option value="newest">{t("home", "sortNewest")}</option>
                </select>
              </div>
              <div>
                <label className="field-label">{t("home", "region")}</label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="Например, Чуйская"
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">{t("home", "city")}</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Например, Бишкек"
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">{t("home", "district")}</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="Например, Октябрьский"
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">{t("home", "address")}</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Например, ул. Логвиненко 1"
                  className="field-input"
                />
              </div>
            </div>
          )}
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeFilterLabels.map((label) => (
                <span key={label} className="px-2.5 py-1 text-xs rounded-full bg-slate-100 text-slate-700">
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
        {filterError && <p className="mt-3 text-sm text-red-200">{filterError}</p>}
      </section>

      {user ? (
        <section id="rooms-list" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-gray-900">{t("home", "availableRooms")}</h2>
            <span className="text-sm text-gray-500">{t("home", "found")}: {shownCount}</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="app-card h-28 animate-pulse" />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="app-card p-5">
              <p className="empty-state">{t("home", "noRoomsByFilters")}</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {rooms.map((room) => {
                const photoUrl = room.photos && room.photos.length > 0 ? room.photos[0].url : null;
                return (
                  <li key={room.id}>
                    <Link
                      to={`/rooms/${room.id}`}
                      className="app-card flex flex-col sm:flex-row overflow-hidden hover:shadow-md hover:border-blue-400 transition-all"
                    >
                      <div className="sm:w-52 h-40 sm:h-auto bg-gray-100 shrink-0">
                        {photoUrl ? (
                          <img src={photoUrl} alt={room.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">{t("home", "noPhoto")}</div>
                        )}
                      </div>
                      <div className="p-4 flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-gray-900">{room.name}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{t("home", "free")}</span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{room.description ?? t("home", "noDescription")}</p>
                        <p className="text-sm text-gray-500">{t("home", "capacityLabel")}: {room.capacity}</p>
                        <p className="text-sm text-gray-500">{t("home", "amenitiesLabel")}: {room.amenities ?? "—"}</p>
                        <p className="text-sm text-gray-500">
                          {t("home", "locationLabel")}: {[room.region, room.city, room.district, room.address].filter(Boolean).join(", ") || "—"}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : (
        <section className="app-card p-5 space-y-3">
          <h2 className="text-xl font-semibold text-gray-900">{t("home", "authListTitle")}</h2>
          <p className="text-gray-600">{t("home", "authListHint")}</p>
          <div className="flex gap-3">
            <Link to="/login" className="text-sm text-blue-700 hover:underline">{t("auth", "signIn")}</Link>
            <Link to="/register" className="text-sm text-blue-700 hover:underline">{t("auth", "signUp")}</Link>
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
              {t("home", "authRequiredModal")}
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
                {t("auth", "signIn")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchModalOpen(false);
                  navigate("/register");
                }}
                className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium py-2.5 rounded-md transition-colors"
              >
                {t("auth", "signUp")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
