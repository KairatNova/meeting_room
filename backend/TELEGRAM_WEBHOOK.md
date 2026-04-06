# Регистрация Telegram Webhook

Чтобы бот присылал код подтверждения при нажатии Start, нужно один раз зарегистрировать webhook после каждого деплоя бэкенда.

## 1. Узнайте URL вашего бэкенда

Примеры:
- Railway: `https://ваш-сервис.up.railway.app`
- Локально с туннелем (ngrok): `https://xxxx.ngrok.io`

**Важно:** только **HTTPS**. Локальный `http://localhost` Telegram не принимает.

## 2. Установите webhook

Подставьте **токен бота** (из @BotFather) и **ваш домен** в команду и выполните в терминале:

```bash
curl "https://api.telegram.org/bot<ТОКЕН_БОТА>/setWebhook?url=https://<ВАШ_ДОМЕН>/api/telegram/webhook"
```

**Пример для Railway:**
```bash
curl "https://api.telegram.org/bot123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/setWebhook?url=https://meetingroom-production-xxxx.up.railway.app/api/telegram/webhook"
```

Успешный ответ:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

## 3. Проверьте, что webhook записан

```bash
curl "https://api.telegram.org/bot<ТОКЕН_БОТА>/getWebhookInfo"
```

В ответе должно быть: `"url":"https://ваш-домен/api/telegram/webhook"`.

## 4. Проверьте доступность URL

Откройте в браузере или выполните:

```bash
curl "https://<ВАШ_ДОМЕН>/api/telegram/webhook"
```

Должен вернуться JSON с `"ok":true` (это GET для проверки; Telegram шлёт POST на этот же URL).

## Если после деплоя webhook сбрасывается

Некоторые хостинги меняют URL при перезапуске. Тогда после каждого деплоя нужно снова выполнить команду из шага 2.

Можно добавить вызов `setWebhook` в скрипт запуска или в CI/CD после деплоя (токен хранить в секретах, не в коде).
