import { useEffect, useState } from "react";
import { roomsApi } from "../api/rooms";
import { ApiError } from "../api/client";
import type { Room, RoomCreate } from "../types/api";

/**
 * Админ-панель: список комнат, добавление, редактирование, удаление.
 */
export function AdminPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RoomCreate>({ name: "", description: "", capacity: 2, amenities: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const loadRooms = () => {
    setLoading(true);
    roomsApi
      .list()
      .then(setRooms)
      .catch(() => setRooms([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleCreate = () => {
    setEditingId(null);
    setForm({ name: "", description: "", capacity: 2, amenities: "" });
    setSaveError(null);
  };

  const handleEdit = (room: Room) => {
    setEditingId(room.id);
    setForm({
      name: room.name,
      description: room.description ?? "",
      capacity: room.capacity,
      amenities: room.amenities ?? "",
    });
    setSaveError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    const name = form.name.trim();
    const description = (form.description ?? "").trim() || null;
    const amenities = (form.amenities ?? "").trim() || null;
    const capacity = form.capacity;
    try {
      if (editingId !== null) {
        await roomsApi.update(editingId, { name, description, capacity, amenities });
        setEditingId(null);
      } else {
        await roomsApi.create({ name, description, capacity, amenities });
      }
      setForm({ name: "", description: "", capacity: 2, amenities: "" });
      loadRooms();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (deleteConfirmId !== id) {
      setDeleteConfirmId(id);
      return;
    }
    setError(null);
    try {
      await roomsApi.delete(id);
      setDeleteConfirmId(null);
      loadRooms();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка удаления");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Админ-панель</h1>
      <p className="text-gray-600 text-sm">Управление переговорными комнатами.</p>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>
      )}

      <section className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-lg font-semibold mb-3">
          {editingId !== null ? "Редактировать комнату" : "Добавить комнату"}
        </h2>
        {saveError && (
          <div className="mb-3 p-2 bg-red-50 text-red-700 rounded text-sm">{saveError}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Вместимость</label>
            <input
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: parseInt(e.target.value, 10) || 1 }))}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Удобства</label>
            <input
              type="text"
              value={form.amenities ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))}
              placeholder="Проектор, доска, кондиционер"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Сохранение…" : editingId !== null ? "Сохранить" : "Добавить"}
            </button>
            {editingId !== null && (
              <button
                type="button"
                onClick={handleCreate}
                className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-50"
              >
                Отмена
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <h2 className="text-lg font-semibold p-4 border-b border-gray-200">Комнаты</h2>
        {loading ? (
          <p className="p-4 text-gray-500">Загрузка…</p>
        ) : rooms.length === 0 ? (
          <p className="p-4 text-gray-500">Комнат пока нет. Добавьте первую.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-700">Название</th>
                  <th className="text-left p-3 font-medium text-gray-700 hidden sm:table-cell">Описание</th>
                  <th className="text-left p-3 font-medium text-gray-700">Вместимость</th>
                  <th className="text-right p-3 font-medium text-gray-700">Действия</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="p-3 font-medium">{room.name}</td>
                    <td className="p-3 text-gray-600 hidden sm:table-cell max-w-[200px] truncate">
                      {room.description ?? "—"}
                    </td>
                    <td className="p-3">{room.capacity}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleEdit(room)}
                        className="text-indigo-600 hover:underline mr-3"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(room.id)}
                        className={
                          deleteConfirmId === room.id
                            ? "text-red-600 font-semibold hover:underline"
                            : "text-red-600 hover:underline"
                        }
                      >
                        {deleteConfirmId === room.id ? "Подтвердить удаление?" : "Удалить"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
