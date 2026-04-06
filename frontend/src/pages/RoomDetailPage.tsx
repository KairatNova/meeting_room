import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { DatesSetArg } from "@fullcalendar/core";
import { roomsApi } from "../api/rooms";
import { bookingsApi } from "../api/bookings";
import { useAuth } from "../context/AuthContext";
import { ApiError, mediaUrl } from "../api/client";
import { EmptyStateCard } from "../components/EmptyStateCard";
import { SkeletonBlocks } from "../components/SkeletonBlocks";
import { useFavoriteRooms } from "../hooks/useFavoriteRooms";
import { useRecentRooms } from "../hooks/useRecentRooms";
import type { Room, Booking, RoomReview } from "../types/api";
import { useI18n } from "../i18n/I18nContext";

/**
 * Детальная страница комнаты: галерея, бронирование, календарь, реальные отзывы.
 */
export function RoomDetailPage() {
  const { t, lang } = useI18n();
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<RoomReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [calendarRange, setCalendarRange] = useState<{ start: Date; end: Date } | null>(null);
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [guestsCount, setGuestsCount] = useState(1);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showBusySlots, setShowBusySlots] = useState(false);
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);
  const [reviewRating, setReviewRating] = useState(8);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const { isFavorite, toggleFavorite } = useFavoriteRooms();
  const { pushRecent } = useRecentRooms();

  const id = roomId ? parseInt(roomId, 10) : NaN;
  const isIdValid = !Number.isNaN(id) && id >= 1;

  const fetchRoom = useCallback(() => {
    if (!isIdValid) return Promise.resolve(null);
    return roomsApi.get(id).then(setRoom).catch(() => setRoom(null));
  }, [id, isIdValid]);

  const fetchReviews = useCallback(() => {
    if (!isIdValid) return Promise.resolve([]);
    setReviewsLoading(true);
    return roomsApi
      .listReviews(id)
      .then((list) => {
        setReviews(list);
        return list;
      })
      .catch(() => {
        setReviews([]);
        return [];
      })
      .finally(() => setReviewsLoading(false));
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
    Promise.all([fetchRoom(), fetchReviews()]).finally(() => setLoading(false));
  }, [fetchRoom, fetchReviews, isIdValid]);

  useEffect(() => {
    if (!isIdValid) return;
    if (calendarRange) fetchBookings();
  }, [isIdValid, calendarRange, fetchBookings]);

  useEffect(() => {
    setSelectedPhotoIdx(0);
  }, [room?.id]);

  useEffect(() => {
    if (!room) return;
    pushRecent(room.id);
  }, [room?.id]);

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setCalendarRange({ start: arg.start, end: arg.end });
  }, []);

  const calendarEvents = bookings.map((b) => ({
    id: String(b.id),
    title: t("roomDetail", "busySlots"),
    start: b.start_time,
    end: b.end_time,
    display: "block" as const,
  }));

  const busySlots = useMemo(
    () =>
      bookings
        .slice()
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .map((b) => ({
          id: b.id,
          start: new Date(b.start_time),
          end: new Date(b.end_time),
        })),
    [bookings]
  );

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);
    if (!room) {
      setSubmitError("Комната не найдена");
      return;
    }
    if (!user) {
      setSubmitError("Войдите в систему, чтобы забронировать");
      return;
    }
    if (!formDate || !formStartTime || !formEndTime) {
      setSubmitError("Укажите дату, время начала и окончания");
      return;
    }
    if (guestsCount < 1) {
      setSubmitError("Количество участников должно быть не меньше 1");
      return;
    }
    if (guestsCount > room.capacity) {
      setSubmitError(`Для этой комнаты максимум ${room.capacity} человек`);
      return;
    }
    const startDate = new Date(`${formDate}T${formStartTime}:00`);
    const endDate = new Date(`${formDate}T${formEndTime}:00`);
    if (endDate <= startDate) {
      setSubmitError("Время окончания должно быть позже начала");
      return;
    }
    const durationMinutes = (endDate.getTime() - startDate.getTime()) / 60000;
    if (durationMinutes < 30) {
      setSubmitError("Минимальная длительность бронирования — 30 минут");
      return;
    }
    if (durationMinutes > 360) {
      setSubmitError("Максимальная длительность бронирования — 6 часов");
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
      setFormDate("");
      setFormStartTime("");
      setFormEndTime("");
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

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setReviewError("Войдите, чтобы оставить отзыв");
      return;
    }
    if (!reviewComment.trim() || reviewComment.trim().length < 3) {
      setReviewError("Комментарий должен быть не короче 3 символов");
      return;
    }
    setReviewError(null);
    setReviewSaving(true);
    try {
      await roomsApi.createReview(id, { rating: reviewRating, comment: reviewComment.trim() });
      setReviewComment("");
      setReviewRating(8);
      fetchReviews();
    } catch (err) {
      setReviewError(err instanceof ApiError ? err.message : "Не удалось сохранить отзыв");
    } finally {
      setReviewSaving(false);
    }
  };

  if (loading) return <SkeletonBlocks count={2} className="h-36" />;
  if (!room)
    return (
      <EmptyStateCard title={t("common", "error")} actionLabel={t("home", "openRooms")} actionTo="/rooms" />
    );

  const photos = room.photos ?? [];
  const mainPhoto = photos[selectedPhotoIdx] ?? photos[0];

  return (
    <div className="space-y-6">
      <Link to="/rooms" className="text-indigo-600 hover:underline inline-block">
        ← {t("home", "openRooms")}
      </Link>

      <section className="app-card overflow-hidden">
        <div className="h-52 sm:h-60 md:h-72 bg-slate-100 flex items-center justify-center">
          {mainPhoto ? (
            <img src={mediaUrl(mainPhoto.url)} alt={room.name} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">{t("roomDetail", "noPhoto")}</div>
          )}
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{room.name}</h1>
              <p className="text-gray-600 mt-1">{room.description ?? t("home", "noDescription")}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-sm">
                {t("home", "capacityLabel")}: {room.capacity}
              </span>
              <button
                type="button"
                onClick={() => toggleFavorite(room.id)}
                className={isFavorite(room.id) ? "text-amber-500 text-xl" : "text-gray-300 hover:text-amber-500 text-xl"}
                aria-label={isFavorite(room.id) ? "Убрать комнату из избранного" : "Добавить комнату в избранное"}
                title={isFavorite(room.id) ? "Убрать из избранного" : "Добавить в избранное"}
              >
                ★
              </button>
            </div>
          </div>
          {room.amenities && (
            <div className="flex flex-wrap gap-2">
              {room.amenities.split(",").map((item, idx) => (
                <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                  {item.trim()}
                </span>
              ))}
            </div>
          )}
          <div className="text-sm text-slate-600">
            <span className="font-medium text-slate-700">{t("roomDetail", "location")}:</span>{" "}
            {[room.region, room.city, room.district, room.address].filter(Boolean).join(", ") || t("roomDetail", "noLocation")}
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pt-1">
              {photos.map((photo, idx) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setSelectedPhotoIdx(idx)}
                  className={`shrink-0 border rounded overflow-hidden ${
                    idx === selectedPhotoIdx ? "border-indigo-600" : "border-gray-200"
                  }`}
                >
                  <img src={mediaUrl(photo.url)} alt="" className="w-20 h-14 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="app-card p-4">
        <h2 className="text-lg font-semibold mb-3">{t("roomDetail", "booking")}</h2>
        {successMessage && <div className="mb-3 p-2 bg-green-50 text-green-800 rounded text-sm">{successMessage}</div>}
        {submitError && <div className="mb-3 p-2 bg-red-50 text-red-700 rounded text-sm">{submitError}</div>}
        <form onSubmit={handleSubmitBooking} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="field-label">{t("roomDetail", "date")}</label>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              required
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">{t("roomDetail", "timeStart")}</label>
            <input
              type="time"
              value={formStartTime}
              onChange={(e) => setFormStartTime(e.target.value)}
              required
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">{t("roomDetail", "timeEnd")}</label>
            <input
              type="time"
              value={formEndTime}
              onChange={(e) => setFormEndTime(e.target.value)}
              required
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">{t("roomDetail", "guests")}</label>
            <input
              type="number"
              min={1}
              max={room.capacity}
              value={guestsCount}
              onChange={(e) => setGuestsCount(parseInt(e.target.value, 10) || 1)}
              className="field-input"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting || !user}
              className="btn-primary w-full"
            >
              {submitting ? t("common", "loading") : t("roomDetail", "book")}
            </button>
          </div>
        </form>
        <p className="text-xs text-gray-500 mt-2">{t("roomDetail", "bookingRules")}</p>
        {!user && (
          <p className="mt-2 text-sm text-gray-600">
            <Link to="/login" className="text-indigo-600 hover:underline">
              {t("auth", "signIn")}
            </Link>
            , чтобы забронировать комнату.
          </p>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">{t("roomDetail", "availability")}</h2>
          <button
            type="button"
            onClick={() => setShowBusySlots((v) => !v)}
            className="text-sm text-indigo-600 hover:underline"
          >
            {showBusySlots ? t("roomDetail", "hideBusy") : t("roomDetail", "showBusy")}
          </button>
        </div>
        <div className="app-card p-2 overflow-x-auto">
          <FullCalendar
            key={roomId}
            plugins={[dayGridPlugin, timeGridPlugin]}
            initialView="timeGridDay"
            headerToolbar={{
              left: "prev,next",
              center: "title",
              right: "timeGridDay,timeGridWeek",
            }}
            buttonText={{ week: lang === "en" ? "Week" : lang === "ky" ? "Жума" : "Неделя", day: lang === "en" ? "Day" : lang === "ky" ? "Күн" : "День" }}
            locale={lang === "en" ? "en" : lang === "ky" ? "ky" : "ru"}
            events={calendarEvents}
            datesSet={handleDatesSet}
            contentHeight={320}
            expandRows={false}
            slotMinTime="08:00:00"
            slotMaxTime="21:00:00"
            slotDuration="01:00:00"
            slotLabelInterval="01:00:00"
            dayMaxEventRows={true}
            allDaySlot={false}
          />
        </div>
        {showBusySlots && (
          <div className="mt-3 bg-white border border-gray-200 rounded-lg p-3">
            <h3 className="text-sm font-semibold mb-2">{t("roomDetail", "busySlots")}</h3>
            {busySlots.length === 0 ? (
              <p className="text-sm text-gray-500">В выбранном диапазоне занятых слотов нет.</p>
            ) : (
              <ul className="space-y-1 text-sm text-gray-700">
                {busySlots.map((slot) => (
                  <li key={slot.id}>
                    {slot.start.toLocaleString(lang === "en" ? "en-US" : lang === "ky" ? "ky-KG" : "ru-RU")} - {slot.end.toLocaleString(lang === "en" ? "en-US" : lang === "ky" ? "ky-KG" : "ru-RU")}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("roomDetail", "reviews")}</h2>
        <section className="app-card p-4">
          <h3 className="font-medium mb-3">{t("roomDetail", "leaveReview")}</h3>
          {reviewError && <p className="mb-2 text-sm text-red-600">{reviewError}</p>}
          <form onSubmit={handleSubmitReview} className="space-y-3">
            <div className="max-w-[160px]">
              <label className="field-label">{t("roomDetail", "rating")}</label>
              <input
                type="number"
                min={1}
                max={10}
                value={reviewRating}
                onChange={(e) => setReviewRating(parseInt(e.target.value, 10) || 1)}
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">{t("roomDetail", "comment")}</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
                className="field-input"
                placeholder="Поделитесь впечатлением о комнате"
              />
            </div>
            <button
              type="submit"
              disabled={reviewSaving || !user}
              className="btn-primary"
            >
              {reviewSaving ? t("common", "loading") : t("roomDetail", "publishReview")}
            </button>
          </form>
          {!user && (
            <p className="mt-2 text-sm text-gray-600">
              <Link to="/login" className="text-indigo-600 hover:underline">
                {t("auth", "signIn")}
              </Link>
              , чтобы оставить отзыв.
            </p>
          )}
        </section>
        <div className="space-y-3">
          {reviewsLoading ? (
            <p className="text-sm text-gray-500">Загрузка отзывов...</p>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-gray-500">{t("roomDetail", "noReviews")}</p>
          ) : (
            reviews.map((review) => (
              <article key={review.id} className="app-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-900">{review.author_name}</p>
                  <span className="text-sm px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                    {review.rating.toFixed(1)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{review.comment}</p>
                <p className="text-xs text-gray-500">{new Date(review.created_at).toLocaleString(lang === "en" ? "en-US" : lang === "ky" ? "ky-KG" : "ru-RU")}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
