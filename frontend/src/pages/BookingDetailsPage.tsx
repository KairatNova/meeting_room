import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { bookingsApi } from "../api/bookings";
import { ApiError } from "../api/client";
import { EmptyStateCard } from "../components/EmptyStateCard";
import { ProfileBookingsNav } from "../components/ProfileBookingsNav";
import { SkeletonBlocks } from "../components/SkeletonBlocks";
import type { Booking } from "../types/api";

export function BookingDetailsPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const id = bookingId ? Number.parseInt(bookingId, 10) : NaN;
  const isValidId = Number.isFinite(id) && id > 0;

  useEffect(() => {
    if (!isValidId) {
      setLoading(false);
      setError("Некорректный идентификатор бронирования.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    bookingsApi
      .getById(id)
      .then((data) => {
        if (!cancelled) setBooking(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Не удалось загрузить бронь.");
        setBooking(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isValidId]);

  const handleCancel = async () => {
    if (!booking) return;
    setCancelLoading(true);
    setError(null);
    try {
      await bookingsApi.cancel(booking.id);
      navigate("/my-bookings", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось отменить бронирование.");
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <ProfileBookingsNav active="bookings" />
      {loading ? (
        <SkeletonBlocks count={2} className="h-24" />
      ) : error || !booking ? (
        <EmptyStateCard
          title={error ?? "Бронирование не найдено"}
          actionLabel="К списку моих бронирований"
          actionTo="/my-bookings"
        />
      ) : (
        <section className="app-card p-4 space-y-3">
          <h1 className="text-xl font-semibold">Моя бронь #{booking.id}</h1>
          <p className="text-sm text-gray-600">
            Комната: <span className="font-medium text-gray-900">{booking.room_name || `#${booking.room_id}`}</span>
          </p>
          <p className="text-sm text-gray-600">
            Начало: <span className="font-medium text-gray-900">{new Date(booking.start_time).toLocaleString()}</span>
          </p>
          <p className="text-sm text-gray-600">
            Окончание: <span className="font-medium text-gray-900">{new Date(booking.end_time).toLocaleString()}</span>
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to={`/rooms/${booking.room_id}`} className="btn-secondary">
              Перейти к комнате
            </Link>
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelLoading}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-60"
            >
              {cancelLoading ? "Отмена..." : "Отменить бронь"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

