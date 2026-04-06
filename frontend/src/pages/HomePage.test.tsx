import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nContext";
import { HomePage } from "./HomePage";

const mockUser = { id: 1, email: "u@test.com", full_name: "User", is_admin: false };

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

const roomsListMock = vi.fn();
const bookingsListMock = vi.fn();
const myBookingsMock = vi.fn();

vi.mock("../api/rooms", () => ({
  roomsApi: {
    list: (...args: unknown[]) => roomsListMock(...args),
  },
}));

vi.mock("../api/bookings", () => ({
  bookingsApi: {
    list: (...args: unknown[]) => bookingsListMock(...args),
    myBookings: (...args: unknown[]) => myBookingsMock(...args),
  },
}));

describe("HomePage", () => {
  beforeEach(() => {
    roomsListMock.mockResolvedValue([]);
    bookingsListMock.mockResolvedValue([]);
    myBookingsMock.mockResolvedValue([]);
  });

  it("shows empty state when no rooms for filters", async () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <HomePage />
        </I18nProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("По выбранным фильтрам комнат не найдено.")).toBeInTheDocument();
    });
  });
});

