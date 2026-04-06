import { useEffect, useState } from "react";
import { profileApi } from "../api/profile";
import type { User, UserProfileUpdate } from "../types/api";
import { useI18n } from "../i18n/I18nContext";
import { ApiError } from "../api/client";
import { ProfileBookingsNav } from "../components/ProfileBookingsNav";
import { EmptyStateCard } from "../components/EmptyStateCard";
import { SkeletonBlocks } from "../components/SkeletonBlocks";

export function ProfilePage() {
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserProfileUpdate>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    profileApi
      .getMe()
      .then((data) => {
        setUser(data);
        setForm({
          full_name: data.full_name,
          display_name: data.display_name ?? undefined,
          phone: data.phone ?? undefined,
          birth_date: data.birth_date ?? undefined,
          gender: data.gender ?? undefined,
          citizenship: data.citizenship ?? undefined,
        });
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleChange =
    (field: keyof UserProfileUpdate) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value || undefined;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const updated = await profileApi.update(form);
      setUser(updated);
      setSuccess(t("profile", "updated"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common", "error"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl">
        <ProfileBookingsNav active="profile" />
        <SkeletonBlocks count={2} className="h-24" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl">
        <ProfileBookingsNav active="profile" />
        <EmptyStateCard title={t("common", "userNotFound")} />
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <ProfileBookingsNav active="profile" />
      <h1 className="text-2xl font-semibold mb-4">{t("profile", "title")}</h1>
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600 mb-1">Email</p>
        <p className="font-medium text-gray-900">{user.email}</p>
        <p className="text-sm text-gray-500 mt-2">{t("profile", "fullName")}</p>
        <p className="font-medium text-gray-900">{user.full_name || user.display_name || "—"}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-700 px-3 py-2 rounded text-sm">
            {success}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("profile", "fullName")}
            </label>
            <input
              type="text"
              value={form.full_name ?? ""}
              onChange={handleChange("full_name")}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("profile", "displayName")}
            </label>
            <input
              type="text"
              value={form.display_name ?? ""}
              onChange={handleChange("display_name")}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("profile", "phone")}
            </label>
            <input
              type="tel"
              value={form.phone ?? ""}
              onChange={handleChange("phone")}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("profile", "birthDate")}
            </label>
            <input
              type="date"
              value={form.birth_date ?? ""}
              onChange={handleChange("birth_date")}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("profile", "gender")}
            </label>
            <select
              value={form.gender ?? ""}
              onChange={handleChange("gender")}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
            >
              <option value="">{""}</option>
              <option value="male">{t("profile", "genderMale")}</option>
              <option value="female">{t("profile", "genderFemale")}</option>
              <option value="other">{t("profile", "genderOther")}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("profile", "citizenship")}
            </label>
            <input
              type="text"
              value={form.citizenship ?? ""}
              onChange={handleChange("citizenship")}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? t("common", "loading") : t("common", "save")}
          </button>
        </div>
      </form>
    </div>
  );
}

