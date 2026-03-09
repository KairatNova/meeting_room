import { useEffect, useState } from "react";
import { bookingsApi } from "../api/bookings";
import type { Booking } from "../types/api";

/**
 * Мои бронирования: список и отмена. Заглушка до реализации API.
 */
export function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingsApi
      .myBookings()
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id: number) => {
    try {
      await bookingsApi.cancel(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch {
      // TODO: показать ошибку
    }
  };

  if (loading) return <p className="text-gray-500">Загрузка...</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Мои бронирования</h1>
      {bookings.length === 0 ? (
        <p className="text-gray-500">У вас пока нет бронирований</p>
      ) : (
        <ul className="space-y-3">
          {bookings.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between border border-gray-200 rounded p-3"
            >
              <span>
                Комната #{b.room_id}: {new Date(b.start_time).toLocaleString()} –{" "}
                {new Date(b.end_time).toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => handleCancel(b.id)}
                className="text-red-600 hover:underline text-sm"
              >
                Отменить
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
