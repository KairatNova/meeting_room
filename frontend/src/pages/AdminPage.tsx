import { useEffect, useState } from "react";
import { roomsApi } from "../api/rooms";
import { adminApi } from "../api/admin";
import { ApiError, mediaUrl } from "../api/client";
import type { Room, RoomCreate, AdminUserBrief } from "../types/api";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../context/AuthContext";

/**
 * Админ-панель: список комнат, добавление, редактирование, удаление, фотографии.
 */
export function AdminPage() {
  const { t } = useI18n();
  const { user: currentUser } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RoomCreate>({
    name: "",
    description: "",
    capacity: 2,
    amenities: "",
    region: "",
    city: "",
    district: "",
    address: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [photosToAdd, setPhotosToAdd] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [adminsOpen, setAdminsOpen] = useState(true);
  const [admins, setAdmins] = useState<AdminUserBrief[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPromoteError, setAdminPromoteError] = useState<string | null>(null);
  const [adminPromoteOk, setAdminPromoteOk] = useState<string | null>(null);
  const [adminPromoting, setAdminPromoting] = useState(false);
  const [adminDemoteConfirmId, setAdminDemoteConfirmId] = useState<number | null>(null);
  const [adminDemoteError, setAdminDemoteError] = useState<string | null>(null);
  const [adminDemoting, setAdminDemoting] = useState(false);

  const loadAdmins = () => {
    setAdminsLoading(true);
    adminApi
      .listAdmins()
      .then(setAdmins)
      .catch(() => setAdmins([]))
      .finally(() => setAdminsLoading(false));
  };

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
    loadAdmins();
  }, []);

  const handlePromoteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPromoteError(null);
    setAdminPromoteOk(null);
    const email = adminEmail.trim();
    if (!email) return;
    setAdminPromoting(true);
    try {
      const res = await adminApi.promoteUser(email);
      setAdminPromoteOk(res.message);
      setAdminEmail("");
      loadAdmins();
    } catch (err) {
      setAdminPromoteError(err instanceof ApiError ? err.message : t("common", "error"));
    } finally {
      setAdminPromoting(false);
    }
  };

  const handleDemoteAdmin = async (userId: number) => {
    if (adminDemoteConfirmId !== userId) {
      setAdminDemoteConfirmId(userId);
      setAdminDemoteError(null);
      return;
    }
    setAdminDemoteError(null);
    setAdminDemoting(true);
    try {
      await adminApi.demoteAdmin(userId);
      setAdminDemoteConfirmId(null);
      setAdminPromoteOk(null);
      loadAdmins();
    } catch (err) {
      setAdminDemoteError(err instanceof ApiError ? err.message : t("common", "error"));
      setAdminDemoteConfirmId(null);
    } finally {
      setAdminDemoting(false);
    }
  };

  const editingRoom = editingId !== null ? rooms.find((r) => r.id === editingId) : null;

  const handleCreate = () => {
    setEditingId(null);
    setForm({
      name: "",
      description: "",
      capacity: 2,
      amenities: "",
      region: "",
      city: "",
      district: "",
      address: "",
    });
    setPhotosToAdd([]);
    setSaveError(null);
    setPhotoError(null);
  };

  const handleEdit = (room: Room) => {
    setEditingId(room.id);
    setForm({
      name: room.name,
      description: room.description ?? "",
      capacity: room.capacity,
      amenities: room.amenities ?? "",
      region: room.region ?? "",
      city: room.city ?? "",
      district: room.district ?? "",
      address: room.address ?? "",
    });
    setPhotosToAdd([]);
    setSaveError(null);
    setPhotoError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setPhotoError(null);
    setSaving(true);
    const name = form.name.trim();
    const description = (form.description ?? "").trim() || null;
    const amenities = (form.amenities ?? "").trim() || null;
    const region = (form.region ?? "").trim() || null;
    const city = (form.city ?? "").trim() || null;
    const district = (form.district ?? "").trim() || null;
    const address = (form.address ?? "").trim() || null;
    const capacity = form.capacity;
    try {
      if (editingId !== null) {
        await roomsApi.update(editingId, {
          name,
          description,
          capacity,
          amenities,
          region,
          city,
          district,
          address,
        });
        if (photosToAdd.length > 0) {
          setUploadingPhotos(true);
          await roomsApi.uploadPhotos(editingId, photosToAdd);
          setPhotosToAdd([]);
          setUploadingPhotos(false);
        }
        setEditingId(null);
      } else {
        const room = await roomsApi.create({
          name,
          description,
          capacity,
          amenities,
          region,
          city,
          district,
          address,
        });
        if (photosToAdd.length > 0) {
          setUploadingPhotos(true);
          await roomsApi.uploadPhotos(room.id, photosToAdd);
          setPhotosToAdd([]);
          setUploadingPhotos(false);
        }
      }
      setForm({
        name: "",
        description: "",
        capacity: 2,
        amenities: "",
        region: "",
        city: "",
        district: "",
        address: "",
      });
      loadRooms();
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setSaveError("Admin access required");
      } else {
        setSaveError(err instanceof ApiError ? err.message : t("common", "error"));
      }
    } finally {
      setSaving(false);
      setUploadingPhotos(false);
    }
  };

  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setPhotoError(null);
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length !== files.length) {
      setPhotoError("Добавлены только файлы изображений (jpg, png, gif, webp).");
    }
    setPhotosToAdd((prev) => [...prev, ...list]);
    e.target.value = "";
  };

  const removePhotoToAdd = (index: number) => {
    setPhotosToAdd((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeletePhoto = async (roomId: number, photoId: number) => {
    setPhotoError(null);
    try {
      await roomsApi.deletePhoto(roomId, photoId);
      loadRooms();
    } catch (err) {
      setPhotoError(err instanceof ApiError ? err.message : t("common", "error"));
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
      setError(err instanceof ApiError ? err.message : t("common", "error"));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("admin", "title")}</h1>
      <p className="text-gray-600 text-sm">{t("admin", "subtitle")}</p>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>
      )}

      <section className="app-card overflow-hidden">
        <button
          type="button"
          onClick={() => setAdminsOpen((o) => !o)}
          className="w-full flex items-center justify-between p-4 text-left border-b border-gray-200 hover:bg-gray-50/80 transition-colors"
        >
          <span className="text-lg font-semibold">{t("admin", "adminsPanelTitle")}</span>
          <span className="text-gray-500 text-sm">{adminsOpen ? "▼" : "▶"}</span>
        </button>
        {adminsOpen && (
          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-600">{t("admin", "adminsPanelHint")}</p>
            <form onSubmit={handlePromoteAdmin} className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="flex-1 min-w-0">
                <label htmlFor="promote-admin-email" className="field-label">
                  {t("admin", "adminUserEmail")}
                </label>
                <input
                  id="promote-admin-email"
                  type="email"
                  autoComplete="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="field-input"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={adminPromoting}
                className="btn-primary shrink-0"
              >
                {adminPromoting ? t("common", "loading") : t("admin", "promoteAdmin")}
              </button>
            </form>
            {adminPromoteOk && (
              <div className="p-2 bg-green-50 text-green-800 rounded text-sm" role="status">
                {adminPromoteOk}
              </div>
            )}
            {adminPromoteError && (
              <div className="p-2 bg-red-50 text-red-700 rounded text-sm" role="alert">
                {adminPromoteError}
              </div>
            )}
            {adminDemoteError && (
              <div className="p-2 bg-red-50 text-red-700 rounded text-sm" role="alert">
                {adminDemoteError}
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t("admin", "currentAdmins")}</h3>
              {adminsLoading ? (
                <p className="text-sm text-gray-500">{t("common", "loading")}</p>
              ) : admins.length === 0 ? (
                <p className="text-sm text-gray-500">{t("admin", "noAdminsListed")}</p>
              ) : (
                <ul className="text-sm space-y-1 border border-gray-100 rounded-md divide-y divide-gray-100">
                  {admins.map((a) => (
                    <li
                      key={a.id}
                      className="px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-0.5">
                        <span className="font-medium text-gray-900 truncate">{a.email}</span>
                        <span className="text-gray-600 truncate">{a.full_name}</span>
                        {currentUser?.id === a.id && (
                          <span className="text-xs text-indigo-600 shrink-0">({t("admin", "you")})</span>
                        )}
                      </div>
                      {currentUser?.id !== a.id && (
                        <button
                          type="button"
                          disabled={adminDemoting}
                          onClick={() => handleDemoteAdmin(a.id)}
                          className={
                            adminDemoteConfirmId === a.id
                              ? "text-sm text-red-700 font-semibold hover:underline shrink-0"
                              : "text-sm text-red-600 hover:underline shrink-0"
                          }
                        >
                          {adminDemoteConfirmId === a.id
                            ? t("admin", "confirmRemoveAdmin")
                            : t("admin", "removeAdmin")}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="app-card p-4">
        <h2 className="text-lg font-semibold mb-3">
          {editingId !== null ? t("admin", "editRoom") : t("admin", "addRoom")}
        </h2>
        {saveError && (
          <div className="mb-3 p-2 bg-red-50 text-red-700 rounded text-sm">{saveError}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
            <label className="field-label">{t("admin", "roomName")}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="field-input"
            />
            </div>
            <div>
            <label className="field-label">{t("admin", "description")}</label>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="field-input"
            />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
            <label className="field-label">{t("admin", "capacity")}</label>
            <input
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: parseInt(e.target.value, 10) || 1 }))}
              className="field-input"
            />
            </div>
            <div>
            <label className="field-label">{t("admin", "amenities")}</label>
            <input
              type="text"
              value={form.amenities ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))}
              placeholder="Проектор, доска, кондиционер"
              className="field-input"
            />
            </div>
          </div>
          <div className="pt-1 border-t border-slate-200" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
            <label className="field-label">{t("admin", "region")}</label>
            <input
              type="text"
              value={form.region ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
              placeholder="Например, Чуйская область"
              className="field-input"
            />
            </div>
            <div>
            <label className="field-label">{t("admin", "city")}</label>
            <input
              type="text"
              value={form.city ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="Например, Бишкек"
              className="field-input"
            />
            </div>
            <div>
            <label className="field-label">{t("admin", "district")}</label>
            <input
              type="text"
              value={form.district ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
              placeholder="Например, Октябрьский"
              className="field-input"
            />
            </div>
            <div>
            <label className="field-label">{t("admin", "address")}</label>
            <input
              type="text"
              value={form.address ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Например, ул. Токтогула 100"
              className="field-input"
            />
            </div>
          </div>

          {/* Фотографии */}
          <div className="pt-1 border-t border-slate-200">
            <label className="field-label">{t("admin", "photos")}</label>
            {photoError && (
              <div className="mb-2 p-2 bg-red-50 text-red-700 rounded text-sm">{photoError}</div>
            )}
            {editingId !== null && (editingRoom?.photos?.length ?? 0) > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {editingRoom!.photos!.map((p) => (
                  <div key={p.id} className="relative group">
                    <img
                      src={mediaUrl(p.url)}
                      alt=""
                      className="w-20 h-20 object-cover rounded border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(editingId, p.id)}
                      disabled={uploadingPhotos}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium disabled:opacity-50"
                    >
                      {t("admin", "delete")}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                {editingId !== null
                  ? "Можно выбрать несколько файлов сразу или добавлять партиями — они загрузятся при нажатии «Сохранить»."
                  : "Выберите одно или несколько изображений — они загрузятся после создания комнаты."}
              </p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={handleAddPhotos}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-medium"
              />
              {photosToAdd.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {photosToAdd.map((file, i) => (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}-${i}`}
                      className="relative group"
                    >
                      <PendingPhotoThumb file={file} />
                      <button
                        type="button"
                        onClick={() => removePhotoToAdd(i)}
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-600 text-white text-xs leading-6 shadow opacity-90 hover:opacity-100"
                        aria-label="Убрать из списка"
                      >
                        ×
                      </button>
                      <p className="max-w-[88px] truncate text-[10px] text-gray-500 mt-0.5">{file.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || uploadingPhotos}
              className="btn-primary"
            >
              {saving ? t("common", "loading") : uploadingPhotos ? t("admin", "uploading") : editingId !== null ? t("admin", "save") : t("admin", "add")}
            </button>
            {editingId !== null && (
              <button
                type="button"
                onClick={handleCreate}
                className="btn-secondary"
              >
                {t("admin", "cancel")}
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="app-card overflow-hidden">
        <h2 className="text-lg font-semibold p-4 border-b border-gray-200">{t("admin", "rooms")}</h2>
        {loading ? (
          <p className="p-4 text-gray-500">{t("common", "loading")}</p>
        ) : rooms.length === 0 ? (
          <p className="p-4 text-gray-500">Комнат пока нет. Добавьте первую.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-700">{t("admin", "roomName")}</th>
                  <th className="text-left p-3 font-medium text-gray-700 hidden sm:table-cell">{t("admin", "description")}</th>
                  <th className="text-left p-3 font-medium text-gray-700 hidden lg:table-cell">{t("admin", "location")}</th>
                  <th className="text-left p-3 font-medium text-gray-700">{t("admin", "capacity")}</th>
                  <th className="text-right p-3 font-medium text-gray-700">{t("admin", "actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="p-3 font-medium">{room.name}</td>
                    <td className="p-3 text-gray-600 hidden sm:table-cell max-w-[200px] truncate">
                      {room.description ?? "—"}
                    </td>
                    <td className="p-3 text-gray-600 hidden lg:table-cell max-w-[260px] truncate">
                      {[room.region, room.city, room.district, room.address].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="p-3">{room.capacity}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleEdit(room)}
                        className="text-indigo-600 hover:underline mr-3"
                      >
                        {t("admin", "editRoom")}
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
                        {deleteConfirmId === room.id ? t("admin", "confirmDelete") : t("admin", "delete")}
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

/** Превью локального файла до загрузки на сервер. */
function PendingPhotoThumb({ file }: { file: File }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setSrc(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  if (!src) {
    return <div className="w-20 h-20 bg-gray-100 rounded border border-gray-200 animate-pulse" />;
  }
  return (
    <img src={src} alt="" className="w-20 h-20 object-cover rounded border border-gray-200" />
  );
}
