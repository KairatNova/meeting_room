# API подтверждения email: примеры

## 1. Регистрация — POST `/api/auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "full_name": "Иван Иванов"
}
```

**Response 200:**
```json
{
  "message": "На вашу почту отправлен код подтверждения. Введите его для активации аккаунта.",
  "email": "user@example.com"
}
```

**Ошибки:** 400 (email уже зарегистрирован), 503 (ошибка SMTP).

---

## 2. Подтверждение email — POST `/api/auth/verify-email`

**Request:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response 200:**
```json
{
  "message": "Email подтверждён. Теперь вы можете войти в систему."
}
```

**Ошибки:** 400 (неверный код / код истёк / email уже подтверждён), 404 (пользователь не найден).

---

## 3. Вход — POST `/api/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Ошибки:** 401 (неверный email/пароль), 403 (email не подтверждён — нужно ввести код).

---

## 4. Пример запросов с фронта (React + Axios)

```ts
import axios from "axios";

const api = axios.create({
  baseURL: "/api", // или полный URL бэкенда
  headers: { "Content-Type": "application/json" },
});

// Регистрация
const register = async (email: string, password: string, fullName: string) => {
  const { data } = await api.post("/auth/register", {
    email,
    password,
    full_name: fullName,
  });
  return data; // { message, email }
};

// Подтверждение кода
const verifyEmail = async (email: string, code: string) => {
  const { data } = await api.post("/auth/verify-email", { email, code });
  return data; // { message }
};

// Вход (после подтверждения)
const login = async (email: string, password: string) => {
  const { data } = await api.post("/auth/login", { email, password });
  return data; // { access_token, token_type }
};

// Дальше: сохранить access_token и подставлять в заголовок
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

Обработка ошибок (например, 403 при логине — «Подтвердите email»):

```ts
try {
  await login(email, password);
  navigate("/");
} catch (err: any) {
  if (err.response?.status === 403 && err.response?.data?.detail?.includes("Подтвердите email")) {
    navigate("/verify-email", { state: { email } });
  } else {
    setError(err.response?.data?.detail ?? "Ошибка входа");
  }
}
```
