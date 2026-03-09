export type Lang = "ru" | "en";

type Dict = Record<string, string>;

type Namespaces = {
  common: Dict;
  nav: Dict;
  home: Dict;
  profile: Dict;
};

export const translations: Record<Lang, Namespaces> = {
  ru: {
    common: {
      loading: "Загрузка...",
      save: "Сохранить",
      cancel: "Отмена",
      error: "Ошибка",
      userNotFound: "Пользователь не найден",
    },
    nav: {
      rooms: "Комнаты",
      myBookings: "Мои бронирования",
      admin: "Админ",
      profile: "Профиль",
      login: "Вход",
      register: "Зарегистрироваться",
      logout: "Выход",
    },
    home: {
      title: "Найдите свободную переговорную для вашей команды",
      subtitle:
        "Забронируйте комнату на нужное время, увидьте занятость в календаре и управляйте своими бронированиями в пару кликов.",
      date: "Дата",
      timeStart: "Время начала",
      timeEnd: "Время окончания",
      people: "Количество человек",
      search: "Найти комнату",
      listTitle: "Быстрый доступ к списку комнат",
      listSubtitle:
        "Просматривайте все доступные переговорные, фильтруйте по вместимости и удобствам, а затем бронируйте нужное время.",
      openRooms: "Открыть список комнат",
      loginToSee: "Войти, чтобы увидеть свои брони",
    },
    profile: {
      title: "Профиль",
      fullName: "Полное имя",
      displayName: "Отображаемое имя",
      phone: "Номер телефона",
      birthDate: "Дата рождения",
      gender: "Пол",
      citizenship: "Гражданство",
      genderMale: "Мужской",
      genderFemale: "Женский",
      genderOther: "Другое",
      updated: "Профиль обновлён",
    },
  },
  en: {
    common: {
      loading: "Loading...",
      save: "Save",
      cancel: "Cancel",
      error: "Error",
      userNotFound: "User not found",
    },
    nav: {
      rooms: "Rooms",
      myBookings: "My bookings",
      admin: "Admin",
      profile: "Profile",
      login: "Sign in",
      register: "Sign up",
      logout: "Sign out",
    },
    home: {
      title: "Find a meeting room for your team",
      subtitle:
        "Book a room, see availability in the calendar and manage your bookings in a few clicks.",
      date: "Date",
      timeStart: "Start time",
      timeEnd: "End time",
      people: "Number of people",
      search: "Search rooms",
      listTitle: "Quick access to rooms list",
      listSubtitle:
        "Browse available meeting rooms, filter by capacity and amenities, then book the time you need.",
      openRooms: "Open rooms list",
      loginToSee: "Sign in to see your bookings",
    },
    profile: {
      title: "Profile",
      fullName: "Full name",
      displayName: "Display name",
      phone: "Phone number",
      birthDate: "Date of birth",
      gender: "Gender",
      citizenship: "Citizenship",
      genderMale: "Male",
      genderFemale: "Female",
      genderOther: "Other",
      updated: "Profile updated",
    },
  },
};

