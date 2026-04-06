import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { bookingsApi } from "../api/bookings";
import { EmptyStateCard } from "../components/EmptyStateCard";
import type { Booking } from "../types/api";
import { useI18n } from "../i18n/I18nContext";
import { SkeletonBlocks } from "../components/SkeletonBlocks";

/**
 * Мои бронирования: список и отмена. Заглушка до реализации API.
 */
export function MyBookingsPage() {
  const { t, lang } = useI18n();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "past">("all");

  const loadBookings = () => {
    const params: { from_time?: string; to_time?: string } = {};
    if (dateFrom) params.from_time = new Date(`${dateFrom}T00:00:00`).toISOString();
    if (dateTo) params.to_time = new Date(`${dateTo}T23:59:59`).toISOString();

    setLoading(true);
    setError(null);
    bookingsApi
      .myBookings(params)
      .then(setBookings)
      .catch(() => {
        setBookings([]);
        setError(t("common", "error"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = new Date();
  const filteredBookings = bookings
    .filter((b) => {
      if (statusFilter === "all") return true;
      const isPast = new Date(b.end_time) < now;
      return statusFilter === "past" ? isPast : !isPast;
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(lang === "en" ? "en-US" : lang === "ky" ? "ky-KG" : "ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getDurationLabel = (start: string, end: string) => {
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours} ч ${minutes} мин`;
    if (hours > 0) return `${hours} ч`;
    return `${minutes} мин`;
  };

  const handleCancel = async (id: number) => {
    try {
      await bookingsApi.cancel(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch {
      setError(t("common", "error"));
    }
  };

  return (
    <div>
      {loading ? (
        <SkeletonBlocks count={2} className="h-24" />
      ) : (
        <>
      <h1 className="text-2xl font-semibold mb-4">{t("bookings", "title")}</h1>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <section className="mb-4 app-card p-3 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t("bookings", "fromDate")}</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="field-input"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t("bookings", "toDate")}</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="field-input"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t("bookings", "status")}</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "upcoming" | "past")}
            className="field-input"
          >
            <option value="all">{t("bookings", "all")}</option>
            <option value="upcoming">{t("bookings", "upcoming")}</option>
            <option value="past">{t("bookings", "past")}</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={loadBookings}
            className="btn-primary text-sm"
          >
            {t("bookings", "apply")}
          </button>
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setStatusFilter("all");
              bookingsApi
                .myBookings()
                .then(setBookings)
                .catch(() => {
                  setBookings([]);
                  setError(t("common", "error"));
                });
            }}
            className="btn-secondary text-sm"
          >
            {t("bookings", "reset")}
          </button>
        </div>
      </section>

      {filteredBookings.length === 0 ? (
        <EmptyStateCard title={t("bookings", "empty")} actionLabel={t("home", "openRooms")} actionTo="/" />
      ) : (
        <ul className="space-y-3">
          {filteredBookings.map((b) => {
            const isPast = new Date(b.end_time) < now;
            return (
            <li
              key={b.id}
              className="app-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3"
            >
              <div className="text-sm">
                <p className="font-medium text-gray-900">
                  {t("bookings", "room")}: {b.room_name?.trim() ? b.room_name : `#${b.room_id}`}
                </p>
                <p className={`status-badge mt-1 ${isPast ? "status-past" : "status-upcoming"}`}>
                  {isPast ? t("bookings", "past") : t("bookings", "upcoming")}
                </p>
                <p className="text-gray-700">{t("bookings", "start")}: {formatDateTime(b.start_time)}</p>
                <p className="text-gray-700">{t("bookings", "end")}: {formatDateTime(b.end_time)}</p>
                <p className="text-gray-700">
                  {t("bookings", "duration")}: {getDurationLabel(b.start_time, b.end_time)}
                </p>
                <Link to={`/rooms/${b.room_id}`} className="text-indigo-600 hover:underline text-sm inline-block mt-1">
                  {t("bookings", "goToRoom")}
                </Link>
                <Link to={`/my-bookings/${b.id}`} className="text-indigo-600 hover:underline text-sm inline-block mt-1 ml-3">
                  Открыть бронь
                </Link>
              </div>
              {isPast ? (
                <span className="text-xs text-gray-500">{t("bookings", "cannotCancel")}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleCancel(b.id)}
                  className="text-red-600 hover:underline text-sm"
                >
                  {t("bookings", "cancel")}
                </button>
              )}
            </li>
          )})}
        </ul>
      )}
        </>
      )}
    </div>
  );
}
