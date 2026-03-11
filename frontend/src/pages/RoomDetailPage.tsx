import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { DatesSetArg } from "@fullcalendar/core";
import { roomsApi } from "../api/rooms";
import { bookingsApi } from "../api/bookings";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import type { Room, Booking } from "../types/api";

/**
 * Детальная страница комнаты: информация, календарь занятости, форма бронирования.
 */
export function RoomDetailPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarRange, setCalendarRange] = useState<{ start: Date; end: Date } | null>(null);
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const id = roomId ? parseInt(roomId, 10) : NaN;
  const isIdValid = !Number.isNaN(id) && id >= 1;

  const fetchRoom = useCallback(() => {
    if (!isIdValid) return Promise.resolve(null);
    return roomsApi.get(id).then(setRoom).catch(() => setRoom(null));
  }, [id, isIdValid]);

  const fetchBookings = useCallback(() => {
    if (!isIdValid) return Promise.resolve([]);
    const params: { room_id: number; from_time?: string; to_time?: string } = { room_id: id };
    if (calendarRange) {
      params.from_time = calendarRange.start.toISOString();
      params.to_time = calendarRange.end.toISOString();
    }
    return bookingsApi.list(params).then((list) => {
      setBookings(list);
      return list;
    });
  }, [id, isIdValid, calendarRange?.start?.toISOString(), calendarRange?.end?.toISOString()]);

  useEffect(() => {
    if (!isIdValid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchRoom().finally(() => setLoading(false));
  }, [fetchRoom, isIdValid]);

  useEffect(() => {
    if (!isIdValid) return;
    if (calendarRange) fetchBookings();
  }, [isIdValid, calendarRange, fetchBookings]);

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setCalendarRange({ start: arg.start, end: arg.end });
  }, []);

  const calendarEvents = bookings.map((b) => ({
    id: String(b.id),
    title: "Занято",
    start: b.start_time,
    end: b.end_time,
    display: "block" as const,
  }));

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);
    if (!user) {
      setSubmitError("Войдите в систему, чтобы забронировать");
      return;
    }
    if (!formStart || !formEnd) {
      setSubmitError("Укажите начало и конец");
      return;
    }
    const startDate = new Date(formStart);
    const endDate = new Date(formEnd);
    if (endDate <= startDate) {
      setSubmitError("Время окончания должно быть позже начала");
      return;
    }
    setSubmitting(true);
    try {
      await bookingsApi.create({
        room_id: id,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
      });
      setSuccessMessage("Бронирование создано");
      setFormStart("");
      setFormEnd("");
      fetchBookings();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setSubmitError("Выбранное время занято. Выберите другой слот.");
      } else {
        setSubmitError(err instanceof ApiError ? err.message : "Ошибка создания брони");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-gray-500">Загрузка...</p>;
  if (!room)
    return (
      <div>
        <p className="text-gray-500">Комната не найдена</p>
        <Link to="/rooms" className="text-indigo-600 hover:underline mt-2 inline-block">
          К списку комнат
        </Link>
      </div>
    );

  return (
    <div className="space-y-6">
      <Link to="/rooms" className="text-indigo-600 hover:underline inline-block">
        ← К списку комнат
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{room.name}</h1>
        <p className="text-gray-600 mt-2">{room.description ?? "—"}</p>
        <p className="text-gray-500 mt-1">Вместимость: {room.capacity}</p>
        {room.amenities && (
          <p className="text-sm text-gray-500 mt-1">Удобства: {room.amenities}</p>
        )}
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-2">Доступность</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-2 overflow-x-auto">
  <FullCalendar
    key={roomId}
    plugins={[dayGridPlugin, timeGridPlugin]}
    initialView="timeGridWeek"
    headerToolbar={{
      left: "prev,next",
      center: "title",
      right: "timeGridDay,timeGridWeek,dayGridMonth",
    }}
    buttonText={{
      today: "Сегодня",
      month: "Месяц",
      week: "Неделя",
      day: "День",
    }}
    locale="ru"
    events={calendarEvents}
    datesSet={handleDatesSet}
    contentHeight={520}
    expandRows={false}
    slotMinTime="08:00:00"
    slotMaxTime="21:00:00"
    slotDuration="01:00:00"
    slotLabelInterval="01:00:00"
    dayMaxEventRows={true}
    allDaySlot={false}
  />
</div>
      </section>

      {user && (
        <section className="bg-white rounded-lg border border-gray-200 p-4 max-w-md">
          <h2 className="text-lg font-semibold mb-3">Забронировать</h2>
          {successMessage && (
            <div className="mb-3 p-2 bg-green-50 text-green-800 rounded text-sm">{successMessage}</div>
          )}
          {submitError && (
            <div className="mb-3 p-2 bg-red-50 text-red-700 rounded text-sm">{submitError}</div>
          )}
          <form onSubmit={handleSubmitBooking} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Начало</label>
              <input
                type="datetime-local"
                value={formStart}
                onChange={(e) => setFormStart(e.target.value)}
                required
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Окончание</label>
              <input
                type="datetime-local"
                value={formEnd}
                onChange={(e) => setFormEnd(e.target.value)}
                required
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Создание…" : "Забронировать"}
            </button>
          </form>
        </section>
      )}

      {!user && (
        <p className="text-gray-600 text-sm">
          <Link to="/login" className="text-indigo-600 hover:underline">Войдите</Link>, чтобы забронировать комнату.
        </p>
      )}
    </div>
  );
}
